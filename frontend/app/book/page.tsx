'use client'

import axios from 'axios'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Swal from 'sweetalert2'
import { ArrowLeft, CalendarCheck, ClipboardList, Loader2, Phone, TrendingUp } from 'lucide-react'
import { SiteNav } from '@/components/SiteNav'
import {
  API_BASE_URL,
  apiNetworkErrorHint,
  formatApiErrorMessage,
  isFetchNetworkError,
} from '@/lib/api-origin'
import { coachingBookingApi, subscriptionApi } from '@/lib/api'
import { SITE_NAME, SITE_NAME_CLASS } from '@/lib/site-brand'

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const bookingSchema = z
  .object({
    service: z.enum(['account_review', 'rank_push', 'both']),
    name: z.string().min(2, 'Enter your name').max(80),
    contact: z.string().min(3, 'How should we reach you?').max(120),
    mpesaMobile: z.string().optional(),
    accountUsername: z.string().max(120).optional(),
    availability: z.string().max(500).optional(),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    const paid = data.service === 'account_review' || data.service === 'both'
    if (!paid) return
    const phone = (data.mpesaMobile || '').replace(/\s/g, '')
    if (!/^(254|0)[0-9]{9}$/.test(phone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter a valid M-Pesa number (254XXXXXXXXX or 0XXXXXXXXX)',
        path: ['mpesaMobile'],
      })
    }
    const acct = (data.accountUsername || '').trim()
    if (acct.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter the game account username to review',
        path: ['accountUsername'],
      })
    }
  })

type BookingForm = z.infer<typeof bookingSchema>
type PublicCreator = {
  slug: string
  displayName: string
  bio: string | null
  avatarUrl: string | null
  primaryCategory: string | null
}

function pollBookingPaymentStatus(paymentId: string, accountUsername: string) {
  const maxAttempts = 30
  let attempts = 0

  const interval = setInterval(async () => {
    attempts += 1
    try {
      const payment = await subscriptionApi.checkPaymentStatus(paymentId)
      const status = payment.status?.toLowerCase() || payment.status

      if (status === 'completed' || status === 'COMPLETED') {
        clearInterval(interval)
        const safeAcct = accountUsername.replace(/</g, '&lt;').replace(/>/g, '&gt;')
        await Swal.fire({
          icon: 'success',
          title: 'Booking confirmed',
          html: `<p class="text-sm">Payment received. <span style="font-family: var(--font-bungee), cursive, sans-serif">${escapeHtml(
            SITE_NAME,
          )}</span> will route this to the creator, who will contact you using the details you provided.</p><p class="text-sm text-gray-600 mt-3">Game account for review: <strong>${safeAcct}</strong></p>`,
          confirmButtonColor: '#7c3aed',
        })
      } else if (status === 'failed' || status === 'FAILED') {
        clearInterval(interval)
        await Swal.fire({
          icon: 'error',
          title: 'Payment failed',
          text: 'Payment was cancelled or failed. Your booking was not confirmed.',
          confirmButtonColor: '#dc2626',
        })
      } else if (attempts >= maxAttempts) {
        clearInterval(interval)
        await Swal.fire({
          icon: 'warning',
          title: 'Payment still pending',
          text: 'If you completed M-Pesa, we will still process your booking. Otherwise try again.',
          confirmButtonColor: '#f59e0b',
        })
      }
    } catch {
      if (attempts >= maxAttempts) clearInterval(interval)
    }
  }, 10_000)
}

export default function BookPage() {
  const [accountReviewKes, setAccountReviewKes] = useState(100)
  const [creatorSlug, setCreatorSlug] = useState<string | undefined>(undefined)
  const [creatorProfile, setCreatorProfile] = useState<PublicCreator | null>(null)
  const [creatorScopeLoading, setCreatorScopeLoading] = useState(false)
  const [creatorScopeError, setCreatorScopeError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const qsSlug = new URLSearchParams(window.location.search).get('creatorSlug')
    const normalized = qsSlug?.trim().toLowerCase()
    if (normalized && /^[a-z0-9-]{3,64}$/.test(normalized)) {
      setCreatorSlug(normalized)
      return
    }
    setCreatorSlug(undefined)
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!creatorSlug) {
      setCreatorProfile(null)
      setCreatorScopeError(null)
      setCreatorScopeLoading(false)
      return
    }
    setCreatorScopeLoading(true)
    setCreatorScopeError(null)
    void fetch(`${API_BASE_URL}/creator-auth/public/${encodeURIComponent(creatorSlug)}`, {
      cache: 'no-store',
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Creator page not found or unavailable')
        }
        const data = (await res.json()) as PublicCreator
        if (!cancelled) setCreatorProfile(data)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setCreatorProfile(null)
        setCreatorScopeError(err instanceof Error ? err.message : 'Creator unavailable')
      })
      .finally(() => {
        if (!cancelled) setCreatorScopeLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [creatorSlug])

  useEffect(() => {
    let cancelled = false
    void coachingBookingApi
      .getPricing(creatorSlug)
      .then((r) => {
        if (cancelled) return
        const n = Number(r.accountReviewKes)
        if (Number.isFinite(n) && n >= 1) setAccountReviewKes(Math.round(n))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [creatorSlug])

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      service: 'account_review',
      availability: '',
      notes: '',
      mpesaMobile: '',
      accountUsername: '',
    },
  })

  const service = watch('service')
  const needsPay = service === 'account_review' || service === 'both'
  const creatorScopeBlocked = !!creatorSlug && !!creatorScopeError

  const onSubmit = async (data: BookingForm) => {
    if (creatorScopeBlocked) {
      await Swal.fire({
        icon: 'error',
        title: 'Creator unavailable',
        text: 'This creator booking page is unavailable right now. Please verify the link and try again.',
        confirmButtonColor: '#7c3aed',
      })
      return
    }
    const paid = data.service === 'account_review' || data.service === 'both'

    if (paid) {
      const mpesa = data.mpesaMobile!.replace(/\s/g, '')
      const acct = data.accountUsername!.trim()
      try {
        const res = await coachingBookingApi.checkout({
          service: data.service === 'both' ? 'both' : 'account_review',
          name: data.name.trim(),
          contact: data.contact.trim(),
          mpesaMobile: mpesa,
          accountUsername: acct,
          ...(creatorSlug ? { creatorSlug } : {}),
          ...(data.availability?.trim()
            ? { availability: data.availability.trim() }
            : {}),
          ...(data.notes?.trim() ? { notes: data.notes.trim() } : {}),
        })
        const stkKes =
          res.payment?.amount != null ? Number(res.payment.amount) : accountReviewKes
        const kesLabel = Number.isFinite(stkKes) ? Math.round(stkKes) : accountReviewKes
        await Swal.fire({
          icon: 'info',
          title: 'M-Pesa prompt sent',
          html: `<p class="text-sm">Complete the <strong>KES ${kesLabel}</strong> payment on your phone to confirm your booking.</p>`,
          confirmButtonColor: '#7c3aed',
          timer: 6000,
          timerProgressBar: true,
        })
        pollBookingPaymentStatus(res.payment.id, acct)
        reset({
          service: 'account_review',
          name: '',
          contact: '',
          availability: '',
          notes: '',
          mpesaMobile: '',
          accountUsername: '',
        })
      } catch (err: unknown) {
        const text = isFetchNetworkError(err)
          ? apiNetworkErrorHint()
          : axios.isAxiosError(err)
            ? formatApiErrorMessage(err.response?.data)
            : err instanceof Error
              ? err.message
              : 'Please try again in a moment.'
        await Swal.fire({
          icon: 'error',
          title: 'Could not start payment',
          text,
          confirmButtonColor: '#7c3aed',
        })
      }
      return
    }

    const payload = {
      service: data.service,
      name: data.name.trim(),
      contact: data.contact.trim(),
      ...(creatorSlug ? { creatorSlug } : {}),
      ...(data.availability?.trim()
        ? { availability: data.availability.trim() }
        : {}),
      ...(data.notes?.trim() ? { notes: data.notes.trim() } : {}),
    }
    try {
      const res = await fetch(`${API_BASE_URL}/coaching-bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(formatApiErrorMessage(body))
      }
    } catch (err: unknown) {
      await Swal.fire({
        icon: 'error',
        title: 'Could not save booking',
        text: isFetchNetworkError(err)
          ? apiNetworkErrorHint()
          : err instanceof Error
            ? err.message
            : 'Please try again in a moment.',
        confirmButtonColor: '#7c3aed',
      })
      return
    }

    await Swal.fire({
      icon: 'success',
      title: 'Request received',
      html: `<p class="text-sm">Thank you. The creator (or their team) will contact you using the details you provided.</p><p class="text-sm text-gray-600 mt-3">If you do not hear back within a reasonable time, send a follow-up on the same channel.</p>`,
      confirmButtonColor: '#7c3aed',
    })
    reset({
      service: 'account_review',
      name: '',
      contact: '',
      availability: '',
      notes: '',
      mpesaMobile: '',
      accountUsername: '',
    })
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0a0a0f] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute top-0 right-0 h-72 w-72 rounded-full bg-emerald-600/15 blur-[90px]" />
        <div className="absolute bottom-1/4 -left-20 h-64 w-64 rounded-full bg-violet-600/20 blur-[80px]" />
      </div>

      <div className="relative z-10">
        <SiteNav />

        <main className="container mx-auto max-w-3xl px-4 pb-20 pt-4 sm:pt-6">
          

          <header className="mb-10 text-center sm:text-left">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-200/90">
              <CalendarCheck className="h-3.5 w-3.5" aria-hidden />
              Book a session
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl md:text-5xl">
              Account review &amp; rank push
            </h1>
            <p className="mt-4 text-gray-400 text-pretty sm:text-lg">
              Submit the form for account review or rank push. The creator you book with will follow up using the contact
              details you provide.
            </p>
            {creatorSlug && (
              <div className="mt-5 rounded-xl border border-violet-500/25 bg-violet-500/10 px-4 py-3 text-left">
                {creatorScopeLoading ? (
                  <p className="text-sm text-violet-200/90">Loading creator profile…</p>
                ) : creatorProfile ? (
                  <p className="text-sm text-violet-100">
                    Booking with <strong>{creatorProfile.displayName}</strong>
                    {creatorProfile.primaryCategory
                      ? ` · ${creatorProfile.primaryCategory}`
                      : ''}
                  </p>
                ) : (
                  <p className="text-sm text-rose-300">
                    {creatorScopeError || 'Creator page not found or unavailable.'}
                  </p>
                )}
              </div>
            )}
          </header>

          <div className="mb-10 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
                <ClipboardList className="h-5 w-5" aria-hidden />
              </div>
              <h2 className="mt-3 font-semibold text-white">Account review</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">
                Squad, tactics, and settings looked over with clear fixes—so you know what to change
                and why.
              </p>
              <p className="mt-3 text-sm font-medium text-emerald-300/95">
                KES {accountReviewKes} via M-Pesa when you book (account review or both).
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                <TrendingUp className="h-5 w-5" aria-hidden />
              </div>
              <h2 className="mt-3 font-semibold text-white">Rank push</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">
                Focused plan to climb divisions—playstyle tweaks, matchups, and consistency on the
                ladder.
              </p>
              <p className="mt-3 text-sm text-gray-500">No payment on this form for rank push only.</p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-8"
          >
            <fieldset>
              <legend className="text-sm font-semibold text-white">What do you need?</legend>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {(
                  [
                    ['account_review', 'Account review'],
                    ['rank_push', 'Rank push'],
                    ['both', 'Both'],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition sm:min-w-[10rem] ${
                      service === value
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-white'
                        : 'border-white/10 bg-black/20 text-gray-300 hover:border-white/20'
                    }`}
                  >
                    <input
                      type="radio"
                      value={value}
                      className="sr-only"
                      {...register('service')}
                    />
                    {label}
                  </label>
                ))}
              </div>
              {errors.service && (
                <p className="mt-2 text-sm text-red-400">{errors.service.message}</p>
              )}
            </fieldset>

            {needsPay && (
              <p className="mt-5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/95">
                Account review and &quot;Both&quot; require a one-time{' '}
                <strong>KES {accountReviewKes}</strong> M-Pesa payment to confirm your booking.
              </p>
            )}

            <div className="mt-6 space-y-5">
              <div>
                <label htmlFor="book-name" className="block text-sm font-medium text-gray-300">
                  Your name
                </label>
                <input
                  id="book-name"
                  type="text"
                  autoComplete="name"
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                  placeholder="How should the creator address you?"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="mt-1.5 text-sm text-red-400">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="book-contact" className="block text-sm font-medium text-gray-300">
                  Contact (WhatsApp number, Discord @, or TikTok @)
                </label>
                <input
                  id="book-contact"
                  type="text"
                  autoComplete="tel"
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                  placeholder="e.g. +254… or @username"
                  {...register('contact')}
                />
                {errors.contact && (
                  <p className="mt-1.5 text-sm text-red-400">{errors.contact.message}</p>
                )}
              </div>

              {needsPay && (
                <>
                  <div>
                    <label
                      htmlFor="book-account-username"
                      className="block text-sm font-medium text-gray-300"
                    >
                      Game account username{' '}
                      <span className="text-emerald-400/90">(account to review)</span>
                    </label>
                    <input
                      id="book-account-username"
                      type="text"
                      autoComplete="username"
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                      placeholder="Your in-game / Konami ID or account name"
                      {...register('accountUsername')}
                    />
                    {errors.accountUsername && (
                      <p className="mt-1.5 text-sm text-red-400">
                        {errors.accountUsername.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="book-mpesa"
                      className="flex items-center gap-2 text-sm font-medium text-gray-300"
                    >
                      <Phone className="h-4 w-4 text-gray-400" aria-hidden />
                      M-Pesa number (for KES {accountReviewKes})
                    </label>
                    <input
                      id="book-mpesa"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                      placeholder="254712345678 or 0712345678"
                      {...register('mpesaMobile')}
                    />
                    {errors.mpesaMobile && (
                      <p className="mt-1.5 text-sm text-red-400">{errors.mpesaMobile.message}</p>
                    )}
                  </div>
                </>
              )}

              <div>
                <label
                  htmlFor="book-availability"
                  className="block text-sm font-medium text-gray-300"
                >
                  Preferred times / timezone{' '}
                  <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <input
                  id="book-availability"
                  type="text"
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                  placeholder="Evenings EAT, weekends, etc."
                  {...register('availability')}
                />
                {errors.availability && (
                  <p className="mt-1.5 text-sm text-red-400">{errors.availability.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="book-notes" className="block text-sm font-medium text-gray-300">
                  Notes <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <textarea
                  id="book-notes"
                  rows={4}
                  className="mt-1.5 w-full resize-y rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                  placeholder="Current division, what you struggle with, platform (mobile/console/PC)…"
                  {...register('notes')}
                />
                {errors.notes && (
                  <p className="mt-1.5 text-sm text-red-400">{errors.notes.message}</p>
                )}
              </div>
            </div>

            <p className="mt-6 text-xs text-gray-500">
              {needsPay ? (
                <>
                  After M-Pesa succeeds, your booking is saved and the creator is notified (
                  <span className={SITE_NAME_CLASS}>{SITE_NAME}</span> + OBS alerts where configured).
                </>
              ) : (
                'Your request is saved securely. The creator will contact you using the contact information you enter above.'
              )}
            </p>

            <button
              type="submit"
              disabled={isSubmitting || creatorScopeBlocked}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3.5 text-base font-semibold text-white shadow-lg transition hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60 sm:w-auto sm:min-w-[200px] sm:px-10"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  {needsPay ? 'Starting payment…' : 'Sending…'}
                </>
              ) : needsPay ? (
                `Pay KES ${accountReviewKes} & book`
              ) : (
                'Submit request'
              )}
            </button>
          </form>
        </main>
      </div>
    </div>
  )
}
