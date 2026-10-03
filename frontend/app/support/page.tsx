'use client'

import { Suspense, useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  CalendarCheck,
  CheckCircle,
  Gift,
  Loader2,
  Megaphone,
  Phone,
  Sparkles,
  Users,
  Video,
  XCircle,
} from 'lucide-react'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { RewardTierCatalogCard } from '@/app/support/RewardTierCatalogCard'
import Swal from 'sweetalert2'
import {
  subscriptionApi,
  streamAlertApi,
  creatorRewardApi,
  type PublicCreatorReward,
  type SupportCatalogResponse,
  type SupportCatalogMembershipItem,
  type SupportCatalogShoutoutItem,
  type SupportCatalogRewardItem,
  RegisterSubscriptionDto,
  type StreamAlertLimits,
  type StreamAlertPlatform,
} from '@/lib/api'
import { formatApiErrorMessage } from '@/lib/api-origin'
import { fanAuthApi, fanPortalApi, getFanToken } from '@/lib/fan-auth'
import { toCompactTikTokClipRef } from '@/lib/tiktok-clip'
import { CheckoutCountryField } from '@/components/support/CheckoutCountryField'
import {
  isKenyaCheckout,
  readStoredCheckoutCountry,
  writeStoredCheckoutCountry,
  type SupportCountryCode,
} from '@/lib/support-countries'
import {
  formatSupportPrice,
  formatSupportPriceHint,
  kesToUsd,
  usdToKes,
} from '@/lib/fx'

function checkoutPaymentId(res: unknown): string | null {
  const r = res as { payment?: { id?: string }; id?: string }
  return r.payment?.id || r.id || null
}

const DEFAULT_STREAM_LIMITS: StreamAlertLimits = {
  minKes: 10,
  minKesWithVideo: 50,
  maxKes: 500_000,
}

const DEFAULT_MEMBERSHIP_DESC =
  'Member streams and replays, tutorials, plus WhatsApp access (invite after payment).'
const DEFAULT_SHOUTOUT_DESC =
  'One-time payment (not a subscription). A TikTok clip URL requires the higher minimum amount shown at checkout.'

/** When /subscriptions/support-catalog fails or returns nothing — always show membership + shoutout + active rewards. */
async function loadFallbackSupportCatalog(
  creatorSlug?: string,
): Promise<SupportCatalogResponse> {
  const [priceRes, limRes, rewards] = await Promise.all([
    subscriptionApi.getMonthlyPrice(creatorSlug).catch(() => ({ monthlyPrice: 1 })),
    streamAlertApi.getLimits(creatorSlug).catch(() => DEFAULT_STREAM_LIMITS),
    creatorRewardApi
      .list(creatorSlug)
      .catch(() => [] as PublicCreatorReward[]),
  ])
  const monthlyPriceKes = Math.max(1, Math.round(Number(priceRes.monthlyPrice) || 1))
  const limits = limRes
  const rewardItems = rewards.map((r) => ({
    kind: 'reward' as const,
    id: r.id,
    name: r.name,
    description: r.description,
    amountKes: r.amountKes,
    alertBannerLabel: r.alertBannerLabel,
    allowSupporterMessage: r.allowSupporterMessage,
    allowVideoClip: r.allowVideoClip,
    maxMessageLength: r.maxMessageLength,
    accentColor: r.accentColor ?? null,
  }))
  return {
    items: [
      {
        kind: 'membership',
        id: 'membership',
        title: 'Member subscription',
        description: DEFAULT_MEMBERSHIP_DESC,
        monthlyPriceKes,
      },
      {
        kind: 'shoutout',
        id: 'shoutout',
        title: 'Live shoutout',
        description: DEFAULT_SHOUTOUT_DESC,
        limits,
      },
      ...rewardItems,
    ],
  }
}

const subscriptionSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  tiktokUsername: z.string().min(1, 'Username is required'),
  mpesaMobile: z.string().optional(),
  whatsappNumber: z.string().optional(),
  email: z.string().optional(),
  months: z.number().min(1).max(12),
  monthlyPrice: z.number().optional(),
})

type SubscriptionFormData = z.infer<typeof subscriptionSchema>

const streamPlatformSchema = z.enum([
  'tiktok',
  'youtube',
  'facebook',
  'x',
  'twitch',
  'other',
])

const streamAlertSchema = z
  .object({
    displayHandle: z.string().min(1, 'Handle is required').max(64),
    mpesaMobile: z.string().optional(),
    email: z.string().optional(),
    platform: streamPlatformSchema,
    amount: z
      .number({ invalid_type_error: 'Enter a valid amount' })
      .min(0.01, 'Enter a valid amount')
      .max(10_000_000, 'Amount is too large'),
    message: z
      .string()
      .max(100, 'Message must be 100 characters or less')
      .optional(),
    videoUrl: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    const raw = data.videoUrl?.trim()
    if (!raw) return
    let u: URL
    try {
      u = new URL(raw.includes('://') ? raw : `https://${raw}`)
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid video URL',
        path: ['videoUrl'],
      })
      return
    }
    if (u.protocol !== 'https:') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Video link must use https',
        path: ['videoUrl'],
      })
      return
    }
    const h = u.hostname.toLowerCase()
    const allowed =
      h === 'tiktok.com' ||
      h === 'www.tiktok.com' ||
      h === 'm.tiktok.com' ||
      h === 'vm.tiktok.com' ||
      h === 'vt.tiktok.com' ||
      h.endsWith('.tiktok.com')
    if (!allowed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Only TikTok video links are allowed',
        path: ['videoUrl'],
      })
    }
  })

type StreamAlertFormData = z.infer<typeof streamAlertSchema>


const STREAM_PLATFORM_OPTIONS: { value: StreamAlertPlatform; label: string }[] = [
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'x', label: 'X (Twitter)' },
  { value: 'twitch', label: 'Twitch' },
  { value: 'other', label: 'Other' },
]

function SupportPageInner() {
  const searchParams = useSearchParams()
  const creatorSlugRaw = searchParams.get('creatorSlug') || ''
  const creatorSlug = creatorSlugRaw.trim().toLowerCase() || undefined
  const [monthlyPrice, setMonthlyPrice] = useState<number>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<
    'idle' | 'pending' | 'checking' | 'success' | 'failed'
  >('idle')
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [membershipPayMethod, setMembershipPayMethod] = useState<
    'mpesa' | 'paypal' | 'paystack'
  >('mpesa')
  const [streamPayMethod, setStreamPayMethod] = useState<'mpesa' | 'paystack'>('mpesa')
  const [membershipCountry, setMembershipCountry] = useState<SupportCountryCode>('KE')
  const [shoutoutCountry, setShoutoutCountry] = useState<SupportCountryCode>('KE')
  const [rewardCountries, setRewardCountries] = useState<Record<string, SupportCountryCode>>({})
  const membershipKenya = isKenyaCheckout(membershipCountry)
  const shoutKenya = isKenyaCheckout(shoutoutCountry)
  const countryForReward = (id: string): SupportCountryCode =>
    rewardCountries[id] ?? 'KE'

  const [streamSubmitting, setStreamSubmitting] = useState(false)
  const [streamPaymentStatus, setStreamPaymentStatus] = useState<
    'idle' | 'pending' | 'checking' | 'success' | 'failed'
  >('idle')
  const [streamPaymentId, setStreamPaymentId] = useState<string | null>(null)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [streamLimits, setStreamLimits] =
    useState<StreamAlertLimits>(DEFAULT_STREAM_LIMITS)

  const [catalog, setCatalog] = useState<SupportCatalogResponse | null>(null)
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [tierExpandedId, setTierExpandedId] = useState<string | null>(null)
  const [tierForm, setTierForm] = useState({
    displayName: '',
    mpesaMobile: '',
    email: '',
    paymentMethod: 'mpesa' as 'mpesa' | 'paystack',
    platform: 'tiktok' as StreamAlertPlatform,
    message: '',
    videoUrl: '',
  })
  const [tierSubmitting, setTierSubmitting] = useState(false)
  const [tierPaymentStatus, setTierPaymentStatus] = useState<
    'idle' | 'pending' | 'checking' | 'success' | 'failed'
  >('idle')
  const [tierError, setTierError] = useState<string | null>(null)
  const [fanPrefill, setFanPrefill] = useState<{
    name: string
    handle: string
    phone: string
    email: string
  } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    setValue,
  } = useForm<SubscriptionFormData>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      months: 1,
      monthlyPrice: 1,
      email: '',
      mpesaMobile: '',
      whatsappNumber: '',
    },
  })

  const {
    register: registerStream,
    handleSubmit: handleStreamSubmit,
    formState: { errors: streamErrors },
    reset: resetStream,
    watch: watchStream,
    setValue: setStreamValue,
  } = useForm<StreamAlertFormData>({
    resolver: zodResolver(streamAlertSchema),
    defaultValues: {
      platform: 'tiktok',
      message: '',
      videoUrl: '',
      amount: 10,
      email: '',
      mpesaMobile: '',
    },
  })

  const streamEnteredAmount = watchStream('amount')
  const streamVideoUrlWatch = watchStream('videoUrl')
  const streamWantsVideo = !!streamVideoUrlWatch?.trim()
  const streamAmountMin = streamWantsVideo
    ? streamLimits.minKesWithVideo
    : streamLimits.minKes
  const shoutoutKes = shoutKenya
    ? Number(streamEnteredAmount)
    : usdToKes(Number(streamEnteredAmount))
  const streamMinDisplay = shoutKenya ? streamAmountMin : kesToUsd(streamAmountMin)
  const streamMaxDisplay = shoutKenya
    ? streamLimits.maxKes
    : kesToUsd(streamLimits.maxKes)

  const months = watch('months')
  const totalAmount = months * monthlyPrice

  useEffect(() => {
    setMembershipCountry(readStoredCheckoutCountry('membership'))
    setShoutoutCountry(readStoredCheckoutCountry('shoutout'))
  }, [])

  useEffect(() => {
    writeStoredCheckoutCountry(membershipCountry, 'membership')
    if (!membershipKenya && membershipPayMethod === 'mpesa') {
      setMembershipPayMethod('paystack')
    }
  }, [membershipCountry, membershipKenya])

  useEffect(() => {
    writeStoredCheckoutCountry(shoutoutCountry, 'shoutout')
    setStreamValue(
      'amount',
      shoutKenya ? Math.max(1, streamLimits.minKes) : Math.max(1, kesToUsd(streamLimits.minKes)),
    )
    if (!shoutKenya) setStreamPayMethod('paystack')
  }, [shoutoutCountry, shoutKenya])

  const paypalCancelFlag = searchParams.get('paypal_cancel')
  useEffect(() => {
    if (!getFanToken()) return
    let cancelled = false
    void fanAuthApi
      .me()
      .then((me) => {
        if (cancelled) return
        const phone = (me.phone || '').trim()
        const name = (me.name || '').trim()
        const handle = (me.tiktokUsername || name || '').trim()
        const email = (me.email || '').trim()
        setFanPrefill({ name, handle, phone, email })
        if (phone) {
          setValue('mpesaMobile', phone)
          setValue('whatsappNumber', phone)
          setStreamValue('mpesaMobile', phone)
          setTierForm((t) => ({ ...t, mpesaMobile: phone }))
        }
        if (email) {
          setValue('email', email)
          setStreamValue('email', email)
          setTierForm((t) => ({ ...t, email }))
        }
        if (name) setValue('name', name)
        if (handle) {
          setValue('tiktokUsername', handle)
          setStreamValue('displayHandle', handle)
          setTierForm((t) => ({ ...t, displayName: handle, ...(phone ? { mpesaMobile: phone } : {}) }))
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [setValue, setStreamValue])
  useEffect(() => {
    if (paypalCancelFlag !== '1') return
    void Swal.fire({
      icon: 'info',
      title: 'PayPal checkout cancelled',
      text: 'No charge was made. You can try again or choose M-Pesa or card.',
      confirmButtonColor: '#9333ea',
    })
    const url = new URL(window.location.href)
    url.searchParams.delete('paypal_cancel')
    window.history.replaceState({}, '', url.pathname + url.search + url.hash)
  }, [paypalCancelFlag])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const applyCatalog = (c: SupportCatalogResponse) => {
        if (cancelled) return
        setCatalog(c)
        const sh = c.items.find((i) => i.kind === 'shoutout')
        if (sh) {
          setStreamLimits(sh.limits)
        } else {
          void streamAlertApi
            .getLimits()
            .then((lim) => {
              if (!cancelled) setStreamLimits(lim)
            })
            .catch(() => {})
        }
        const mem = c.items.find((i) => i.kind === 'membership')
        if (mem) {
          const price = mem.monthlyPriceKes
          setMonthlyPrice(price)
          reset({
            months: 1,
            monthlyPrice: price,
            ...(fanPrefill?.name ? { name: fanPrefill.name } : {}),
            ...(fanPrefill?.handle ? { tiktokUsername: fanPrefill.handle } : {}),
            ...(fanPrefill?.phone
              ? { mpesaMobile: fanPrefill.phone, whatsappNumber: fanPrefill.phone }
              : {}),
          })
        } else {
          void subscriptionApi
            .getMonthlyPrice()
            .then((response) => {
              if (cancelled) return
              const price = response.monthlyPrice || 1
              setMonthlyPrice(price)
              reset({
                months: 1,
                monthlyPrice: price,
                ...(fanPrefill?.name ? { name: fanPrefill.name } : {}),
                ...(fanPrefill?.handle ? { tiktokUsername: fanPrefill.handle } : {}),
                ...(fanPrefill?.phone
                  ? { mpesaMobile: fanPrefill.phone, whatsappNumber: fanPrefill.phone }
                  : {}),
              })
            })
            .catch(() => {})
        }
      }

      try {
        const c = await subscriptionApi.getSupportCatalog(creatorSlug)
        if (cancelled) return
        if (!c.items?.length) {
          const fb = await loadFallbackSupportCatalog(creatorSlug)
          applyCatalog(fb)
        } else {
          applyCatalog(c)
        }
      } catch (e) {
        console.error('Support catalog load failed, using fallback:', e)
        if (!cancelled) {
          try {
            const fb = await loadFallbackSupportCatalog(creatorSlug)
            applyCatalog(fb)
          } catch (e2) {
            console.error('Fallback catalog failed:', e2)
          }
        }
      } finally {
        if (!cancelled) setCatalogLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [creatorSlug, reset])

  const pollPaymentStatus = async (id: string) => {
    const maxAttempts = 30
    let attempts = 0

    const interval = setInterval(async () => {
      attempts++

      try {
        const payment = await subscriptionApi.checkPaymentStatus(id)
        const status = payment.status?.toLowerCase() || payment.status

        if (status === 'completed' || status === 'COMPLETED') {
          clearInterval(interval)
          setPaymentStatus('success')
          setIsSubmitting(false)

          Swal.fire({
            icon: 'success',
            title: 'Payment completed',
            text: 'Your subscription is active. Redirecting…',
            confirmButtonColor: '#10b981',
            confirmButtonText: 'Continue',
            timer: 2000,
            timerProgressBar: true,
          }).then(() => {
            window.location.href = `/success?paymentId=${id}`
          })
        } else if (status === 'failed' || status === 'FAILED') {
          clearInterval(interval)
          setPaymentStatus('failed')
          setError('Payment was cancelled or failed. Please try again.')
          setIsSubmitting(false)

          Swal.fire({
            icon: 'error',
            title: 'Payment Failed',
            text: 'Payment was cancelled or failed. Please try again.',
            confirmButtonColor: '#dc2626',
            confirmButtonText: 'Try Again',
          })
        } else if (attempts >= maxAttempts) {
          clearInterval(interval)
          setPaymentStatus('pending')
          setIsSubmitting(false)
          setError('Payment is still pending. Please check your phone and complete the payment.')

          Swal.fire({
            icon: 'warning',
            title: 'Payment Pending',
            text: 'Payment is still pending. Please check your phone and complete the payment.',
            confirmButtonColor: '#f59e0b',
            confirmButtonText: 'OK',
            footer: 'You can check the payment status later',
          })
        }
      } catch (err) {
        console.error('Error checking payment status:', err)
        if (attempts >= maxAttempts) {
          clearInterval(interval)
          setIsSubmitting(false)
        }
      }
    }, 10000)
  }

  const pollStreamPaymentStatus = async (id: string) => {
    const maxAttempts = 30
    let attempts = 0

    const interval = setInterval(async () => {
      attempts++

      try {
        const payment = await subscriptionApi.checkPaymentStatus(id)
        const status = payment.status?.toLowerCase() || payment.status

        if (status === 'completed' || status === 'COMPLETED') {
          clearInterval(interval)
          setStreamPaymentStatus('success')
          setStreamSubmitting(false)

          Swal.fire({
            icon: 'success',
            title: 'Session shout paid',
            text: 'The creator will play your shout during the next live stream.',
            confirmButtonColor: '#06b6d4',
            timer: 4000,
            timerProgressBar: true,
          })
          resetStream({ platform: 'tiktok', message: '', amount: 10 })
        } else if (status === 'failed' || status === 'FAILED') {
          clearInterval(interval)
          setStreamPaymentStatus('failed')
          setStreamError('Payment was cancelled or failed.')
          setStreamSubmitting(false)

          Swal.fire({
            icon: 'error',
            title: 'Payment failed',
            text: 'Payment was cancelled or failed. Try again.',
            confirmButtonColor: '#dc2626',
          })
        } else if (attempts >= maxAttempts) {
          clearInterval(interval)
          setStreamPaymentStatus('pending')
          setStreamSubmitting(false)
          setStreamError('Still pending — complete payment on your phone if prompted.')

          Swal.fire({
            icon: 'warning',
            title: 'Still pending',
            text: 'Check your phone for the M-Pesa prompt.',
            confirmButtonColor: '#f59e0b',
          })
        }
      } catch (err) {
        console.error('Stream payment status:', err)
        if (attempts >= maxAttempts) {
          clearInterval(interval)
          setStreamSubmitting(false)
        }
      }
    }, 10000)
  }

  const pollTierPaymentStatus = async (id: string) => {
    const maxAttempts = 30
    let attempts = 0

    const interval = setInterval(async () => {
      attempts++

      try {
        const payment = await subscriptionApi.checkPaymentStatus(id)
        const status = payment.status?.toLowerCase() || payment.status

        if (status === 'completed' || status === 'COMPLETED') {
          clearInterval(interval)
          setTierPaymentStatus('idle')
          setTierSubmitting(false)

          Swal.fire({
            icon: 'success',
            title: 'Payment completed',
            text: 'Your package is confirmed. The creator will follow up if the tier includes a live shout.',
            confirmButtonColor: '#d97706',
            timer: 4000,
            timerProgressBar: true,
          })
          setTierExpandedId(null)
          setTierForm({
            displayName: '',
            mpesaMobile: '',
            email: fanPrefill?.email || '',
            paymentMethod: 'mpesa',
            platform: 'tiktok',
            message: '',
            videoUrl: '',
          })
        } else if (status === 'failed' || status === 'FAILED') {
          clearInterval(interval)
          setTierPaymentStatus('failed')
          setTierError('Payment was cancelled or failed.')
          setTierSubmitting(false)

          Swal.fire({
            icon: 'error',
            title: 'Payment failed',
            text: 'Payment was cancelled or failed. Try again.',
            confirmButtonColor: '#dc2626',
          })
        } else if (attempts >= maxAttempts) {
          clearInterval(interval)
          setTierPaymentStatus('pending')
          setTierSubmitting(false)
          setTierError('Still pending — complete payment on your phone if prompted.')

          Swal.fire({
            icon: 'warning',
            title: 'Still pending',
            text: 'Check your phone for the M-Pesa prompt.',
            confirmButtonColor: '#f59e0b',
          })
        }
      } catch (err) {
        console.error('Reward tier payment status:', err)
        if (attempts >= maxAttempts) {
          clearInterval(interval)
          setTierSubmitting(false)
        }
      }
    }, 10000)
  }

  const onTierCheckout = async (reward: SupportCatalogRewardItem) => {
    const displayName = tierForm.displayName.trim().replace(/^@+/, '')
    if (!displayName) {
      await Swal.fire({
        icon: 'error',
        title: 'Name required',
        text: 'Enter the name or handle to show on stream.',
        confirmButtonColor: '#dc2626',
      })
      return
    }
    if (tierForm.paymentMethod === 'paystack') {
      const email = (tierForm.email || fanPrefill?.email || '').trim()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        await Swal.fire({
          icon: 'error',
          title: 'Email required',
          text: 'Paystack needs an email for card and international checkout.',
          confirmButtonColor: '#dc2626',
        })
        return
      }
    } else if (!/^(254|0)[0-9]{9}$/.test(tierForm.mpesaMobile.trim())) {
      await Swal.fire({
        icon: 'error',
        title: 'Invalid M-Pesa number',
        text: 'Use 254XXXXXXXXX or 0XXXXXXXXX.',
        confirmButtonColor: '#dc2626',
      })
      return
    }

    const videoTrim = reward.allowVideoClip ? tierForm.videoUrl.trim() : ''
    let videoNormalized: string | undefined
    if (videoTrim) {
      if (reward.amountKes < streamLimits.minKesWithVideo) {
        await Swal.fire({
          icon: 'error',
          title: 'Clip not allowed for this tier',
          text: `This tier is ${formatSupportPrice(reward.amountKes, isKenyaCheckout(countryForReward(reward.id)))}; with a clip the price must be at least ${formatSupportPrice(streamLimits.minKesWithVideo, isKenyaCheckout(countryForReward(reward.id)))}.`,
          confirmButtonColor: '#dc2626',
        })
        return
      }
      const norm = toCompactTikTokClipRef(videoTrim)
      if (!norm) {
        await Swal.fire({
          icon: 'error',
          title: 'Invalid clip URL',
          text: 'Only https TikTok video links are allowed.',
          confirmButtonColor: '#dc2626',
        })
        return
      }
      videoNormalized = norm
    }

    const messageTrim = reward.allowSupporterMessage ? tierForm.message.trim() : ''
    const maxLen = Math.min(500, Math.max(0, reward.maxMessageLength))

    setTierSubmitting(true)
    setTierError(null)
    setTierPaymentStatus('pending')

    try {
      const paystackPayload =
        tierForm.paymentMethod === 'paystack'
          ? {
              paymentMethod: 'paystack' as const,
              email: (tierForm.email || fanPrefill?.email || '').trim(),
            }
          : {}
      const fanLoggedIn = Boolean(getFanToken())
      const res = fanLoggedIn
        ? await fanPortalApi.checkoutReward(reward.id, {
            displayName,
            mpesaMobile: tierForm.mpesaMobile.trim() || undefined,
            platform: tierForm.platform,
            ...(messageTrim ? { message: messageTrim.slice(0, maxLen) } : {}),
            ...(videoNormalized ? { videoUrl: videoNormalized } : {}),
            ...paystackPayload,
          })
        : await creatorRewardApi.checkout(reward.id, {
            displayName,
            mpesaMobile: tierForm.mpesaMobile.trim() || undefined,
            platform: tierForm.platform,
            ...(messageTrim ? { message: messageTrim.slice(0, maxLen) } : {}),
            ...(videoNormalized ? { videoUrl: videoNormalized } : {}),
            ...paystackPayload,
          })

      const approvalUrl = (res as { approvalUrl?: string }).approvalUrl
      if (approvalUrl) {
        window.location.assign(approvalUrl)
        return
      }

      const pid = checkoutPaymentId(res)
      if (!pid) throw new Error('No payment id returned')
      setTierPaymentStatus('checking')

      Swal.fire({
        icon: 'info',
        title: 'M-Pesa prompt sent',
        text: 'Complete the payment on your phone when prompted.',
        confirmButtonColor: '#d97706',
        confirmButtonText: 'OK',
        timer: 5000,
        timerProgressBar: true,
      })

      void pollTierPaymentStatus(pid)
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Could not start payment. Check your number and try again.'
      setTierError(errorMessage)
      setTierPaymentStatus('failed')
      setTierSubmitting(false)

      Swal.fire({
        icon: 'error',
        title: 'Could not start',
        text: errorMessage,
        confirmButtonColor: '#dc2626',
      })
    }
  }

  const onSubmit = async (data: SubscriptionFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      if (membershipPayMethod === 'mpesa') {
        if (!/^(254|0)[0-9]{9}$/.test((data.mpesaMobile || '').trim())) {
          await Swal.fire({
            icon: 'error',
            title: 'Invalid M-Pesa number',
            text: 'Use 254XXXXXXXXX or 0XXXXXXXXX.',
            confirmButtonColor: '#dc2626',
          })
          setIsSubmitting(false)
          return
        }
      } else if (!getFanToken()) {
        const email = (data.email || '').trim()
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          await Swal.fire({
            icon: 'error',
            title: 'Email required',
            text: 'Paystack needs an email for card and international checkout.',
            confirmButtonColor: '#dc2626',
          })
          setIsSubmitting(false)
          return
        }
      }

      const fanLoggedIn = Boolean(getFanToken() && creatorSlug)
      if (fanLoggedIn) {
        const response = await fanPortalApi.subscribe({
          creatorSlug,
          months: data.months,
          paymentMethod: membershipPayMethod,
          mpesaMobile: data.mpesaMobile,
          checkoutCountry: membershipCountry,
        })
        const approvalUrl = (response as { approvalUrl?: string }).approvalUrl
        if (approvalUrl) {
          window.location.assign(approvalUrl)
          return
        }
        const pid = checkoutPaymentId(response)
        if (!pid) throw new Error('No payment id returned')
        setPaymentId(pid)
        setPaymentStatus('checking')
        Swal.fire({
          icon: 'info',
          title: 'M-Pesa prompt sent',
          text: 'Complete the payment on your phone when prompted.',
          confirmButtonColor: '#9333ea',
          confirmButtonText: 'OK',
          timer: 5000,
          timerProgressBar: true,
        })
        pollPaymentStatus(pid)
        return
      }

      const response = await subscriptionApi.register({
        ...data,
        monthlyPrice: monthlyPrice,
        ...(creatorSlug ? { creatorSlug } : {}),
        paymentMethod: membershipPayMethod,
        checkoutCountry: membershipCountry,
        ...(membershipPayMethod === 'paystack'
          ? { email: (data.email || fanPrefill?.email || '').trim() }
          : {}),
      } as RegisterSubscriptionDto)

      if (response.approvalUrl) {
        window.location.assign(response.approvalUrl)
        return
      }

      setPaymentId(response.payment.id)
      setPaymentStatus('checking')

      Swal.fire({
        icon: 'info',
        title: 'M-Pesa prompt sent',
        text: 'Complete the payment on your phone when prompted.',
        confirmButtonColor: '#9333ea',
        confirmButtonText: 'OK',
        timer: 5000,
        timerProgressBar: true,
      })

      pollPaymentStatus(response.payment.id)
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || 'Failed to initiate payment. Please try again.'
      setError(errorMessage)
      setPaymentStatus('failed')
      setIsSubmitting(false)

      Swal.fire({
        icon: 'error',
        title: 'Payment Failed',
        text: errorMessage,
        confirmButtonColor: '#dc2626',
        confirmButtonText: 'Try Again',
      })
    }
  }

  const onStreamSubmit = async (data: StreamAlertFormData) => {
    const amountKes = shoutKenya ? data.amount : usdToKes(data.amount)
    const hasVideo = !!data.videoUrl?.trim()
    const minReq = hasVideo
      ? streamLimits.minKesWithVideo
      : streamLimits.minKes
    if (amountKes < minReq) {
      await Swal.fire({
        icon: 'error',
        title: 'Amount too low',
        text: hasVideo
          ? `With a clip URL, the minimum is ${formatSupportPrice(minReq, shoutKenya)}.`
          : `Minimum shoutout amount is ${formatSupportPrice(minReq, shoutKenya)}.`,
        confirmButtonColor: '#dc2626',
      })
      return
    }
    if (amountKes > streamLimits.maxKes) {
      await Swal.fire({
        icon: 'error',
        title: 'Amount too high',
        text: `Maximum shoutout amount is ${formatSupportPrice(streamLimits.maxKes, shoutKenya)}.`,
        confirmButtonColor: '#dc2626',
      })
      return
    }

    setStreamSubmitting(true)
    setStreamError(null)
    setStreamPaymentStatus('pending')

    try {
      const trimmed = data.message?.trim()
      const videoTrim = data.videoUrl?.trim()
      const compactClip = videoTrim ? toCompactTikTokClipRef(videoTrim) : null
      if (videoTrim && !compactClip) {
        setStreamSubmitting(false)
        setStreamPaymentStatus('idle')
        await Swal.fire({
          icon: 'error',
          title: 'Invalid clip URL',
          text: 'Use a TikTok video or photo link (…/video/… or …/photo/…).',
          confirmButtonColor: '#dc2626',
        })
        return
      }
      const videoPayload = compactClip ? { videoUrl: compactClip } : {}
      const paystackPayload =
        streamPayMethod === 'paystack'
          ? {
              paymentMethod: 'paystack' as const,
              email: (data.email || fanPrefill?.email || '').trim(),
            }
          : {}
      if (streamPayMethod === 'paystack') {
        const email = paystackPayload.email
        if (!getFanToken() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) {
          setStreamSubmitting(false)
          setStreamPaymentStatus('idle')
          await Swal.fire({
            icon: 'error',
            title: 'Email required',
            text: 'Paystack needs an email for card and international checkout.',
            confirmButtonColor: '#dc2626',
          })
          return
        }
      } else if (!/^(254|0)[0-9]{9}$/.test((data.mpesaMobile || '').trim())) {
        setStreamSubmitting(false)
        setStreamPaymentStatus('idle')
        await Swal.fire({
          icon: 'error',
          title: 'Invalid M-Pesa number',
          text: 'Use 254XXXXXXXXX or 0XXXXXXXXX.',
          confirmButtonColor: '#dc2626',
        })
        return
      }
      const fanLoggedIn = Boolean(getFanToken() && creatorSlug)
      const res = fanLoggedIn
        ? await fanPortalApi.shoutout({
            creatorSlug,
            amount: amountKes,
            displayHandle: data.displayHandle.trim().replace(/^@+/, ''),
            platform: data.platform,
            mpesaMobile: data.mpesaMobile,
            ...(trimmed ? { message: trimmed } : {}),
            ...videoPayload,
            ...paystackPayload,
          })
        : await streamAlertApi.checkout({
            displayHandle: data.displayHandle.trim().replace(/^@+/, ''),
            mpesaMobile: data.mpesaMobile,
            platform: data.platform,
            amount: amountKes,
            ...(creatorSlug ? { creatorSlug } : {}),
            ...(trimmed ? { message: trimmed } : {}),
            ...videoPayload,
            ...paystackPayload,
          })

      const approvalUrl = (res as { approvalUrl?: string }).approvalUrl
      if (approvalUrl) {
        window.location.assign(approvalUrl)
        return
      }

      const shoutId = checkoutPaymentId(res)
      if (!shoutId) throw new Error('No payment id returned')
      setStreamPaymentId(shoutId)
      setStreamPaymentStatus('checking')

      Swal.fire({
        icon: 'info',
        title: 'STK Push sent',
        text: `Pay ${formatSupportPrice(data.amount, true)} on your phone to send the shoutout.`,
        confirmButtonColor: '#06b6d4',
        timer: 5000,
        timerProgressBar: true,
      })

      pollStreamPaymentStatus(shoutId)
    } catch (err: any) {
      const errorMessage = formatApiErrorMessage(
        err.response?.data ?? err.message,
        'Could not start payment. Check your number and try again.',
      )
      setStreamError(errorMessage)
      setStreamPaymentStatus('failed')
      setStreamSubmitting(false)

      Swal.fire({
        icon: 'error',
        title: 'Could not start',
        text: errorMessage,
        confirmButtonColor: '#dc2626',
      })
    }
  }

  const inputBase =
    'mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder-gray-500 transition focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/40'
  const inputCyan =
    'mt-1.5 w-full rounded-xl border border-cyan-500/20 bg-black/40 px-4 py-3 text-white placeholder-gray-500 transition focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/40'
  const inputAmber =
    'mt-1.5 w-full rounded-xl border border-amber-500/25 bg-black/40 px-4 py-3 text-white placeholder-gray-500 transition focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/35'
  const labelCls = 'block text-sm font-medium text-gray-300'

  const membershipItems = useMemo(
    () => (catalog?.items ?? []).filter((i): i is SupportCatalogMembershipItem => i.kind === 'membership'),
    [catalog?.items],
  )
  const shoutoutItems = useMemo(
    () => (catalog?.items ?? []).filter((i): i is SupportCatalogShoutoutItem => i.kind === 'shoutout'),
    [catalog?.items],
  )
  const rewardItems = useMemo(
    () =>
      catalog?.items.filter((i): i is SupportCatalogRewardItem => i.kind === 'reward') ?? [],
    [catalog?.items],
  )

  useEffect(() => {
    if (rewardItems.length === 0) return
    setRewardCountries((prev) => {
      const next = { ...prev }
      let changed = false
      for (const item of rewardItems) {
        if (!next[item.id]) {
          next[item.id] = readStoredCheckoutCountry(`reward.${item.id}`)
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [rewardItems])
  const showJumpNav =
    (catalog?.items.length ?? 0) >= 3 || rewardItems.length >= 2 || membershipItems.length + shoutoutItems.length >= 2
  const bookHref = creatorSlug ? `/book/${encodeURIComponent(creatorSlug)}` : '/book'

  return (
    <div className="relative min-h-screen scroll-smooth text-white">
      <div className="relative z-10">
        <SiteNav />

        <main className="container mx-auto max-w-7xl px-4 pb-16 pt-4 sm:pt-6 md:pb-24">
          

          <header className="mb-8 max-w-3xl md:mb-10">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-violet-200/90">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Support
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl md:text-5xl">
              Support the stream
            </h1>
            <p className="mt-4 text-pretty text-gray-400 sm:text-lg">
              Monthly membership, live shoutouts, and fixed-price tiers. Kenya fans pay with M-Pesa in KES; other countries see USD and pay by card (billed in KES). Pick your country on the option you want.
            </p>
          </header>

          {catalogLoading ? (
            <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-3 py-24 text-gray-400">
              <Loader2 className="h-10 w-10 animate-spin text-violet-400" aria-hidden />
              <p className="text-sm">Loading options…</p>
            </div>
          ) : !catalog?.items.length ? (
            <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-12 text-center text-gray-400">
              <p>No support options are configured right now. Try again later.</p>
            </div>
          ) : (
          <>
          {showJumpNav && (
            <nav
              className="sticky top-[4.25rem] z-20 -mx-4 mb-8 border-b border-white/10 bg-[#07070c]/92 px-4 py-3 backdrop-blur-md md:mx-0 md:rounded-xl md:border md:border-white/10"
              aria-label="Jump to section"
            >
              <div className="mx-auto flex max-w-7xl flex-wrap gap-2">
                {membershipItems.length > 0 ? (
                  <a
                    href="#support-membership"
                    className="rounded-full border border-violet-500/40 bg-violet-500/15 px-3 py-1.5 text-xs font-semibold text-violet-100 transition hover:border-violet-500/60 hover:bg-violet-500/25"
                  >
                    1. Membership
                  </a>
                ) : null}
                <a
                  href={bookHref}
                  className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-100 transition hover:border-emerald-500/55 hover:bg-emerald-500/20"
                >
                  2. Coaching
                </a>
                {shoutoutItems.length > 0 ? (
                  <a
                    href="#support-shoutout"
                    className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-200 transition hover:border-cyan-500/45 hover:bg-cyan-500/10 hover:text-cyan-100"
                  >
                    3. Live shoutout
                  </a>
                ) : null}
                {rewardItems.length > 0 ? (
                  <a
                    href="#support-rewards"
                    className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-200 transition hover:border-amber-500/45 hover:bg-amber-500/10 hover:text-amber-100"
                  >
                    Reward tiers{rewardItems.length > 1 ? ` · ${rewardItems.length}` : ''}
                  </a>
                ) : null}
              </div>
            </nav>
          )}
          <div className="mx-auto max-w-7xl space-y-14">
          {membershipItems.length > 0 ? (
          <div className="grid grid-cols-1 gap-8">
            {membershipItems.map((item) => (
            <div
              key="membership"
              id="support-membership"
              className="scroll-mt-28 min-w-0 rounded-2xl border border-violet-500/20 bg-gradient-to-b from-violet-950/35 via-[#0d0d14]/90 to-[#0a0a0f] p-6 shadow-xl shadow-violet-950/20 sm:p-8"
            >
              <div className="mb-6 flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/20">
                  <Gift className="h-6 w-6" aria-hidden />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-violet-300/90">Start here</p>
                  <h2 className="mt-1 text-xl font-bold text-white sm:text-2xl">{item.title}</h2>
                  {item.description ? (
                    <p className="mt-1 text-sm leading-relaxed text-gray-400">{item.description}</p>
                  ) : null}
                </div>
              </div>

              <ul className="mb-8 grid gap-3 sm:grid-cols-3">
                {[
                  { icon: Video, text: 'Member streams & replays' },
                  { icon: Users, text: 'WhatsApp & Discord' },
                  { icon: Sparkles, text: 'Tutorials & updates' },
                ].map(({ icon: Icon, text }) => (
                  <li
                    key={text}
                    className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 text-xs font-medium text-gray-300 sm:flex-col sm:items-start sm:text-sm"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-violet-400" aria-hidden />
                    {text}
                  </li>
                ))}
              </ul>

              {paymentStatus === 'success' ? (
                <div className="rounded-2xl border border-emerald-500/25 bg-emerald-950/20 px-6 py-12 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/30">
                    <CheckCircle className="h-9 w-9 text-emerald-400" aria-hidden />
                  </div>
                  <h3 className="text-2xl font-bold text-white">You&apos;re a member</h3>
                  <p className="mx-auto mt-3 max-w-sm text-sm text-gray-400">
                    You should receive the WhatsApp group link on the number you used at checkout.
                  </p>
                  <Link
                    href="/"
                    className="mt-8 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-violet-500 hover:to-fuchsia-500"
                  >
                    Back to home
                  </Link>
                </div>
              ) : paymentStatus === 'failed' ? (
                <div className="rounded-2xl border border-red-500/25 bg-red-950/20 px-6 py-12 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 ring-1 ring-red-400/25">
                    <XCircle className="h-9 w-9 text-red-400" aria-hidden />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Payment didn&apos;t go through</h3>
                  <p className="mx-auto mt-3 max-w-sm text-sm text-gray-400">{error || 'Payment was not completed.'}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentStatus('idle')
                      setError(null)
                      setPaymentId(null)
                    }}
                    className="mt-8 rounded-xl bg-white/10 px-8 py-3 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15"
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <CheckoutCountryField
                    id="membership-country"
                    value={membershipCountry}
                    onChange={setMembershipCountry}
                    selectClassName={`${inputBase} cursor-pointer appearance-none pr-10`}
                  />

                  <div>
                    <label className={labelCls} htmlFor="sub-name">
                      Full name
                    </label>
                    <input id="sub-name" {...register('name')} type="text" className={inputBase} placeholder="Your name" />
                    {errors.name && <p className="mt-1.5 text-sm text-red-400">{errors.name.message}</p>}
                  </div>

                  <div>
                    <label className={labelCls} htmlFor="sub-tt">
                      Username / handle
                    </label>
                    <input
                      id="sub-tt"
                      {...register('tiktokUsername')}
                      type="text"
                      className={inputBase}
                      placeholder="@yourusername"
                    />
                    {errors.tiktokUsername && (
                      <p className="mt-1.5 text-sm text-red-400">{errors.tiktokUsername.message}</p>
                    )}
                  </div>

                  {membershipKenya && membershipPayMethod !== 'paystack' ? (
                  <div>
                    <label className={labelCls} htmlFor="sub-mpesa">
                      M-Pesa number
                    </label>
                    <input
                      id="sub-mpesa"
                      {...register('mpesaMobile')}
                      type="tel"
                      className={inputBase}
                      placeholder="254712345678 or 0712345678"
                    />
                    {errors.mpesaMobile && (
                      <p className="mt-1.5 text-sm text-red-400">{errors.mpesaMobile.message}</p>
                    )}
                    <p className="mt-1.5 text-xs text-gray-500">STK Push is sent to this number.</p>
                  </div>
                  ) : null}

                  {membershipKenya && membershipPayMethod !== 'paystack' ? (
                  <div>
                    <label className={labelCls} htmlFor="sub-wa">
                      WhatsApp number
                    </label>
                    <input
                      id="sub-wa"
                      {...register('whatsappNumber')}
                      type="tel"
                      className={inputBase}
                      placeholder="254712345678 or 0712345678"
                    />
                    {errors.whatsappNumber && (
                      <p className="mt-1.5 text-sm text-red-400">{errors.whatsappNumber.message}</p>
                    )}
                    <p className="mt-1.5 text-xs text-gray-500">Group invite link is sent here.</p>
                  </div>
                  ) : (
                  <div>
                    <label className={labelCls} htmlFor="sub-email">
                      Email
                    </label>
                    <input
                      id="sub-email"
                      {...register('email')}
                      type="email"
                      className={inputBase}
                      placeholder="you@email.com"
                    />
                    <p className="mt-1.5 text-xs text-gray-500">
                      {getFanToken()
                        ? 'Paystack uses this receipt email. Logged-in fans can keep the email on their account.'
                        : 'Paystack hosted checkout. Prices shown in USD; the card is billed in KES.'}
                    </p>
                  </div>
                  )}

                  <div>
                    <label className={labelCls} htmlFor="sub-months">
                      Plan length
                    </label>
                    <select
                      id="sub-months"
                      {...register('months', { valueAsNumber: true })}
                      className={`${inputBase} cursor-pointer appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10`}
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                      }}
                    >
                      <option value={1}>1 month — {formatSupportPrice(monthlyPrice, membershipKenya)}</option>
                      <option value={2}>2 months — {formatSupportPrice(monthlyPrice * 2, membershipKenya)}</option>
                      <option value={3}>3 months — {formatSupportPrice(monthlyPrice * 3, membershipKenya)}</option>
                      <option value={6}>6 months — {formatSupportPrice(monthlyPrice * 6, membershipKenya)}</option>
                      <option value={12}>12 months — {formatSupportPrice(monthlyPrice * 12, membershipKenya)}</option>
                    </select>
                  </div>

                  <div>
                    <span className={labelCls} id="sub-pay-method-label">
                      Payment method
                    </span>
                    <div
                      className="mt-2 flex gap-2 rounded-xl border border-white/10 bg-black/20 p-1"
                      role="group"
                      aria-labelledby="sub-pay-method-label"
                    >
                      {membershipKenya ? (
                      <button
                        type="button"
                        onClick={() => setMembershipPayMethod('mpesa')}
                        className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
                          membershipPayMethod === 'mpesa'
                            ? 'bg-violet-600 text-white shadow-md'
                            : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                        }`}
                      >
                        M-Pesa
                      </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setMembershipPayMethod('paystack')}
                        className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
                          membershipPayMethod === 'paystack'
                            ? 'bg-violet-600 text-white shadow-md'
                            : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                        }`}
                      >
                        Card
                      </button>
                      <button
                        type="button"
                        onClick={() => setMembershipPayMethod('paypal')}
                        className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
                          membershipPayMethod === 'paypal'
                            ? 'bg-violet-600 text-white shadow-md'
                            : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                        }`}
                      >
                        PayPal
                      </button>
                    </div>
                    <p className="mt-1.5 text-xs text-gray-500">
                      {membershipPayMethod === 'paypal'
                        ? 'You will be redirected to PayPal. Checkout is in USD (converted from your KES total); you return here after approving.'
                        : membershipPayMethod === 'paystack'
                          ? 'You will be redirected to Paystack. Prices in USD; the card is billed in KES.'
                          : 'STK Push is sent to your M-Pesa number.'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm text-violet-200/80">Total due today</span>
                      <span className="text-2xl font-bold tabular-nums text-white">
                        {formatSupportPrice(totalAmount, membershipKenya)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      {membershipPayMethod === 'paypal'
                        ? 'Charged once through PayPal (USD) for the selected period; your plan is still priced in KES on our side.'
                        : membershipPayMethod === 'paystack'
                          ? membershipKenya
                            ? 'Charged once through Paystack in KES for the selected period.'
                            : `${formatSupportPriceHint(totalAmount, false)} Charged once.`
                          : 'Charged once via M-Pesa for the selected period.'}
                    </p>
                  </div>

                  {error && (
                    <div className="rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3">
                      <p className="text-sm text-red-200">{error}</p>
                    </div>
                  )}

                  {membershipPayMethod === 'mpesa' && paymentStatus === 'checking' && (
                    <div className="flex items-center gap-3 rounded-xl border border-sky-500/35 bg-sky-950/30 px-4 py-3">
                      <Loader2 className="h-5 w-5 shrink-0 animate-spin text-sky-400" />
                      <div>
                        <p className="text-sm font-semibold text-sky-100">Completing payment…</p>
                        <p className="text-xs text-sky-200/80">Approve the prompt on your phone.</p>
                      </div>
                    </div>
                  )}

                  {membershipPayMethod === 'mpesa' && paymentStatus === 'pending' && (
                    <div className="flex items-center gap-3 rounded-xl border border-amber-500/35 bg-amber-950/25 px-4 py-3">
                      <Phone className="h-5 w-5 shrink-0 text-amber-400" />
                      <div>
                        <p className="text-sm font-semibold text-amber-100">STK Push sent</p>
                        <p className="text-xs text-amber-200/80">Open M-Pesa and enter your PIN.</p>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      (membershipPayMethod === 'mpesa' && paymentStatus === 'checking')
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3.5 text-base font-semibold text-white shadow-lg transition hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ||
                    (membershipPayMethod === 'mpesa' && paymentStatus === 'checking') ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Processing…
                      </>
                    ) : membershipPayMethod === 'paypal' ? (
                      <>Continue with PayPal</>
                    ) : membershipPayMethod === 'paystack' ? (
                      <>Continue with Paystack</>
                    ) : (
                      <>Pay with M-Pesa</>
                    )}
                  </button>
                  <p className="text-center text-xs text-gray-500">
                    By continuing, you agree to our{' '}
                    <Link href="/terms" className="text-violet-300 hover:text-violet-200">
                      Terms of Service
                    </Link>
                    .
                  </p>
                </form>
              )}
            </div>
            ))}
          </div>
          ) : null}

          {/* <section
            id="support-coaching"
            className="scroll-mt-28 rounded-2xl border border-emerald-500/25 bg-gradient-to-r from-emerald-950/40 via-[#0d0d14]/90 to-transparent p-6 sm:p-7"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-200/90">Next</p>
                <h2 className="mt-1 text-xl font-bold text-white sm:text-2xl">Book 1:1 coaching</h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-400">
                  Membership keeps you close to the stream. A paid session is a tactics review or rank-push with the creator.
                </p>
              </div>
              <a
                href={bookHref}
                className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-500"
              >
                <CalendarCheck className="h-4 w-4" aria-hidden />
                Book a session
              </a>
            </div>
          </section> */}

          {shoutoutItems.length > 0 ? (
          <section className="scroll-mt-28 border-t border-white/10 pt-10 md:pt-12">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Optional extra</p>
            {shoutoutItems.map((item) => (
            <div
              key="shoutout"
              id="support-shoutout"
              className="scroll-mt-28 min-w-0 rounded-2xl border border-white/12 bg-gradient-to-b from-white/[0.04] via-[#0d0d14]/90 to-[#0a0a0f] p-6 sm:p-8"
            >
              <div className="mb-6 flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-400/25">
                  <Megaphone className="h-6 w-6" aria-hidden />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white sm:text-2xl">{item.title}</h2>
                  {item.description ? (
                    <p className="mt-1 text-sm leading-relaxed text-gray-400">{item.description}</p>
                  ) : null}
                </div>
              </div>

              {streamPaymentStatus === 'success' ? (
                <div className="rounded-2xl border border-cyan-500/25 bg-cyan-950/20 px-6 py-12 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/15 ring-1 ring-cyan-400/30">
                    <CheckCircle className="h-9 w-9 text-cyan-400" aria-hidden />
                  </div>
                  <p className="text-lg font-semibold text-white">Session shout queued</p>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-gray-400">
                    Thanks — the creator will play this on stream.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setStreamPaymentStatus('idle')
                      setStreamError(null)
                      setStreamPaymentId(null)
                    }}
                    className="mt-8 rounded-xl bg-cyan-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-500"
                  >
                    Send another
                  </button>
                </div>
              ) : streamPaymentStatus === 'failed' ? (
                <div className="rounded-2xl border border-red-500/25 bg-red-950/20 px-6 py-10 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15">
                    <XCircle className="h-8 w-8 text-red-400" aria-hidden />
                  </div>
                  <p className="text-sm text-gray-300">{streamError || 'Payment did not complete.'}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setStreamPaymentStatus('idle')
                      setStreamError(null)
                      setStreamPaymentId(null)
                    }}
                    className="mt-6 rounded-xl bg-cyan-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-500"
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <form onSubmit={handleStreamSubmit(onStreamSubmit)} className="space-y-5">
                  <CheckoutCountryField
                    id="shoutout-country"
                    value={shoutoutCountry}
                    onChange={setShoutoutCountry}
                    selectClassName={`${inputCyan} cursor-pointer appearance-none pr-10`}
                  />

                  <div>
                    <label className={labelCls} htmlFor="sh-platform">
                      Platform
                    </label>
                    <select
                      id="sh-platform"
                      {...registerStream('platform')}
                      className={`${inputCyan} cursor-pointer appearance-none pr-10`}
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2322d3ee'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                        backgroundSize: '1rem',
                        backgroundPosition: 'right 0.75rem center',
                        backgroundRepeat: 'no-repeat',
                      }}
                    >
                      {STREAM_PLATFORM_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {streamErrors.platform && (
                      <p className="mt-1.5 text-sm text-red-400">{streamErrors.platform.message}</p>
                    )}
                  </div>

                  <div>
                    <label className={labelCls} htmlFor="sh-handle">
                      Handle on stream
                    </label>
                    <input
                      id="sh-handle"
                      {...registerStream('displayHandle')}
                      type="text"
                      className={inputCyan}
                      placeholder="@yourhandle"
                    />
                    {streamErrors.displayHandle && (
                      <p className="mt-1.5 text-sm text-red-400">{streamErrors.displayHandle.message}</p>
                    )}
                  </div>

                  <div>
                    <label className={labelCls} htmlFor="sh-msg">
                      Message <span className="font-normal text-gray-500">(optional, max 100)</span>
                    </label>
                    <textarea
                      id="sh-msg"
                      {...registerStream('message')}
                      rows={3}
                      maxLength={100}
                      className={`${inputCyan} min-h-[4.5rem] resize-y`}
                      placeholder="What should they say on stream?"
                    />
                    {streamErrors.message && (
                      <p className="mt-1.5 text-sm text-red-400">{streamErrors.message.message}</p>
                    )}
                  </div>

                  <div>
                    <label className={labelCls} htmlFor="sh-clip">
                      Clip URL <span className="font-normal text-gray-500">(optional)</span>
                    </label>
                    <input
                      id="sh-clip"
                      {...registerStream('videoUrl')}
                      type="url"
                      inputMode="url"
                      className={inputCyan}
                      placeholder="https://www.tiktok.com/@user/video/…"
                    />
                    {streamErrors.videoUrl && (
                      <p className="mt-1.5 text-sm text-red-400">{streamErrors.videoUrl.message}</p>
                    )}
                  </div>

                  <div>
                    <label className={labelCls} htmlFor="sh-amt">
                      Amount ({shoutKenya ? 'KES' : 'USD'}){' '}
                      <span className="font-normal text-gray-500">
                        min {shoutKenya ? streamMinDisplay : streamMinDisplay.toFixed(2)}
                        {streamWantsVideo ? ' with clip' : ''} · max{' '}
                        {shoutKenya ? streamMaxDisplay : streamMaxDisplay.toFixed(2)}
                      </span>
                    </label>
                    <input
                      id="sh-amt"
                      {...registerStream('amount', { valueAsNumber: true })}
                      type="number"
                      min={shoutKenya ? streamAmountMin : kesToUsd(streamAmountMin)}
                      max={shoutKenya ? streamLimits.maxKes : kesToUsd(streamLimits.maxKes)}
                      step={shoutKenya ? 1 : 0.01}
                      className={`${inputCyan} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                      placeholder="10"
                    />
                    {streamErrors.amount && (
                      <p className="mt-1.5 text-sm text-red-400">{streamErrors.amount.message}</p>
                    )}
                  </div>

                  <div>
                    <span className={labelCls} id="sh-pay-method-label">
                      Payment method
                    </span>
                    <div
                      className="mt-2 flex gap-2 rounded-xl border border-cyan-500/20 bg-black/20 p-1"
                      role="group"
                      aria-labelledby="sh-pay-method-label"
                    >
                      {shoutKenya ? (
                      <button
                        type="button"
                        onClick={() => setStreamPayMethod('mpesa')}
                        className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
                          streamPayMethod === 'mpesa'
                            ? 'bg-cyan-600 text-white shadow-md'
                            : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                        }`}
                      >
                        M-Pesa
                      </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setStreamPayMethod('paystack')}
                        className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
                          streamPayMethod === 'paystack'
                            ? 'bg-cyan-600 text-white shadow-md'
                            : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                        }`}
                      >
                        Card
                      </button>
                    </div>
                  </div>

                  {streamPayMethod === 'mpesa' ? (
                  <div>
                    <label className={labelCls} htmlFor="sh-mpesa">
                      M-Pesa number
                    </label>
                    <input
                      id="sh-mpesa"
                      {...registerStream('mpesaMobile')}
                      type="tel"
                      className={inputCyan}
                      placeholder="254712345678 or 0712345678"
                    />
                    {streamErrors.mpesaMobile && (
                      <p className="mt-1.5 text-sm text-red-400">{streamErrors.mpesaMobile.message}</p>
                    )}
                  </div>
                  ) : (
                  <div>
                    <label className={labelCls} htmlFor="sh-email">
                      Email
                    </label>
                    <input
                      id="sh-email"
                      {...registerStream('email')}
                      type="email"
                      className={inputCyan}
                      placeholder="you@email.com"
                    />
                    <p className="mt-1.5 text-xs text-gray-500">
                      Card checkout. Price in USD; billed in KES.
                    </p>
                  </div>
                  )}

                  <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm text-cyan-200/80">You pay</span>
                      <span className="text-xl font-bold tabular-nums text-cyan-200">
                        {Number.isFinite(shoutoutKes)
                          ? formatSupportPrice(shoutoutKes, shoutKenya)
                          : '—'}
                      </span>
                    </div>
                  </div>

                  {(streamPaymentStatus === 'idle' ||
                    streamPaymentStatus === 'pending' ||
                    streamPaymentStatus === 'checking') &&
                    streamError && (
                      <div className="rounded-xl border border-red-500/45 bg-red-950/30 px-4 py-3">
                        <p className="text-sm text-red-200">{streamError}</p>
                      </div>
                    )}

                  {streamPaymentStatus === 'checking' && (
                    <div className="flex items-center gap-3 rounded-xl border border-cyan-500/35 bg-cyan-950/40 px-4 py-3">
                      <Loader2 className="h-5 w-5 shrink-0 animate-spin text-cyan-400" />
                      <p className="text-sm text-cyan-100">Waiting for M-Pesa…</p>
                    </div>
                  )}

                  {streamPaymentStatus === 'pending' && (
                    <div className="flex items-center gap-3 rounded-xl border border-amber-500/35 bg-amber-950/25 px-4 py-3">
                      <Phone className="h-5 w-5 shrink-0 text-amber-400" />
                      <p className="text-sm text-amber-100">Complete the STK prompt on your phone.</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={
                      streamSubmitting ||
                      streamPaymentStatus === 'checking' ||
                      typeof shoutoutKes !== 'number' ||
                      Number.isNaN(shoutoutKes) ||
                      shoutoutKes < streamAmountMin ||
                      shoutoutKes > streamLimits.maxKes
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 py-3.5 text-base font-semibold text-white shadow-lg transition hover:from-cyan-500 hover:to-teal-500 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {streamSubmitting || streamPaymentStatus === 'checking' ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Processing…
                      </>
                    ) : (
                      <>
                        <Megaphone className="h-5 w-5" />
                        Pay{' '}
                        {Number.isFinite(shoutoutKes)
                          ? formatSupportPrice(shoutoutKes, shoutKenya)
                          : '…'}{' '}
                        with {streamPayMethod === 'paystack' ? 'card' : 'M-Pesa'}
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            ))}
          </section>
          ) : null}
          {rewardItems.length > 0 ? (
            <section
              id="support-rewards"
              className="scroll-mt-28 border-t border-white/10 pt-10 md:scroll-mt-32 md:pt-12"
            >
              <div className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
                <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Reward tiers</h2>
                <p className="max-w-lg text-sm leading-relaxed text-gray-500">
                  Fixed-price extras. Kenya: M-Pesa (KES). Other countries: card (USD on screen, KES on the card).
                </p>
              </div>
              <div
                className={
                  rewardItems.length >= 3
                    ? 'grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3'
                    : 'grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8'
                }
              >
                {rewardItems.map((item) => (
                  <RewardTierCatalogCard
                    key={item.id}
                    tier={item}
                    compact={rewardItems.length >= 3}
                    streamLimits={streamLimits}
                    expanded={tierExpandedId === item.id}
                    tierForm={tierForm}
                    setTierForm={setTierForm}
                    tierSubmitting={tierSubmitting}
                    tierPaymentStatus={tierPaymentStatus}
                    country={countryForReward(item.id)}
                    onCountryChange={(code) => {
                      setRewardCountries((prev) => ({ ...prev, [item.id]: code }))
                      writeStoredCheckoutCountry(code, `reward.${item.id}`)
                      if (!isKenyaCheckout(code)) {
                        setTierForm((f) =>
                          f.paymentMethod === 'mpesa' ? { ...f, paymentMethod: 'paystack' } : f,
                        )
                      }
                    }}
                    kenyaCheckout={isKenyaCheckout(countryForReward(item.id))}
                    tierError={tierError}
                    onExpand={() => {
                      setTierExpandedId(item.id)
                      setTierPaymentStatus('idle')
                      setTierError(null)
                      setTierForm({
                        displayName: fanPrefill?.handle || '',
                        mpesaMobile: fanPrefill?.phone || '',
                        email: fanPrefill?.email || '',
                        paymentMethod: isKenyaCheckout(countryForReward(item.id))
                          ? 'mpesa'
                          : 'paystack',
                        platform: 'tiktok',
                        message: '',
                        videoUrl: '',
                      })
                    }}
                    onCancel={() => {
                      setTierExpandedId(null)
                      setTierPaymentStatus('idle')
                      setTierError(null)
                    }}
                    onSubmit={(e) => {
                      e.preventDefault()
                      void onTierCheckout(item)
                    }}
                    labelCls={labelCls}
                    inputAmber={inputAmber}
                  />
                ))}
              </div>
            </section>
          ) : null}

          </div>
          </>
          )}
        </main>

        <SiteFooter />
      </div>
    </div>
  )
}

export default function SupportPage() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-screen text-white">
          <div className="relative z-10">
            <SiteNav />
            <main className="container mx-auto max-w-7xl px-4 pb-16 pt-6">
              <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-3 py-24 text-gray-400">
                <Loader2 className="h-10 w-10 animate-spin text-violet-400" aria-hidden />
                <p className="text-sm">Loading support page…</p>
              </div>
            </main>
          </div>
        </div>
      }
    >
      <SupportPageInner />
    </Suspense>
  )
}
