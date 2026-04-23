'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { creatorAuthApi } from '@/lib/creator-auth'
import { AuthLoginShell } from '@/components/auth/AuthLoginShell'

function VerifyEmailPageInner() {
  const params = useSearchParams()
  const token = params.get('token') || ''
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [message, setMessage] = useState('Verifying your email...')

  useEffect(() => {
    let mounted = true
    const run = async () => {
      if (!token) {
        if (!mounted) return
        setState('error')
        setMessage('Missing verification token in the link.')
        return
      }
      try {
        const res = await creatorAuthApi.verifyEmail(token)
        if (!mounted) return
        setState('ok')
        setMessage(res.message || 'Email verified successfully.')
      } catch (e: unknown) {
        if (!mounted) return
        setState('error')
        setMessage(e instanceof Error ? e.message : 'Verification failed.')
      }
    }
    void run()
    return () => {
      mounted = false
    }
  }, [token])

  return (
    <AuthLoginShell
      title="Email verification"
      subtitle="We are confirming your creator account."
    >
      <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-5">
        {state === 'loading' ? (
          <div className="flex items-center gap-3 text-gray-300">
            <Loader2 className="h-5 w-5 animate-spin text-purple-300" />
            <p>{message}</p>
          </div>
        ) : state === 'ok' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-emerald-300">
              <CheckCircle2 className="h-5 w-5" />
              <p>{message}</p>
            </div>
            <Link
              href="/creator/login"
              className="inline-block px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white"
            >
              Continue to sign in
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-red-300">
              <AlertCircle className="h-5 w-5" />
              <p>{message}</p>
            </div>
            <Link
              href="/creator/login"
              className="inline-block px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white"
            >
              Back to login
            </Link>
          </div>
        )}
      </div>
    </AuthLoginShell>
  )
}

function VerifyEmailPageFallback() {
  return (
    <AuthLoginShell title="Email verification" subtitle="Loading…">
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
