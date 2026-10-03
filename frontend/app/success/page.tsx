'use client'

import { Suspense, useEffect, useState } from 'react'
import { CheckCircle, Calendar, CreditCard, Users } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Swal from 'sweetalert2'
import api from '@/lib/api'
import { SiteNav } from '@/components/SiteNav'

function SuccessContent() {
  const searchParams = useSearchParams()
  const paymentId = searchParams.get('paymentId')
  const [subscription, setSubscription] = useState<any>(null)
  const [payment, setPayment] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const searchKey = searchParams.toString()

  useEffect(() => {
    let cancelled = false
    const pid = searchParams.get('paymentId')
    const paypalReturn = searchParams.get('paypal_return')
    const paypalOrderId = searchParams.get('token')

    ;(async () => {
      setLoadError(null)
      if (!pid) {
        setLoading(false)
        return
      }
      try {
        if (paypalReturn === '1' && paypalOrderId) {
          await api.post('/payments/paypal/capture', { orderId: paypalOrderId })
        }
        const paystackReturn = searchParams.get('paystack')
        const paystackRef =
          searchParams.get('trxref') || searchParams.get('reference') || pid
        if (paystackReturn === '1' && paystackRef) {
          const verified = await api.post('/payments/paystack/verify', {
            reference: paystackRef,
          })
          console.info('[Paystack test] verify', {
            reference: paystackRef,
            paymentId: pid,
            status: verified.data?.status,
            amountKes: verified.data?.amountKes ?? verified.data?.amount,
            purpose: verified.data?.purpose,
          })
        }
        await api.get(`/payments/${pid}/status`)
        const paymentRes = await api.get(`/payments/${pid}`)
        const pay = paymentRes.data
        console.info('[Paystack test] payment loaded', {
          id: pay?.id,
          status: pay?.status,
          amountKes: pay?.amountKes ?? pay?.amount,
        })
        if (cancelled) return
        setPayment(pay)
        const purpose = String(pay?.purpose || 'SUBSCRIPTION').toUpperCase()
        const isMembership = purpose === 'SUBSCRIPTION' || purpose === 'NULL' || !pay?.purpose
        if (isMembership && pay?.membership) {
          setSubscription(pay.membership)
        }
        if (!cancelled) {
          const thanks =
            (typeof pay?.thankYouMessage === 'string' && pay.thankYouMessage.trim()) ||
            (typeof pay?.creator?.thankYouMessage === 'string' &&
              pay.creator.thankYouMessage.trim()) ||
            (typeof pay?.creator?.fanThankYouMessage === 'string' &&
              pay.creator.fanThankYouMessage.trim()) ||
            ''
          await Swal.fire({
            icon: 'success',
            title: 'Payment completed',
            text: thanks || (isMembership ? 'Your membership is now active.' : 'Thank you for supporting this creator.'),
            confirmButtonColor: '#10b981',
            confirmButtonText: 'Great!',
            timer: 3000,
            timerProgressBar: true,
          })
        }
      } catch (error) {
        console.error('[Paystack test] confirm failed', {
          paymentId: pid,
          paystack: searchParams.get('paystack'),
          trxref: searchParams.get('trxref'),
          reference: searchParams.get('reference'),
          message: (error as { response?: { data?: { message?: string } } })
            ?.response?.data?.message,
          status: (error as { response?: { status?: number } })?.response?.status,
          data: (error as { response?: { data?: unknown } })?.response?.data,
        })
        const msg =
          (error as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || 'Something went wrong loading your subscription.'
        if (!cancelled) {
          setLoadError(msg)
          await Swal.fire({
            icon: 'error',
            title: 'Could not confirm payment',
            text: msg,
            confirmButtonColor: '#dc2626',
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [searchKey])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (loadError && paymentId) {
    return (
      <div className="min-h-screen bg-canvas">
        <SiteNav />
        <div className="container mx-auto max-w-7xl px-4 py-10 sm:py-14 md:py-16 pb-[max(2rem,env(safe-area-inset-bottom))]">
          <div className="max-w-2xl mx-auto w-full min-w-0 text-center">
            <h1 className="text-2xl font-bold text-white mb-3">Payment status unclear</h1>
            <p className="text-gray-300 mb-8">{loadError}</p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Link
                href="/support"
                className="btn-primary min-h-[44px] px-6 py-3"
              >
                Back to join
              </Link>
              <Link
                href="/"
                className="btn-secondary min-h-[44px] px-6 py-3"
              >
                Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-canvas">
      <SiteNav />
      <div className="container mx-auto max-w-7xl px-4 py-10 sm:py-14 md:py-16 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="max-w-2xl mx-auto w-full min-w-0">
          {/* Success Icon */}
          <div className="flex justify-center mb-6 sm:mb-8">
            <div className="bg-green-500 rounded-full p-4 sm:p-6">
              <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
            </div>
          </div>

          {/* Success Message */}
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4 text-balance px-1">
              Payment completed
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-300 px-1">
              {payment?.thankYouMessage ||
                payment?.creator?.thankYouMessage ||
                payment?.creator?.fanThankYouMessage ||
                (subscription
                  ? 'Your membership is active. Check WhatsApp for the group link if it has not arrived yet.'
                  : 'Thank you for supporting this creator.')}
            </p>
            {payment?.amountKes != null || payment?.amount != null ? (
              <p className="mt-3 text-sm text-emerald-300">
                KES {Number(payment.amountKes ?? payment.amount).toLocaleString()}
                {payment?.creator?.displayName ? ` · ${payment.creator.displayName}` : ''}
              </p>
            ) : null}
          </div>

          {/* Subscription Details */}
          {subscription && (
            <div className="surface-card mb-6 p-5 sm:mb-8 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">
                Membership details
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Calendar className="w-6 h-6 text-purple-400" />
                  <div>
                    <p className="text-gray-400 text-sm">Start Date</p>
                    <p className="text-white font-semibold">
                      {new Date(subscription.startDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <Calendar className="w-6 h-6 text-purple-400" />
                  <div>
                    <p className="text-gray-400 text-sm">End Date</p>
                    <p className="text-white font-semibold">
                      {new Date(subscription.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <CreditCard className="w-6 h-6 text-purple-400" />
                  <div>
                    <p className="text-gray-400 text-sm">Status</p>
                    <p className="text-green-400 font-semibold uppercase">
                      {subscription.status}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <Users className="w-6 h-6 text-purple-400" />
                  <div>
                    <p className="text-gray-400 text-sm">Duration</p>
                    <p className="text-white font-semibold">
                      {subscription.months} {subscription.months === 1 ? 'Month' : 'Months'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Next Steps */}
          {/* <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-bold text-white mb-4">What's Next?</h3>
            <ul className="space-y-2 text-gray-300">
              <li>✅ Your subscription is now active</li>
              <li>📱 Check your WhatsApp for the group invite link</li>
              <li>🎮 Member streams and eFootball content</li>
              <li>💬 Join our community discussions</li>
            </ul>
          </div> */}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Link
              href="/"
              className="btn-primary flex-1 min-h-[44px] px-6 py-3"
            >
              Back to Home
            </Link>
            <Link
              href="/support"
              className="btn-secondary flex-1 min-h-[44px] px-6 py-3"
            >
              More options
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function SuccessPageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="text-white">Loading...</div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<SuccessPageFallback />}>
      <SuccessContent />
    </Suspense>
  )
}
