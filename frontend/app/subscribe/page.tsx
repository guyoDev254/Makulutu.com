'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { CheckCircle, XCircle, Loader2, Phone } from 'lucide-react'
import Swal from 'sweetalert2'
import { subscriptionApi, RegisterSubscriptionDto } from '@/lib/api'

const subscriptionSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  tiktokUsername: z.string().min(1, 'TikTok username is required'),
  mpesaMobile: z.string().regex(/^(254|0)[0-9]{9}$/, 'Invalid phone number format'),
  whatsappNumber: z.string().regex(/^(254|0)[0-9]{9}$/, 'Invalid phone number format'),
  months: z.number().min(1).max(12),
  monthlyPrice: z.number().optional(),
})

type SubscriptionFormData = z.infer<typeof subscriptionSchema>

export default function Subscribe() {
  const [monthlyPrice, setMonthlyPrice] = useState<number>(1) // KES per month
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'checking' | 'success' | 'failed'>('idle')
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  const months = watch('months')
  const totalAmount = months * monthlyPrice

  // Fetch monthly price from API
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await subscriptionApi.getMonthlyPrice()
        const price = response.monthlyPrice || 1
        setMonthlyPrice(price)
        // Update form default value
        reset({
          months: 1,
          monthlyPrice: price,
        })
      } catch (error) {
        console.error('Failed to fetch monthly price, using default:', error)
        // Keep default value of 1
      }
    }
    fetchPrice()
  }, [reset])

  const onSubmit = async (data: SubscriptionFormData) => {
    setIsSubmitting(true)
    setError(null)
    setPaymentStatus('pending')

    try {
      const response = await subscriptionApi.register({
        ...data,
        monthlyPrice: monthlyPrice,
      })

      setPaymentId(response.payment.id)
      setPaymentStatus('checking')

      // Show success alert for STK Push initiation
      Swal.fire({
        icon: 'info',
        title: 'STK Push Sent!',
        text: 'Please check your phone and complete the M-Pesa payment',
        confirmButtonColor: '#9333ea',
        confirmButtonText: 'OK',
        timer: 5000,
        timerProgressBar: true,
      })

      // Poll for payment status
      pollPaymentStatus(response.payment.id)
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to initiate payment. Please try again.'
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

  const pollPaymentStatus = async (id: string) => {
    const maxAttempts = 30 // Poll for 5 minutes (10 seconds * 30)
    let attempts = 0

    const interval = setInterval(async () => {
      attempts++

      try {
        const payment = await subscriptionApi.checkPaymentStatus(id)
        
        // Handle both uppercase (from Prisma) and lowercase status values
        const status = payment.status?.toLowerCase() || payment.status

        if (status === 'completed' || status === 'COMPLETED') {
          clearInterval(interval)
          setPaymentStatus('success')
          setIsSubmitting(false)
          
          // Show success alert
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
    }, 10000) // Check every 10 seconds
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-white">GamerStream</Link>
          <div className="space-x-6">
            <Link href="/" className="text-white hover:text-purple-300">Home</Link>
            <Link href="/about" className="text-white hover:text-purple-300">About</Link>
            <Link href="/subscribe" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg">
              Subscribe
            </Link>
          </div>
        </div>
      </nav>

      {/* Subscription Form */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gray-800 rounded-lg p-8 shadow-xl">
            <h1 className="text-4xl font-bold text-white mb-2">Subscribe Now</h1>
            <p className="text-gray-400 mb-8">
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
                    You'll receive the WhatsApp group invite link on this number
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
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Total Amount:</span>
                    <span className="text-2xl font-bold text-white">KES {totalAmount}</span>
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
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-gray-800">
        <div className="text-center text-gray-400">
          <p>&copy; 2024 GamerStream. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
