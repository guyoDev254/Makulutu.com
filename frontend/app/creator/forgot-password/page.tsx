'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { Loader2, Mail, AlertCircle, CheckCircle2 } from 'lucide-react'
import { creatorAuthApi } from '@/lib/creator-auth'
import {
  AuthLoginShell,
  authInputClass,
  authLabelClass,
  authSubmitClass,
} from '@/components/auth/AuthLoginShell'

export default function CreatorForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await creatorAuthApi.forgotPassword(email.trim().toLowerCase())
      setSuccessMessage(res.message)
      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLoginShell
      title="Forgot password"
      subtitle="Enter the email on your creator account. If it exists and is verified, we will send a reset link."
      footer={
        <p className="text-sm text-gray-400">
          <Link href="/creator/login" className="text-purple-300 hover:text-purple-200 font-medium">
            Back to sign in
          </Link>
        </p>
      }
    >
      {error ? (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      ) : null}

      {done ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-emerald-300">
            <CheckCircle2 className="h-5 w-5" />
            <p className="text-sm">{successMessage}</p>
          </div>
          <Link
            href="/creator/login"
            className="inline-block px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm"
          >
            Return to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label htmlFor="forgot-email" className={authLabelClass}>
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="forgot-email"
                required
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={authInputClass}
              />
            </div>
          </div>
          <button type="submit" disabled={loading} className={authSubmitClass}>
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending…
              </>
            ) : (
              'Send reset link'
            )}
          </button>
        </form>
      )}
    </AuthLoginShell>
  )
}
