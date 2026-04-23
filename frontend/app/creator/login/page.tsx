'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, Suspense, useEffect, useState } from 'react'
import { Lock, User, Loader2, AlertCircle } from 'lucide-react'
import { creatorAuthApi, setCreatorSession } from '@/lib/creator-auth'
import {
  AuthLoginShell,
  authInputClass,
  authLabelClass,
  authSubmitClass,
} from '@/components/auth/AuthLoginShell'

function CreatorLoginPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (searchParams.get('verifyEmail') === '1') {
      const email = searchParams.get('email') || 'your email'
      setInfo(`Account created. A verification link was sent to ${email}.`)
    }
  }, [searchParams])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setInfo(null)
    try {
      const res = await creatorAuthApi.login({
        identifier: identifier.trim(),
        password,
      })
      setCreatorSession(res)
      router.push(
        res.creator.onboardingComplete ? '/creator/workspace' : '/creator/dashboard',
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not sign in'
      setError(msg)
      if (/verify your email/i.test(msg) && identifier.includes('@')) {
        try {
          const res = await creatorAuthApi.resendVerification(identifier.trim())
          setInfo(res.message)
        } catch {
          /* keep primary error */
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLoginShell
      title="Creator sign in"
      subtitle="Sign in with your creator email or public page slug. Revenue, tiers, and OBS tools live in your workspace after onboarding."
      footer={
        <p className="text-sm text-gray-400">
          No account yet?{' '}
          <Link href="/creator/signup" className="text-purple-300 hover:text-purple-200 font-medium">
            Create one
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
      {info ? (
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-blue-300 text-sm">{info}</p>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <label htmlFor="creator-identifier" className={authLabelClass}>
            Email or public slug
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="creator-identifier"
              required
              type="text"
              name="identifier"
              autoComplete="username"
              inputMode="email"
              placeholder="you@email.com or yourname"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className={authInputClass}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="creator-password" className={authLabelClass}>
              Password
            </label>
            <Link
              href="/creator/forgot-password"
              className="text-xs text-purple-300 hover:text-purple-200 font-medium shrink-0"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="creator-password"
              required
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={authInputClass}
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className={authSubmitClass}>
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign in'
          )}
        </button>
      </form>
    </AuthLoginShell>
  )
}

function CreatorLoginPageFallback() {
  return (
    <AuthLoginShell title="Creator sign in" subtitle="Loading…">
      <div className="flex justify-center py-8 text-sm text-gray-400">Loading…</div>
    </AuthLoginShell>
  )
}

export default function CreatorLoginPage() {
  return (
    <Suspense fallback={<CreatorLoginPageFallback />}>
      <CreatorLoginPageInner />
    </Suspense>
  )
}
