'use client'

import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Swal from 'sweetalert2'
import { ArrowLeft, CalendarCheck, ClipboardList, Loader2, TrendingUp } from 'lucide-react'
import { SiteNav } from '@/components/SiteNav'
import {
  API_BASE_URL,
  apiNetworkErrorHint,
  formatApiErrorMessage,
  isFetchNetworkError,
} from '@/lib/api-origin'

const bookingSchema = z.object({
  service: z.enum(['account_review', 'rank_push', 'both']),
  name: z.string().min(2, 'Enter your name').max(80),
  contact: z.string().min(3, 'How should we reach you?').max(120),
  availability: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
})

type BookingForm = z.infer<typeof bookingSchema>

export default function BookPage() {
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
    },
  })

  const service = watch('service')

  const onSubmit = async (data: BookingForm) => {
    const payload = {
      service: data.service,
      name: data.name.trim(),
      contact: data.contact.trim(),
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
      html: `<p class="text-sm">Thank you! MohaGamer will contact you <strong>immediately</strong> using the contact details you provided.</p><p class="text-sm text-gray-600 mt-3">Keep an eye on your messages—we have your request on file.</p>`,
      confirmButtonColor: '#7c3aed',
    })
    reset({
      service: 'account_review',
      name: '',
      contact: '',
      availability: '',
      notes: '',
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
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-gray-400 transition hover:text-fuchsia-300"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to home
          </Link>

          <header className="mb-10 text-center sm:text-left">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-200/90">
              <CalendarCheck className="h-3.5 w-3.5" aria-hidden />
              Book a session
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl md:text-5xl">
              Account review &amp; rank push
            </h1>
            <p className="mt-4 text-gray-400 text-pretty sm:text-lg">
              1:1 help for your eFootball account. Submit your details below and MohaGamer will reach
              out to you right away.
            </p>
          </header>

          <div className="mb-10 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
                <ClipboardList className="h-5 w-5" aria-hidden />
              </div>
              <h2 className="mt-3 font-semibold text-white">Account review</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">
                Squad, tactics, and settings looked over with clear fixes—so you know what to
                change and why.
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
                  placeholder="How should Moha address you?"
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
              Your request is saved securely. No links to copy—MohaGamer will contact you using the
              contact information you enter above.
            </p>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3.5 text-base font-semibold text-white shadow-lg transition hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60 sm:w-auto sm:min-w-[200px] sm:px-10"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  Sending…
                </>
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
