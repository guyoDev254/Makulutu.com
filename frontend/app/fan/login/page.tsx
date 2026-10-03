'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'
import { AlertCircle, Loader2, User } from 'lucide-react'
import { fanAuthApi, setFanSession } from '@/lib/fan-auth'
import {
  AuthLoginShell,
  AuthPasswordInput,
  authInputClass,
  authLabelClass,
  authSubmitClass,
} from '@/components/auth/AuthLoginShell'

export default function FanLoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fanAuthApi.login({
        identifier: identifier.trim(),
        password,
      })
      setFanSession(res)
      router.push('/fan/account')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not sign in'
      setError(msg)
      if (/verify your email/i.test(msg) && identifier.includes('@')) {
        router.push(`/fan/verify-email?email=${encodeURIComponent(identifier.trim().toLowerCase())}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLoginShell
      title="Fan sign in"
      subtitle="Same account as the mobile app. Memberships, inbox, and payments come from the API."
      footer={
        <p className="text-sm text-gray-400">
          New here?{' '}
          <Link href="/fan/signup" className="font-medium text-purple-300 hover:text-purple-200">
            Create a fan account
          </Link>
          <span className="mx-2 text-gray-600">·</span>
          <Link href="/creator/login" className="font-medium text-purple-300 hover:text-purple-200">
            Streamer login
          </Link>
        </p>
      }
    >
      {error ? (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      ) : null}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className={authLabelClass}>Email or phone</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              className={authInputClass}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
        </div>
        <div>
          <label className={authLabelClass}>Password</label>
          <AuthPasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            minLength={6}
          />
        </div>
        <button type="submit" disabled={loading} className={authSubmitClass}>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign in'}
        </button>
      </form>
    </AuthLoginShell>
  )
}
