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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (paymentId) {
      fetchSubscriptionDetails()
    } else {
      setLoading(false)
    }

    Swal.fire({
      icon: 'success',
      title: 'Payment Successful! 🎉',
      text: 'Your subscription has been activated successfully',
      confirmButtonColor: '#10b981',
      confirmButtonText: 'Great!',
      timer: 3000,
      timerProgressBar: true,
    })
  }, [paymentId])

  const fetchSubscriptionDetails = async () => {
    if (!paymentId) return
    try {
      const paymentRes = await api.get(`/payments/${paymentId}`)
      const payment = paymentRes.data
      if (payment.user?.id) {
        const subRes = await api.get(`/subscriptions/user/${payment.user.id}/active`)
        setSubscription(subRes.data)
      }
    } catch (error) {
      console.error('Error fetching subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
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
              Payment Successful! 🎉
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-300 px-1">
              Your subscription has been activated successfully
            </p>
          </div>

          {/* Subscription Details */}
          {subscription && (
            <div className="bg-gray-800 rounded-lg p-5 sm:p-8 mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">
                Subscription Details
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
              <li>🎮 Start enjoying exclusive eFootball content</li>
              <li>💬 Join our community discussions</li>
            </ul>
          </div> */}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Link
              href="/"
              className="flex-1 min-h-[44px] flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg text-center transition"
            >
              Back to Home
            </Link>
            <Link
              href="/subscribe"
              className="flex-1 min-h-[44px] flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg text-center transition"
            >
              Subscribe Again
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function SuccessPageFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
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
