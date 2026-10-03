'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Mail,
  MoreHorizontal,
  Radio,
  Search,
  UserSquare2,
} from 'lucide-react'
import { publicImageSrc } from '@/lib/media'
import type { PaginationInfo } from '@/components/admin/types'

export type AdminStreamerRow = {
  id: string
  email: string
  slug: string
  displayName: string
  avatarUrl?: string | null
  isActive?: boolean
  supportEnabled?: boolean
  onboardingComplete?: boolean
  streamVerified?: boolean
  streamVerificationStatus?: string
  streamLinksSubmittedAt?: string | null
  streamReviewNote?: string | null
  tiktokUrl?: string | null
  youtubeUrl?: string | null
  primaryCategory?: string | null
  lastLogin?: string | null
  createdAt?: string
  _count?: {
    users?: number
    payments?: number
    subscriptions?: number
    creatorRewards?: number
  }
}

type PatchBody = {
  isActive?: boolean
  supportEnabled?: boolean
  onboardingComplete?: boolean
  streamVerified?: boolean
  streamReviewAction?: 'approve' | 'reject'
  streamReviewNote?: string
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'S'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function streamStatus(c: AdminStreamerRow): 'verified' | 'pending' | 'rejected' | 'none' {
  if (c.streamVerified || c.streamVerificationStatus === 'verified') return 'verified'
  if (c.streamReviewNote?.trim() || c.streamVerificationStatus === 'rejected') return 'rejected'
  if (c.streamLinksSubmittedAt || c.streamVerificationStatus === 'pending') return 'pending'
  return 'none'
}

function lastSeenLabel(iso: string | null | undefined, formatDate: (d: string) => string): string {
  if (!iso) return 'Never signed in'
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return formatDate(iso)
  const days = Math.floor((Date.now() - then) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 14) return `${days} days ago`
  return formatDate(iso)
}

function StatusPill({
  tone,
  children,
}: {
  tone: 'ok' | 'warn' | 'off' | 'info' | 'bad'
  children: ReactNode
}) {
  const cls =
    tone === 'ok'
      ? 'border-emerald-400/25 bg-emerald-500/15 text-emerald-200'
      : tone === 'warn'
        ? 'border-amber-400/25 bg-amber-500/15 text-amber-100'
        : tone === 'info'
          ? 'border-sky-400/25 bg-sky-500/15 text-sky-100'
          : tone === 'bad'
            ? 'border-red-400/30 bg-red-500/15 text-red-100'
            : 'border-white/10 bg-white/5 text-slate-400'
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {children}
    </span>
  )
}

function StreamerManageMenu({
  c,
  busy,
  canManage,
  onPatch,
  onRejectStream,
}: {
  c: AdminStreamerRow
  busy: boolean
  canManage: boolean
  onPatch: (id: string, body: PatchBody) => void
  onRejectStream: (c: AdminStreamerRow) => void
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  if (!canManage) return null

  const item =
    'w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/10 disabled:opacity-40'
  const hasChannel = Boolean(c.tiktokUrl || c.youtubeUrl)

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 disabled:opacity-50"
        aria-label="More actions"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-1 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#12121a] py-1 shadow-xl shadow-black/50">
          <button
            type="button"
            className={item}
            disabled={busy}
            onClick={() => {
              setOpen(false)
              onPatch(c.id, { isActive: !c.isActive })
            }}
          >
            {c.isActive ? 'Deactivate account' : 'Activate account'}
          </button>
          <button
            type="button"
            className={item}
            disabled={busy}
            onClick={() => {
              setOpen(false)
              onPatch(c.id, { supportEnabled: !c.supportEnabled })
            }}
          >
            {c.supportEnabled ? 'Turn support off' : 'Turn support on'}
          </button>
          <button
            type="button"
            className={item}
            disabled={busy}
            onClick={() => {
              setOpen(false)
              onPatch(c.id, { onboardingComplete: !c.onboardingComplete })
            }}
          >
            {c.onboardingComplete ? 'Mark still onboarding' : 'Mark onboarded'}
          </button>
          <div className="my-1 border-t border-white/10" />
          {c.streamVerified ? (
            <button
              type="button"
              className={item}
              disabled={busy}
              onClick={() => {
                setOpen(false)
                onRejectStream(c)
              }}
            >
              Unverify stream
            </button>
          ) : (
            <>
              <button
                type="button"
                className={item}
                disabled={busy || !hasChannel}
                onClick={() => {
                  setOpen(false)
                  onPatch(c.id, { streamReviewAction: 'approve' })
                }}
              >
                Verify stream
              </button>
              <button
                type="button"
                className={`${item} text-red-200`}
                disabled={busy}
                onClick={() => {
                  setOpen(false)
                  onRejectStream(c)
                }}
              >
                Reject stream links
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}

export function AdminStreamersPanel({
  creators,
  pagination,
  setPagination,
  searchQuery,
  setSearchQuery,
  streamerTotals,
  updatingCreatorId,
  superAdmin,
  canManage,
  formatDate,
  onExport,
  onOpenProfile,
  onEmail,
  onPatch,
  onRejectStream,
}: {
  creators: AdminStreamerRow[]
  pagination: PaginationInfo
  setPagination: (next: PaginationInfo) => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  streamerTotals?: { total: number; active: number }
  updatingCreatorId: string | null
  superAdmin: boolean
  canManage: boolean
  formatDate: (d: string) => string
  onExport: () => void
  onOpenProfile: (id: string) => void
  onEmail: (c: { id: string; email: string; displayName: string }) => void
  onPatch: (id: string, body: PatchBody) => void
  onRejectStream: (c: AdminStreamerRow) => void
}) {
  const from = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1
  const to = Math.min(pagination.page * pagination.limit, pagination.total)
  const pendingOnPage = creators.filter((c) => streamStatus(c) === 'pending').length
  const rejectedOnPage = creators.filter((c) => streamStatus(c) === 'rejected').length

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Streamer directory</h2>
          <p className="mt-1 text-sm text-slate-400">
            {searchQuery.trim()
              ? `${pagination.total} match this search`
              : streamerTotals
                ? `${streamerTotals.total} accounts · ${streamerTotals.active} active`
                : `${pagination.total} accounts`}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">On this page</p>
            <p className="mt-0.5 text-sm font-medium text-white tabular-nums">{creators.length}</p>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-200/70">Pending</p>
            <p className="mt-0.5 text-sm font-medium text-amber-100 tabular-nums">{pendingOnPage}</p>
          </div>
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-red-200/70">Rejected</p>
            <p className="mt-0.5 text-sm font-medium text-red-100 tabular-nums">{rejectedOnPage}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search name, email, or slug"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
          />
        </div>
        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-slate-100 hover:bg-white/[0.08]"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {creators.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
          <UserSquare2 className="h-10 w-10 text-slate-600" />
          <p className="mt-3 text-sm font-medium text-slate-300">No streamers match this search</p>
          <p className="mt-1 text-sm text-slate-500">Try a different name, email, or page slug.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {creators.map((c) => {
            const busy = updatingCreatorId === c.id
            const photo = c.avatarUrl ? publicImageSrc(c.avatarUrl) : null
            const members = c._count?.subscriptions ?? 0
            const payments = c._count?.payments ?? 0
            return (
              <li key={c.id}>
                <article
                  className={`rounded-2xl border bg-white/[0.03] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset] transition hover:bg-white/[0.045] sm:p-5 ${
                    c.isActive ? 'border-white/10' : 'border-red-500/25 bg-red-500/[0.04]'
                  }`}
                >
                  <div className="flex gap-3 sm:gap-4">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c12] sm:h-14 sm:w-14">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-cyan-100">
                          {initials(c.displayName || c.slug)}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-base font-semibold text-white">
                              {c.displayName}
                            </h3>
                            {c.primaryCategory ? (
                              <span className="truncate text-xs text-slate-500">{c.primaryCategory}</span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 truncate text-sm text-cyan-300/90">/{c.slug}</p>
                          <p className="mt-0.5 truncate text-xs text-slate-500">{c.email}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <StatusPill tone={c.isActive ? 'ok' : 'off'}>
                              {c.isActive ? 'Active' : 'Inactive'}
                            </StatusPill>
                            <StatusPill tone={c.supportEnabled ? 'info' : 'off'}>
                              Support {c.supportEnabled ? 'on' : 'off'}
                            </StatusPill>
                            <StatusPill tone={c.onboardingComplete ? 'ok' : 'warn'}>
                              {c.onboardingComplete ? 'Onboarded' : 'Onboarding'}
                            </StatusPill>
                            <StatusPill
                              tone={
                                streamStatus(c) === 'verified'
                                  ? 'ok'
                                  : streamStatus(c) === 'pending'
                                    ? 'warn'
                                    : streamStatus(c) === 'rejected'
                                      ? 'bad'
                                      : 'off'
                              }
                            >
                              {streamStatus(c) === 'verified'
                                ? 'Stream verified'
                                : streamStatus(c) === 'pending'
                                  ? 'Stream pending'
                                  : streamStatus(c) === 'rejected'
                                    ? 'Stream rejected'
                                    : 'Stream unverified'}
                            </StatusPill>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {c.tiktokUrl ? (
                              <a
                                href={c.tiktokUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-slate-300 hover:border-cyan-400/40 hover:text-white"
                              >
                                TikTok
                              </a>
                            ) : null}
                            {c.youtubeUrl ? (
                              <a
                                href={c.youtubeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-slate-300 hover:border-cyan-400/40 hover:text-white"
                              >
                                YouTube
                              </a>
                            ) : null}
                            {!c.tiktokUrl && !c.youtubeUrl ? (
                              <span className="text-[11px] text-slate-600">No TikTok or YouTube yet</span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">
                          <dl className="grid grid-cols-3 gap-3 text-right sm:min-w-[220px]">
                            <div>
                              <dt className="text-[10px] uppercase tracking-wider text-slate-500">Last seen</dt>
                              <dd className="mt-0.5 text-xs font-medium text-slate-200">
                                {lastSeenLabel(c.lastLogin, formatDate)}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-[10px] uppercase tracking-wider text-slate-500">Members</dt>
                              <dd className="mt-0.5 text-xs font-medium tabular-nums text-white">{members}</dd>
                            </div>
                            <div>
                              <dt className="text-[10px] uppercase tracking-wider text-slate-500">Payments</dt>
                              <dd className="mt-0.5 text-xs font-medium tabular-nums text-white">{payments}</dd>
                            </div>
                          </dl>
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {superAdmin ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => onOpenProfile(c.id)}
                                  className="inline-flex h-9 items-center rounded-lg bg-cyan-500/15 px-3 text-sm font-medium text-cyan-100 ring-1 ring-cyan-400/30 hover:bg-cyan-500/25"
                                >
                                  Open
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onEmail({
                                      id: c.id,
                                      email: c.email,
                                      displayName: c.displayName,
                                    })
                                  }
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                                  aria-label={`Email ${c.displayName}`}
                                >
                                  <Mail className="h-4 w-4" />
                                </button>
                              </>
                            ) : null}
                            <Link
                              href={`/${c.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-slate-200 hover:bg-white/10"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Page
                            </Link>
                            <StreamerManageMenu
                              c={c}
                              busy={busy}
                              canManage={canManage}
                              onPatch={onPatch}
                              onRejectStream={onRejectStream}
                            />
                          </div>
                        </div>
                      </div>
                      {streamStatus(c) === 'pending' ? (
                        <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-100">
                          <Radio className="h-3 w-3" />
                          Waiting on stream review
                        </p>
                      ) : null}
                      {streamStatus(c) === 'rejected' && c.streamReviewNote ? (
                        <p className="mt-3 rounded-lg border border-red-400/20 bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-100">
                          Rejected: {c.streamReviewNote}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      )}

      {pagination.total > 0 ? (
        <div className="flex flex-col gap-3 border-t border-white/5 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Showing {from}–{to} of {pagination.total}
          </p>
          {pagination.totalPages > 1 ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setPagination({
                    ...pagination,
                    page: Math.max(1, pagination.page - 1),
                  })
                }
                disabled={pagination.page === 1}
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[4.5rem] text-center text-sm tabular-nums text-slate-300">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPagination({
                    ...pagination,
                    page: Math.min(pagination.totalPages, pagination.page + 1),
                  })
                }
                disabled={pagination.page >= pagination.totalPages}
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
