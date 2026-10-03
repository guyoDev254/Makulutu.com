'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, Suspense, useEffect, useState } from 'react'
import { AlertCircle, Loader2, Mail } from 'lucide-react'
import { fanAuthApi, setFanSession } from '@/lib/fan-auth'
import {
  AuthLoginShell,
  authInputClass,
  authLabelClass,
  authSubmitClass,
} from '@/components/auth/AuthLoginShell'

function FanVerifyInner() {
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

  useEffect(() => {
    if (emailFromQuery) setEmail(emailFromQuery)
  }, [emailFromQuery])

  const onVerify = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fanAuthApi.verifyEmailOtp(email.trim().toLowerCase(), code.trim())
      setFanSession(res)
      router.replace('/fan/account')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not verify')
    } finally {
      setLoading(false)
    }
  }

  const onResend = async () => {
    setResending(true)
    setError(null)
    try {
      await fanAuthApi.resendVerification(email.trim().toLowerCase())
      setInfo('A new code was sent.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not resend')
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthLoginShell
      title="Verify your email"
      subtitle="Use the same 6-digit code as the mobile app."
      footer={
        <p className="text-sm text-gray-400">
          <Link href="/fan/login" className="font-medium text-purple-300 hover:text-purple-200">
            Back to sign in
          </Link>
        </p>
      }
    >
      {error ? (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      ) : null}
      {info ? <p className="mb-4 text-sm text-gray-400">{info}</p> : null}
      <form onSubmit={onVerify} className="space-y-4">
        <div>
          <label className={authLabelClass}>Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              className={authInputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>
        <div>
          <label className={authLabelClass}>6-digit code</label>
          <input
            className="w-full rounded-lg border border-gray-600 bg-gray-700/50 px-4 py-3 text-center text-2xl tracking-[0.4em] text-white"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            maxLength={6}
            required
          />
        </div>
        <button type="submit" disabled={loading || code.length !== 6} className={authSubmitClass}>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verify'}
        </button>
        <button
          type="button"
          disabled={resending || !email}
          onClick={() => void onResend()}
          className="w-full text-sm text-purple-300 hover:text-purple-200 disabled:opacity-50"
        >
          {resending ? 'Sending…' : 'Resend code'}
        </button>
      </form>
    </AuthLoginShell>
  )
}

export default function FanVerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-canvas" />}>
      <FanVerifyInner />
    </Suspense>
  )
}
