'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'
import { AlertCircle, Loader2, Mail, User } from 'lucide-react'
import { fanAuthApi } from '@/lib/fan-auth'
import {
  isAdultDateOfBirth,
  maxAdultDateOfBirth,
  UNDERAGE_SIGNUP_MESSAGE,
} from '@/lib/date-of-birth'
import {
  AuthLoginShell,
  AuthPasswordInput,
  authInputClass,
  authInputPlainClass,
  authLabelClass,
  authSubmitClass,
} from '@/components/auth/AuthLoginShell'

export default function FanSignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const maxDob = maxAdultDateOfBirth()

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!isAdultDateOfBirth(dateOfBirth)) {
      setError(UNDERAGE_SIGNUP_MESSAGE)
      return
    }
    setLoading(true)
    setError(null)
    try {
      await fanAuthApi.signup({
        email: email.trim().toLowerCase(),
        password,
        name: name.trim() || undefined,
        dateOfBirth,
      })
      router.push(`/fan/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLoginShell
      title="Fan sign up"
      subtitle="Verify with the 6-digit code we email you. Then support streamers with M-Pesa from web or the app."
      footer={
        <p className="text-sm text-gray-400">
          Already have an account?{' '}
          <Link href="/fan/login" className="font-medium text-purple-300 hover:text-purple-200">
            Sign in
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
          <label className={authLabelClass}>Display name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input className={authInputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
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
              autoComplete="email"
            />
          </div>
        </div>
        <div>
          <label className={authLabelClass}>Password</label>
          <AuthPasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>
        <div>
          <label htmlFor="fan-signup-dob" className={authLabelClass}>
            Date of birth
          </label>
          <input
            id="fan-signup-dob"
            type="date"
            required
            max={maxDob}
            min="1900-01-01"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            className={authInputPlainClass}
          />
          <p className="mt-1.5 text-xs text-gray-500">You must be 18 or older.</p>
        </div>
        <label
          htmlFor="fan-signup-terms"
          className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-700/60 bg-gray-800/40 px-3 py-3 text-sm text-gray-300"
        >
          <input
            id="fan-signup-terms"
            type="checkbox"
            required
            className="mt-0.5 h-4 w-4 rounded border-gray-500 bg-gray-700 text-purple-500 focus:ring-purple-400"
          />
          <span>
            I agree to the{' '}
            <Link href="/terms" className="font-semibold text-purple-300 hover:text-purple-200">
              Terms of Service
            </Link>
            .
          </span>
        </label>
        <button type="submit" disabled={loading} className={authSubmitClass}>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Create account'}
        </button>
      </form>
    </AuthLoginShell>
  )
}
