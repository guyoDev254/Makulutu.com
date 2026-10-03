'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import {
  clearFanSession,
  fanAuthApi,
  fanPortalApi,
  getFanToken,
  type FanProfile,
} from '@/lib/fan-auth'

type Note = {
  id: string
  title: string
  body: string
  creatorSlug?: string | null
  readAt?: string | null
}

type Membership = {
  id: string
  active?: boolean
  daysLeft?: number | null
  status?: string
  creator?: { slug?: string; displayName?: string } | null
}

type Payment = {
  id: string
  status?: string
  purpose?: string
  amountKes?: number | null
  createdAt?: string
  creator?: { slug?: string; displayName?: string } | null
}

type Follow = {
  slug: string
  displayName: string
  primaryCategory?: string | null
}

export default function FanAccountPage() {
  const router = useRouter()
  const [me, setMe] = useState<FanProfile | null>(null)
  const [tab, setTab] = useState<'inbox' | 'activity' | 'following'>('inbox')
  const [notes, setNotes] = useState<Note[]>([])
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [follows, setFollows] = useState<Follow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!getFanToken()) {
      router.replace('/fan/login')
      return
    }
    try {
      const [profile, n, m, p, f] = await Promise.all([
        fanAuthApi.me(),
        fanPortalApi.notifications(),
        fanPortalApi.memberships(),
        fanPortalApi.payments(),
        fanPortalApi.follows(),
      ])
      setMe(profile)
      setNotes(Array.isArray(n) ? (n as Note[]) : [])
      setMemberships(Array.isArray(m) ? (m as Membership[]) : [])
      setPayments(Array.isArray(p) ? (p as Payment[]) : [])
      setFollows(Array.isArray(f) ? (f as Follow[]) : [])
      setError(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not load account'
      setError(msg)
      if (/unauthor/i.test(msg) || /jwt/i.test(msg)) {
        clearFanSession()
        router.replace('/fan/login')
      }
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    void load()
  }, [load])

  const signOut = () => {
    clearFanSession()
    router.push('/')
  }

  return (
    <div className="min-h-dvh text-white">
      <SiteNav showSupport={false} showBook={false} showAuthButtons />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-300/80">Fan account</p>
            <h1 className="mt-2 text-3xl font-bold">{me?.name || me?.email || 'Your account'}</h1>
            <p className="mt-1 text-sm text-gray-500">Same records as the mobile app — PostgreSQL via the Nest API.</p>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="btn-secondary min-h-0 px-4 py-2 text-sm"
          >
            Sign out
          </button>
        </div>

        {error ? (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
            <button type="button" className="ml-3 underline" onClick={() => void load()}>
              Retry
            </button>
          </div>
        ) : null}

        {loading ? <p className="text-gray-400">Loading…</p> : null}

        <div className="mb-6 flex gap-2">
          {(['inbox', 'activity', 'following'] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-lg px-3 py-2 text-sm capitalize ${
                tab === id ? 'bg-violet-600' : 'bg-white/5 text-gray-300'
              }`}
            >
              {id}
            </button>
          ))}
        </div>

        {tab === 'inbox' ? (
          <div className="space-y-3">
            {notes.length === 0 ? <p className="text-gray-500">No notifications yet.</p> : null}
            {notes.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`block w-full rounded-xl border p-4 text-left ${
                  n.readAt ? 'border-white/10 bg-white/[0.03]' : 'border-violet-500/30 bg-violet-500/10'
                }`}
                onClick={() => {
                  void (async () => {
                    if (!n.readAt) {
                      await fanPortalApi.markNotificationRead(n.id).catch(() => undefined)
                      await load()
                    }
                    if (n.creatorSlug) router.push(`/${n.creatorSlug}`)
                  })()
                }}
              >
                <p className="font-semibold">{n.title}</p>
                <p className="mt-1 text-sm text-gray-400">{n.body}</p>
              </button>
            ))}
            {notes.some((n) => !n.readAt) ? (
              <button
                type="button"
                className="text-sm text-violet-300"
                onClick={() => void fanPortalApi.markNotificationsRead().then(() => load())}
              >
                Mark all read
              </button>
            ) : null}
          </div>
        ) : null}

        {tab === 'activity' ? (
          <div className="space-y-6">
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Memberships</h2>
              {memberships.length === 0 ? <p className="text-gray-500">No memberships yet.</p> : null}
              {memberships.map((row) => (
                <Link
                  key={row.id}
                  href={row.creator?.slug ? `/${row.creator.slug}` : '/'}
                  className="mb-2 block rounded-xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <p className="font-medium">{row.creator?.displayName || 'Streamer'}</p>
                  <p className="text-sm text-gray-400">
                    {row.active ? `Active · ${row.daysLeft ?? 0} days left` : row.status}
                  </p>
                </Link>
              ))}
            </section>
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Payments</h2>
              {payments.length === 0 ? <p className="text-gray-500">No payments yet.</p> : null}
              {payments.map((row) => (
                <div key={row.id} className="mb-2 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="font-medium">{row.creator?.displayName || 'Support'}</p>
                  <p className="text-sm text-gray-400">
                    {row.purpose} · {row.status} · {row.amountKes != null ? `KES ${row.amountKes}` : ''}
                  </p>
                </div>
              ))}
            </section>
          </div>
        ) : null}

        {tab === 'following' ? (
          <div className="space-y-3">
            {follows.length === 0 ? <p className="text-gray-500">You are not following anyone yet.</p> : null}
            {follows.map((row) => (
              <Link
                key={row.slug}
                href={`/${row.slug}`}
                className="block rounded-xl border border-white/10 bg-white/[0.03] p-4"
              >
                <p className="font-medium">{row.displayName}</p>
                <p className="text-sm text-gray-400">/{row.slug}</p>
              </Link>
            ))}
          </div>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  )
}
