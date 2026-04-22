'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'
import { AlertCircle, Loader2, Lock, Mail, User } from 'lucide-react'
import { creatorAuthApi } from '@/lib/creator-auth'
import {
  AuthLoginShell,
  authInputClass,
  authInputPlainClass,
  authLabelClass,
  authSubmitClass,
} from '@/components/auth/AuthLoginShell'

export default function CreatorSignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    displayName: '',
    slug: '',
    email: '',
    password: '',
    bio: '',
    termsAccepted: false,
  })

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await creatorAuthApi.signup({
        displayName: form.displayName.trim(),
        slug: form.slug.trim().toLowerCase(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        bio: form.bio.trim() || undefined,
      })
      const email = encodeURIComponent(form.email.trim().toLowerCase())
      router.push(`/creator/login?verifyEmail=1&email=${email}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLoginShell
      maxWidth="lg"
      title="Create creator account"
      subtitle="This creates your streamer workspace. You can edit profile details later."
      footer={
        <p className="text-sm text-gray-400">
          Already have an account?{' '}
          <Link href="/creator/login" className="text-purple-300 hover:text-purple-200 font-medium">
            Sign in
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

      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label htmlFor="signup-display" className={authLabelClass}>
            Display name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="signup-display"
              required
              placeholder="How fans know you"
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              className={authInputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="signup-slug" className={authLabelClass}>
            Public URL slug
          </label>
          <div className="flex rounded-lg border border-gray-600 bg-gray-700/50 focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-transparent">
            <span className="flex items-center border-r border-gray-600 px-3 text-sm text-gray-400">
              /
            </span>
            <input
              id="signup-slug"
              required
              placeholder="yourname"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              className="min-w-0 flex-1 border-0 bg-transparent py-3 pr-4 text-white placeholder-gray-400 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="signup-email" className={authLabelClass}>
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="signup-email"
              required
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={authInputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="signup-password" className={authLabelClass}>
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="signup-password"
              required
              type="password"
              minLength={6}
              placeholder="At least 6 characters"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className={authInputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="signup-bio" className={authLabelClass}>
            Bio (optional)
          </label>
          <textarea
            id="signup-bio"
            placeholder="Short intro for your public page"
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            className={authInputPlainClass}
            rows={3}
            maxLength={300}
          />
        </div>

        <label
          htmlFor="signup-terms"
          className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-700/60 bg-gray-800/40 px-3 py-3 text-sm text-gray-300"
        >
          <input
            id="signup-terms"
            type="checkbox"
            required
            checked={form.termsAccepted}
            onChange={(e) => setForm((f) => ({ ...f, termsAccepted: e.target.checked }))}
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

        <button
          type="submit"
          disabled={loading || !form.termsAccepted}
          className={authSubmitClass}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating account...
            </>
          ) : (
            'Create account'
          )}
        </button>
      </form>
    </AuthLoginShell>
  )
}
