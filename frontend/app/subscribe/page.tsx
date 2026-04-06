'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { CheckCircle, XCircle, Loader2, Phone, Megaphone } from 'lucide-react'
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <SiteNav />

      <section className="container mx-auto max-w-7xl px-4 py-10 sm:py-16 md:py-20">
        <div className="max-w-6xl xl:max-w-7xl mx-auto w-full min-w-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
            {/* Subscription */}
            <div className="bg-gray-800 rounded-lg p-4 sm:p-6 md:p-8 shadow-xl border border-transparent">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 text-balance">
                Subscribe Now
              </h1>
              <p className="text-gray-400 mb-6 sm:mb-8 text-sm sm:text-base">
                Get exclusive access to live streams, tutorials, and community content
              </p>

              {paymentStatus === 'success' ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold text-white mb-4">Payment Successful!</h2>
                  <p className="text-gray-300 mb-6">
                    Your subscription is now active. You will receive a WhatsApp invite link shortly.
                  </p>
                  <Link
                    href="/"
                    className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg font-semibold"
                  >
                    Go to Home
                  </Link>
                </div>
              ) : paymentStatus === 'failed' ? (
                <div className="text-center py-12">
                  <XCircle className="w-20 h-20 text-red-400 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold text-white mb-4">Payment Failed</h2>
                  <p className="text-gray-300 mb-6">{error || 'Payment was not completed.'}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentStatus('idle')
                      setError(null)
                      setPaymentId(null)
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg font-semibold"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div>
                    <label className="block text-white font-semibold mb-2">Full Name</label>
                    <input
                      {...register('name')}
                      type="text"
                      className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Enter your full name"
                    />
                    {errors.name && <p className="text-red-400 mt-1">{errors.name.message}</p>}
                  </div>

                  <div>
                    <label className="block text-white font-semibold mb-2">TikTok Username</label>
                    <input
                      {...register('tiktokUsername')}
                      type="text"
                      className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="@yourusername"
                    />
                    {errors.tiktokUsername && (
                      <p className="text-red-400 mt-1">{errors.tiktokUsername.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-white font-semibold mb-2">M-Pesa Mobile Number</label>
                    <input
                      {...register('mpesaMobile')}
                      type="tel"
                      className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="254712345678 or 0712345678"
                    />
                    {errors.mpesaMobile && (
                      <p className="text-red-400 mt-1">{errors.mpesaMobile.message}</p>
                    )}
                    <p className="text-gray-400 text-sm mt-1">
                      This number will receive the M-Pesa STK Push request
                    </p>
                  </div>

                  <div>
                    <label className="block text-white font-semibold mb-2">WhatsApp Number</label>
                    <input
                      {...register('whatsappNumber')}
                      type="tel"
                      className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="254712345678 or 0712345678"
                    />
                    {errors.whatsappNumber && (
                      <p className="text-red-400 mt-1">{errors.whatsappNumber.message}</p>
                    )}
                    <p className="text-gray-400 text-sm mt-1">
                      You&apos;ll receive the WhatsApp group invite link on this number
                    </p>
                  </div>

                  <div>
                    <label className="block text-white font-semibold mb-2">Subscription Duration</label>
                    <select
                      {...register('months', { valueAsNumber: true })}
                      className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value={1}>1 Month - KES {monthlyPrice}</option>
                      <option value={2}>2 Months - KES {monthlyPrice * 2}</option>
                      <option value={3}>3 Months - KES {monthlyPrice * 3}</option>
                      <option value={6}>6 Months - KES {monthlyPrice * 6}</option>
                      <option value={12}>12 Months - KES {monthlyPrice * 12}</option>
                    </select>
                  </div>

                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                      <span className="text-gray-300 text-sm sm:text-base">Total Amount:</span>
                      <span className="text-xl sm:text-2xl font-bold text-white">KES {totalAmount}</span>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-900/50 border border-red-500 rounded-lg p-4">
                      <p className="text-red-200">{error}</p>
                    </div>
                  )}

                  {paymentStatus === 'checking' && (
                    <div className="bg-blue-900/50 border border-blue-500 rounded-lg p-4 flex items-center space-x-3">
                      <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                      <div>
                        <p className="text-blue-200 font-semibold">Payment in progress...</p>
                        <p className="text-blue-300 text-sm">
                          Please check your phone and complete the M-Pesa payment
                        </p>
                      </div>
                    </div>
                  )}

                  {paymentStatus === 'pending' && (
                    <div className="bg-yellow-900/50 border border-yellow-500 rounded-lg p-4 flex items-center space-x-3">
                      <Phone className="w-5 h-5 text-yellow-400" />
                      <div>
                        <p className="text-yellow-200 font-semibold">STK Push sent!</p>
                        <p className="text-yellow-300 text-sm">
                          Check your phone to complete the payment
                        </p>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || paymentStatus === 'checking'}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-8 py-4 rounded-lg text-lg font-semibold transition flex items-center justify-center space-x-2"
                  >
                    {isSubmitting || paymentStatus === 'checking' ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <span>Subscribe & Pay via M-Pesa</span>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Stream shoutout (separate checkout) */}
            <div className="bg-gray-800/95 rounded-lg p-4 sm:p-6 md:p-8 shadow-xl border border-cyan-500/25 ring-1 ring-cyan-500/10">
              <div className="flex items-center gap-2 mb-2">
                <Megaphone className="w-7 h-7 text-cyan-400 shrink-0" aria-hidden />
                <h2 className="text-xl sm:text-2xl font-bold text-white text-balance">
                  Shoutout
                </h2>
              </div>
              <p className="text-gray-400 mb-6 text-sm sm:text-base">
                One-time M-Pesa shoutout on the live stream (not a subscription). Stay within the limits below—a TikTok clip link raises the minimum.
              </p>

              {streamPaymentStatus === 'success' ? (
                <div className="text-center py-10">
                  <CheckCircle className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
                  <p className="text-white font-semibold text-lg mb-2">You&apos;re on stream!</p>
                  <p className="text-gray-400 text-sm mb-6">
                    The alert was triggered. You can send another shoutout anytime.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setStreamPaymentStatus('idle')
                      setStreamError(null)
                      setStreamPaymentId(null)
                    }}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2.5 rounded-lg font-semibold text-sm"
                  >
                    Send another
                  </button>
                </div>
              ) : streamPaymentStatus === 'failed' ? (
                <div className="text-center py-10">
                  <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                  <p className="text-gray-300 mb-4">{streamError || 'Payment did not complete.'}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setStreamPaymentStatus('idle')
                      setStreamError(null)
                      setStreamPaymentId(null)
                    }}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2.5 rounded-lg font-semibold text-sm"
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <form onSubmit={handleStreamSubmit(onStreamSubmit)} className="space-y-5">
                  <div>
                    <label className="block text-white font-semibold mb-2">Platform</label>
                    <select
                      {...registerStream('platform')}
                      className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 border border-cyan-500/20"
                    >
                      {STREAM_PLATFORM_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {streamErrors.platform && (
                      <p className="text-red-400 mt-1">{streamErrors.platform.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-white font-semibold mb-2">
                      Username / handle on stream
                    </label>
                    <input
                      {...registerStream('displayHandle')}
                      type="text"
                      className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="@yourhandle"
                    />
                    {streamErrors.displayHandle && (
                      <p className="text-red-400 mt-1">{streamErrors.displayHandle.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-white font-semibold mb-2">
                      Message <span className="text-gray-500 font-normal">(optional, max 100)</span>
                    </label>
                    <textarea
                      {...registerStream('message')}
                      rows={3}
                      maxLength={100}
                      className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-y min-h-[4.5rem]"
                      placeholder="Short line for the alert (optional)"
                    />
                    {streamErrors.message && (
                      <p className="text-red-400 mt-1">{streamErrors.message.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-white font-semibold mb-2">
                      Clip URL{' '}
                      <span className="text-gray-500 font-normal">
                        (optional — TikTok only)
                      </span>
                    </label>
                    <input
                      {...registerStream('videoUrl')}
                      type="url"
                      inputMode="url"
                      className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="https://www.tiktok.com/@user/video/…"
                    />
                    {streamErrors.videoUrl && (
                      <p className="text-red-400 mt-1">{streamErrors.videoUrl.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-white font-semibold mb-2">
                      Amount (KES){' '}
                      <span className="text-gray-500 font-normal">
                        (min {streamAmountMin}
                        {streamWantsVideo ? ' with clip' : ''}, max {streamLimits.maxKes})
                      </span>
                    </label>
                    <input
                      {...registerStream('amount', { valueAsNumber: true })}
                      type="number"
                      min={streamAmountMin}
                      max={streamLimits.maxKes}
                      step={1}
                      className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="10"
                    />
                    {streamErrors.amount && (
                      <p className="text-red-400 mt-1">{streamErrors.amount.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-white font-semibold mb-2">M-Pesa number</label>
                    <input
                      {...registerStream('mpesaMobile')}
                      type="tel"
                      className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="254712345678 or 0712345678"
                    />
                    {streamErrors.mpesaMobile && (
                      <p className="text-red-400 mt-1">{streamErrors.mpesaMobile.message}</p>
                    )}
                  </div>

                  <div className="bg-gray-700/80 rounded-lg p-4 border border-cyan-500/15">
                    <div className="flex justify-between items-center gap-3 flex-wrap">
                      <span className="text-gray-300 text-sm">You will pay</span>
                      <span className="text-xl font-bold text-cyan-300">
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
                    <div className="bg-red-900/40 border border-red-500/60 rounded-lg p-3">
                      <p className="text-red-200 text-sm">{streamError}</p>
                    </div>
                  )}

                  {streamPaymentStatus === 'checking' && (
                    <div className="bg-cyan-950/50 border border-cyan-500/40 rounded-lg p-4 flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-cyan-400 animate-spin shrink-0" />
                      <p className="text-cyan-100 text-sm">Waiting for M-Pesa confirmation…</p>
                    </div>
                  )}

                  {streamPaymentStatus === 'pending' && (
                    <div className="bg-amber-950/40 border border-amber-500/35 rounded-lg p-4 flex items-center gap-3">
                      <Phone className="w-5 h-5 text-amber-400 shrink-0" />
                      <p className="text-amber-100 text-sm">Complete the STK prompt on your phone.</p>
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
                    className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3.5 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                  >
                    {streamSubmitting || streamPaymentStatus === 'checking' ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing…
                      </>
                    ) : (
                      <>
                        <Megaphone className="w-5 h-5" />
                        Pay{' '}
                        {typeof streamAmountKes === 'number' && !Number.isNaN(streamAmountKes)
                          ? `KES ${streamAmountKes}`
                          : 'KES …'}{' '}
                        &amp; trigger alert
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="container mx-auto max-w-7xl px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] border-t border-gray-800">
        <div className="text-center text-gray-400">
          <p>&copy; 2024 GamerStream. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
