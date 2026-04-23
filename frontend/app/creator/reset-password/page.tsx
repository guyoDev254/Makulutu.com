'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { FormEvent, Suspense, useState } from 'react'
import { Loader2, Lock, AlertCircle, CheckCircle2 } from 'lucide-react'
import { creatorAuthApi } from '@/lib/creator-auth'
import {
  AuthLoginShell,
  authInputClass,
  authLabelClass,
  authSubmitClass,
} from '@/components/auth/AuthLoginShell'

function CreatorResetPasswordPageInner() {
  const params = useSearchParams()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!token.trim()) {
      setError('Missing reset token. Open the link from your email.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const res = await creatorAuthApi.resetPassword({ token: token.trim(), password })
      setSuccessMessage(res.message)
      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Reset failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLoginShell
      title="Set a new password"
      subtitle="Choose a new password for your creator account."
      footer={
        <p className="text-sm text-gray-400">
          <Link href="/creator/login" className="text-purple-300 hover:text-purple-200 font-medium">
            Back to sign in
          </Link>
        </p>
      }
    >
      {!token.trim() ? (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm">
            This page needs a valid link from your reset email. Request a new link from the forgot
            password page.
          </p>
          <Link
            href="/creator/forgot-password"
            className="inline-block mt-4 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm"
          >
            Forgot password
          </Link>
        </div>
      ) : done ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-emerald-300">
            <CheckCircle2 className="h-5 w-5" />
            <p className="text-sm">{successMessage}</p>
          </div>
          <Link
            href="/creator/login"
            className="inline-block px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm"
          >
            Sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-6">
          {error ? (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          ) : null}
          <div>
            <label htmlFor="reset-password" className={authLabelClass}>
              New password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="reset-password"
                required
                type="password"
                autoComplete="new-password"
                minLength={6}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={authInputClass}
              />
            </div>
          </div>
          <div>
            <label htmlFor="reset-password-confirm" className={authLabelClass}>
              Confirm password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="reset-password-confirm"
                required
                type="password"
                autoComplete="new-password"
                minLength={6}
                placeholder="Repeat password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={authInputClass}
              />
            </div>
          </div>
          <button type="submit" disabled={loading} className={authSubmitClass}>
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Updating…
              </>
            ) : (
              'Update password'
            )}
          </button>
        </form>
      )}
    </AuthLoginShell>
  )
}

function CreatorResetPasswordPageFallback() {
  return (
    <AuthLoginShell title="Set a new password" subtitle="Loading…">
      <div className="flex justify-center py-8 text-sm text-gray-400">Loading…</div>
    </AuthLoginShell>
  )
}

export default function CreatorResetPasswordPage() {
  return (
    <Suspense fallback={<CreatorResetPasswordPageFallback />}>
      <CreatorResetPasswordPageInner />
    </Suspense>
  )
}
