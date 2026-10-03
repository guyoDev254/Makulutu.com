'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, Suspense, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, Mail } from 'lucide-react'
import { creatorAuthApi } from '@/lib/creator-auth'
import {
  AuthLoginShell,
  authInputClass,
  authInputPlainClass,
  authLabelClass,
  authSubmitClass,
} from '@/components/auth/AuthLoginShell'

function VerifyEmailPageInner() {
  const router = useRouter()
  const params = useSearchParams()
  const emailFromQuery = (params.get('email') || '').trim().toLowerCase()
  const [email, setEmail] = useState(emailFromQuery)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(
    emailFromQuery
      ? `Enter the 6-digit code we sent to ${emailFromQuery}.`
      : 'Enter your email and the 6-digit code from your inbox.',
  )
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (emailFromQuery) setEmail(emailFromQuery)
  }, [emailFromQuery])

  const onVerify = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await creatorAuthApi.verifyEmailOtp(email.trim().toLowerCase(), code.trim())
      setDone(true)
      setInfo(res.message || 'Email verified. You can sign in.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed.')
    } finally {
      setLoading(false)
    }
  }

  const onResend = async () => {
    if (!email.includes('@')) {
      setError('Enter the email you used to sign up.')
      return
    }
    setResending(true)
    setError(null)
    try {
      const res = await creatorAuthApi.resendVerification(email.trim().toLowerCase())
      setInfo(res.message)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not resend the code.')
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthLoginShell
      title="Verify your email"
      subtitle="We sent a 6-digit code to confirm your streamer account."
    >
      {error ? (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      ) : null}
      {info ? (
        <div className="mb-6 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
          <p className="text-sm text-blue-300">{info}</p>
        </div>
      ) : null}

      {done ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-emerald-300">
            <CheckCircle2 className="h-5 w-5" />
            <p>You can sign in with your password now.</p>
          </div>
          <button
            type="button"
            className={authSubmitClass}
            onClick={() => router.push('/creator/login')}
          >
            Continue to sign in
          </button>
        </div>
      ) : (
        <form onSubmit={onVerify} className="space-y-5">
          <div>
            <label htmlFor="verify-email" className={authLabelClass}>
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                id="verify-email"
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={authInputClass}
              />
            </div>
          </div>
          <div>
            <label htmlFor="verify-code" className={authLabelClass}>
              6-digit code
            </label>
            <input
              id="verify-code"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className={authInputPlainClass}
            />
          </div>
          <button type="submit" disabled={loading || code.length !== 6} className={authSubmitClass}>
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify email'
            )}
          </button>
          <button
            type="button"
            onClick={() => void onResend()}
            disabled={resending}
            className="w-full text-center text-sm font-medium text-purple-300 hover:text-purple-200"
          >
            {resending ? 'Sending…' : 'Resend code'}
          </button>
          <p className="text-center text-sm text-gray-400">
            <Link href="/creator/login" className="text-purple-300 hover:text-purple-200">
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </AuthLoginShell>
  )
}

function VerifyEmailPageFallback() {
  return (
    <AuthLoginShell title="Verify your email" subtitle="Loading…">
      <div className="flex justify-center py-8 text-sm text-gray-400">Loading…</div>
    </AuthLoginShell>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailPageFallback />}>
      <VerifyEmailPageInner />
    </Suspense>
  )
}
