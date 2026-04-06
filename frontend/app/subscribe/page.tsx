'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import {
  ArrowLeft,
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
import Swal from 'sweetalert2'
import {
  subscriptionApi,
  streamAlertApi,
  RegisterSubscriptionDto,
  type StreamAlertLimits,
  type StreamAlertPlatform,
} from '@/lib/api'

const DEFAULT_STREAM_LIMITS: StreamAlertLimits = {
  minKes: 10,
  minKesWithVideo: 50,
  maxKes: 500_000,
}

const subscriptionSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  tiktokUsername: z.string().min(1, 'TikTok username is required'),
  mpesaMobile: z.string().regex(/^(254|0)[0-9]{9}$/, 'Invalid phone number format'),
  whatsappNumber: z.string().regex(/^(254|0)[0-9]{9}$/, 'Invalid phone number format'),
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
    mpesaMobile: z.string().regex(/^(254|0)[0-9]{9}$/, 'Invalid phone number format'),
    platform: streamPlatformSchema,
    amount: z
      .number({ invalid_type_error: 'Enter a valid amount' })
      .min(1, 'Enter a valid amount')
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

export default function Subscribe() {
  const [monthlyPrice, setMonthlyPrice] = useState<number>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<
    'idle' | 'pending' | 'checking' | 'success' | 'failed'
  >('idle')
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [streamSubmitting, setStreamSubmitting] = useState(false)
  const [streamPaymentStatus, setStreamPaymentStatus] = useState<
    'idle' | 'pending' | 'checking' | 'success' | 'failed'
  >('idle')
  const [streamPaymentId, setStreamPaymentId] = useState<string | null>(null)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [streamLimits, setStreamLimits] =
    useState<StreamAlertLimits>(DEFAULT_STREAM_LIMITS)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<SubscriptionFormData>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      months: 1,
      monthlyPrice: 1,
    },
  })

  const {
    register: registerStream,
    handleSubmit: handleStreamSubmit,
    formState: { errors: streamErrors },
    reset: resetStream,
    watch: watchStream,
  } = useForm<StreamAlertFormData>({
    resolver: zodResolver(streamAlertSchema),
    defaultValues: {
      platform: 'tiktok',
      message: '',
      videoUrl: '',
      amount: 10,
    },
  })

  const streamAmountKes = watchStream('amount')
  const streamVideoUrlWatch = watchStream('videoUrl')
  const streamWantsVideo = !!streamVideoUrlWatch?.trim()
  const streamAmountMin = streamWantsVideo
    ? streamLimits.minKesWithVideo
    : streamLimits.minKes

  const months = watch('months')
  const totalAmount = months * monthlyPrice

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await subscriptionApi.getMonthlyPrice()
        const price = response.monthlyPrice || 1
        setMonthlyPrice(price)
        reset({
          months: 1,
          monthlyPrice: price,
        })
      } catch (error) {
        console.error('Failed to fetch monthly price, using default:', error)
      }
    }
    fetchPrice()
  }, [reset])

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
            title: 'Payment Successful! 🎉',
            text: 'Your subscription has been activated. Redirecting...',
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
            title: 'Shoutout unlocked!',
            text: 'Your message should appear on stream shortly.',
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

  const onSubmit = async (data: SubscriptionFormData) => {
    setIsSubmitting(true)
    setError(null)
    setPaymentStatus('pending')

    try {
      const response = await subscriptionApi.register({
        ...data,
        monthlyPrice: monthlyPrice,
      } as RegisterSubscriptionDto)

      setPaymentId(response.payment.id)
      setPaymentStatus('checking')

      Swal.fire({
        icon: 'info',
        title: 'STK Push Sent!',
        text: 'Please check your phone and complete the M-Pesa payment',
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
    const hasVideo = !!data.videoUrl?.trim()
    const minReq = hasVideo
      ? streamLimits.minKesWithVideo
      : streamLimits.minKes
    if (data.amount < minReq) {
      await Swal.fire({
        icon: 'error',
        title: 'Amount too low',
        text: hasVideo
          ? `With a clip URL, the minimum is KES ${minReq}.`
          : `Minimum shoutout amount is KES ${minReq}.`,
        confirmButtonColor: '#dc2626',
      })
      return
    }
    if (data.amount > streamLimits.maxKes) {
      await Swal.fire({
        icon: 'error',
        title: 'Amount too high',
        text: `Maximum shoutout amount is KES ${streamLimits.maxKes}.`,
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
      const res = await streamAlertApi.checkout({
        displayHandle: data.displayHandle.trim().replace(/^@+/, ''),
        mpesaMobile: data.mpesaMobile,
        platform: data.platform,
        amount: data.amount,
        ...(trimmed ? { message: trimmed } : {}),
        ...(videoTrim
          ? {
              videoUrl: videoTrim.includes('://')
                ? videoTrim
                : `https://${videoTrim}`,
            }
          : {}),
      })

      setStreamPaymentId(res.payment.id)
      setStreamPaymentStatus('checking')

      Swal.fire({
        icon: 'info',
        title: 'STK Push sent',
        text: `Pay KES ${data.amount} on your phone to trigger the stream alert.`,
        confirmButtonColor: '#06b6d4',
        timer: 5000,
        timerProgressBar: true,
      })

      pollStreamPaymentStatus(res.payment.id)
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        'Could not start payment. Check your number and try again.'
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
  const labelCls = 'block text-sm font-medium text-gray-300'

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0a0a0f] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute top-0 right-0 h-80 w-80 rounded-full bg-violet-600/12 blur-[100px]" />
        <div className="absolute top-1/3 -left-24 h-72 w-72 rounded-full bg-fuchsia-600/10 blur-[90px]" />
        <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-cyan-600/10 blur-[80px]" />
      </div>

      <div className="relative z-10">
        <SiteNav />

        <main className="container mx-auto max-w-7xl px-4 pb-16 pt-4 sm:pt-6 md:pb-24">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-gray-400 transition hover:text-fuchsia-300"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to home
          </Link>

          <header className="mb-10 max-w-3xl">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-violet-200/90">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Subscribe &amp; support
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl md:text-5xl">
              Join the stream — or shout out live
            </h1>
            <p className="mt-4 text-pretty text-gray-400 sm:text-lg">
              Monthly membership with M-Pesa, plus a separate one-time shoutout checkout for the live show.
            </p>
          </header>

          <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-8 lg:grid-cols-2 xl:max-w-7xl xl:gap-10">
            {/* Subscription */}
            <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-b from-violet-950/35 via-[#0d0d14]/90 to-[#0a0a0f] p-6 shadow-xl shadow-violet-950/20 sm:p-8">
              <div className="mb-6 flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300 ring-1 ring-violet-400/20">
                  <Gift className="h-6 w-6" aria-hidden />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white sm:text-2xl">Member subscription</h2>
                  <p className="mt-1 text-sm leading-relaxed text-gray-400">
                    Exclusive streams, tutorials, and WhatsApp community access.
                  </p>
                </div>
              </div>

              <ul className="mb-8 grid gap-3 sm:grid-cols-3">
                {[
                  { icon: Video, text: 'Live & replays' },
                  { icon: Users, text: 'Community' },
                  { icon: Sparkles, text: 'Member perks' },
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
                  <h3 className="text-2xl font-bold text-white">You&apos;re in</h3>
                  <p className="mx-auto mt-3 max-w-sm text-sm text-gray-400">
                    Your subscription is active. Check WhatsApp for your invite link shortly.
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
                  <div>
                    <label className={labelCls} htmlFor="sub-name">
                      Full name
                    </label>
                    <input id="sub-name" {...register('name')} type="text" className={inputBase} placeholder="Your name" />
                    {errors.name && <p className="mt-1.5 text-sm text-red-400">{errors.name.message}</p>}
                  </div>

                  <div>
                    <label className={labelCls} htmlFor="sub-tt">
                      TikTok username
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
                      <option value={1}>1 month — KES {monthlyPrice}</option>
                      <option value={2}>2 months — KES {monthlyPrice * 2}</option>
                      <option value={3}>3 months — KES {monthlyPrice * 3}</option>
                      <option value={6}>6 months — KES {monthlyPrice * 6}</option>
                      <option value={12}>12 months — KES {monthlyPrice * 12}</option>
                    </select>
                  </div>

                  <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm text-violet-200/80">Total due today</span>
                      <span className="text-2xl font-bold tabular-nums text-white">KES {totalAmount}</span>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">Charged once via M-Pesa for the selected period.</p>
                  </div>

                  {error && (
                    <div className="rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3">
                      <p className="text-sm text-red-200">{error}</p>
                    </div>
                  )}

                  {paymentStatus === 'checking' && (
                    <div className="flex items-center gap-3 rounded-xl border border-sky-500/35 bg-sky-950/30 px-4 py-3">
                      <Loader2 className="h-5 w-5 shrink-0 animate-spin text-sky-400" />
                      <div>
                        <p className="text-sm font-semibold text-sky-100">Completing payment…</p>
                        <p className="text-xs text-sky-200/80">Approve the prompt on your phone.</p>
                      </div>
                    </div>
                  )}

                  {paymentStatus === 'pending' && (
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
                    disabled={isSubmitting || paymentStatus === 'checking'}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-3.5 text-base font-semibold text-white shadow-lg transition hover:from-violet-500 hover:to-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting || paymentStatus === 'checking' ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Processing…
                      </>
                    ) : (
                      <>Pay with M-Pesa</>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Stream shoutout */}
            <div className="rounded-2xl border border-cyan-500/25 bg-gradient-to-b from-cyan-950/30 via-[#0d0d14]/90 to-[#0a0a0f] p-6 shadow-xl shadow-cyan-950/20 sm:p-8">
              <div className="mb-6 flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-400/25">
                  <Megaphone className="h-6 w-6" aria-hidden />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white sm:text-2xl">Live shoutout</h2>
                  <p className="mt-1 text-sm leading-relaxed text-gray-400">
                    One-time payment — not a subscription. Adding a TikTok clip URL uses a higher minimum amount.
                  </p>
                </div>
              </div>

              {streamPaymentStatus === 'success' ? (
                <div className="rounded-2xl border border-cyan-500/25 bg-cyan-950/20 px-6 py-12 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/15 ring-1 ring-cyan-400/30">
                    <CheckCircle className="h-9 w-9 text-cyan-400" aria-hidden />
                  </div>
                  <p className="text-lg font-semibold text-white">Alert triggered</p>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-gray-400">
                    Thanks — you can send another shoutout whenever you like.
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
                      placeholder="Short line for the overlay"
                    />
                    {streamErrors.message && (
                      <p className="mt-1.5 text-sm text-red-400">{streamErrors.message.message}</p>
                    )}
                  </div>

                  <div>
                    <label className={labelCls} htmlFor="sh-clip">
                      TikTok clip URL <span className="font-normal text-gray-500">(optional)</span>
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
                      Amount (KES){' '}
                      <span className="font-normal text-gray-500">
                        min {streamAmountMin}
                        {streamWantsVideo ? ' with clip' : ''} · max {streamLimits.maxKes}
                      </span>
                    </label>
                    <input
                      id="sh-amt"
                      {...registerStream('amount', { valueAsNumber: true })}
                      type="number"
                      min={streamAmountMin}
                      max={streamLimits.maxKes}
                      step={1}
                      className={`${inputCyan} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                      placeholder="10"
                    />
                    {streamErrors.amount && (
                      <p className="mt-1.5 text-sm text-red-400">{streamErrors.amount.message}</p>
                    )}
                  </div>

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

                  <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm text-cyan-200/80">You pay</span>
                      <span className="text-xl font-bold tabular-nums text-cyan-200">
                        KES{' '}
                        {typeof streamAmountKes === 'number' && !Number.isNaN(streamAmountKes)
                          ? streamAmountKes
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
                      typeof streamAmountKes !== 'number' ||
                      Number.isNaN(streamAmountKes) ||
                      streamAmountKes < streamAmountMin ||
                      streamAmountKes > streamLimits.maxKes
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
                        {typeof streamAmountKes === 'number' && !Number.isNaN(streamAmountKes)
                          ? `KES ${streamAmountKes}`
                          : 'KES …'}{' '}
                        &amp; show alert
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </main>

        <footer className="relative z-10 border-t border-white/10 bg-black/20">
          <div className="container mx-auto max-w-7xl px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] text-center text-sm text-gray-500">
            © {new Date().getFullYear()} MohaGamer. All rights reserved.
          </div>
        </footer>
      </div>
    </div>
  )
}
