'use client'

import {
  CheckCircle2,
  Clock3,
  Download,
  Loader2,
  Search,
  Wallet,
  XCircle,
  Ban,
  CircleDollarSign,
} from 'lucide-react'
import { payoutStatusBadgeClass, payoutStatusLabel } from '@/components/admin/format'

export type PayoutStatusCounts = {
  pending: number
  approved: number
  rejected: number
  paid: number
  failed?: number
  cancelled?: number
  all: number
  pendingKes: number
  approvedKes: number
}

type PayoutRow = {
  id: string
  createdAt: string
  amountKes: number
  withdrawalFeeKes?: number
  payoutAmountKes?: number | null
  status: string
  payoutChannel?: string | null
  msisdn?: string | null
  payoutReference?: string | null
  reviewedBy?: string | null
  reviewedAt?: string | null
  paidAt?: string | null
  notes?: string | null
  failureReason?: string | null
  creator?: { displayName?: string | null; slug?: string | null; email?: string | null }
}

const FILTERS: { id: string; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Sending' },
  { id: 'approved', label: 'Queued' },
  { id: 'paid', label: 'Paid' },
  { id: 'failed', label: 'Failed' },
  { id: 'rejected', label: 'Returned' },
]

function statusStyle(status: string) {
  return payoutStatusBadgeClass(status)
}

function statusLabel(status: string) {
  return payoutStatusLabel(status)
}

function countsFromRows(rows: PayoutRow[]): PayoutStatusCounts {
  const out: PayoutStatusCounts = {
    pending: 0,
    approved: 0,
    rejected: 0,
    paid: 0,
    all: rows.length,
    pendingKes: 0,
    approvedKes: 0,
  }
  for (const r of rows) {
    const s = String(r.status).toUpperCase()
    const amt = Number(r.amountKes || 0)
    if (s === 'PENDING') {
      out.pending += 1
      out.pendingKes += amt
    } else if (s === 'APPROVED') {
      out.approved += 1
      out.approvedKes += amt
    }     else if (s === 'REJECTED') out.rejected += 1
    else if (s === 'FAILED') out.failed = (out.failed || 0) + 1
    else if (s === 'PAID') out.paid += 1
  }
  return out
}

type Props = {
  isCreatorWorkspace: boolean
  isAdminOrSuper: boolean
  rows: PayoutRow[]
  counts?: PayoutStatusCounts | null
  searchQuery: string
  setSearchQuery: (v: string) => void
  payoutStatusFilter: string
  setPayoutStatusFilter: (v: string) => void
  onResetPage: () => void
  formatAmount: (n: number) => string
  formatDate: (d: string) => string
  reviewingPayoutId: string | null
  onReview: (id: string, status: 'APPROVED' | 'REJECTED' | 'PAID') => void
  exportingPayouts: boolean
  onExportApproved: () => void
  schedule?: {
    weekday: string
    summary: string
    nextReminderAt: string
  } | null
  pagination?: { page: number; totalPages: number; total: number }
  onPrevPage?: () => void
  onNextPage?: () => void
}

export function PayoutsPanel({
  isCreatorWorkspace,
  isAdminOrSuper,
  rows,
  counts,
  searchQuery,
  setSearchQuery,
  payoutStatusFilter,
  setPayoutStatusFilter,
  onResetPage,
  formatAmount,
  formatDate,
  reviewingPayoutId,
  onReview,
  exportingPayouts,
  onExportApproved,
  schedule: _schedule,
  pagination,
  onPrevPage,
  onNextPage,
}: Props) {
  const stats = counts && counts.all >= 0 ? counts : countsFromRows(rows)
  const visibleRows =
    isCreatorWorkspace && payoutStatusFilter !== 'all'
      ? rows.filter(
          (r) => String(r.status).toUpperCase() === payoutStatusFilter.toUpperCase(),
        )
      : rows
  const empty = visibleRows.length === 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white tracking-tight">
          {isCreatorWorkspace ? 'Your payouts' : 'Streamer payouts'}
        </h2>
        <p className="mt-1 text-sm text-slate-400 max-w-2xl">
          {isCreatorWorkspace
            ? 'Settled earnings can be sent to your M-Pesa number through Paystack. One payout can be in progress at a time.'
            : 'Streamer withdrawals send through Paystack to M-Pesa or a Kenyan bank. This list is a log — you do not approve each transfer.'}
        </p>
      </div>

      {!isCreatorWorkspace ? (
        <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/40 to-slate-900/20 px-5 py-4">
          <p className="text-sm font-semibold text-cyan-100">Automatic M-Pesa payouts</p>
          <p className="mt-1 text-sm text-cyan-100/75 leading-relaxed">
            When a streamer requests a payout, Paystack transfers the net amount to their M-Pesa
            number or Kenyan bank. Failed sends return funds to their wallet.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <SummaryCard
          label="Sending"
          value={String(stats.pending)}
          meta={stats.pendingKes ? formatAmount(stats.pendingKes) : 'Nothing waiting'}
          icon={Clock3}
          tone="amber"
        />
        <SummaryCard
          label="Queued"
          value={String(stats.approved)}
          meta={stats.approvedKes ? formatAmount(stats.approvedKes) : 'Waiting on Paystack'}
          icon={CircleDollarSign}
          tone="cyan"
        />
        <SummaryCard
          label="Paid"
          value={String(stats.paid)}
          meta="Completed withdrawals"
          icon={CheckCircle2}
          tone="emerald"
        />
        <SummaryCard
          label="Failed"
          value={String(stats.failed ?? 0)}
          meta="Returned to wallet"
          icon={XCircle}
          tone="rose"
        />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => {
            const on = payoutStatusFilter === f.id
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setPayoutStatusFilter(f.id)
                  onResetPage()
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  on
                    ? 'bg-white text-slate-900'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 ring-1 ring-slate-600/60'
                }`}
              >
                {f.label}
              </button>
            )
          })}
        </div>
        {!isCreatorWorkspace ? (
          <div className="flex flex-1 flex-col sm:flex-row gap-3 lg:justify-end">
            <div className="relative flex-1 min-w-[180px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search streamer, slug, or M-Pesa…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-900/70 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            {isAdminOrSuper ? (
              <button
                type="button"
                disabled={exportingPayouts}
                onClick={onExportApproved}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold whitespace-nowrap"
              >
                {exportingPayouts ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Export CSV
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-700/70 bg-slate-900/40 overflow-hidden">
        {empty ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-slate-400">
              <Wallet className="h-6 w-6" />
            </div>
            <p className="text-white font-medium">No payouts in this view</p>
            <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
              {payoutStatusFilter === 'pending'
                ? 'No payouts in progress. Streamers send to M-Pesa from their wallet.'
                : payoutStatusFilter === 'approved'
                  ? 'Nothing queued with Paystack right now.'
                  : payoutStatusFilter === 'failed'
                    ? 'No failed Paystack transfers in this view.'
                    : 'Try another status, or clear search.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-800">
            {visibleRows.map((r) => {
              const name =
                r.creator?.displayName ||
                r.creator?.slug ||
                (isCreatorWorkspace ? 'Your request' : 'Streamer')
              const dest = r.msisdn || r.payoutChannel || 'No destination'
              const fee = Number(r.withdrawalFeeKes || 0)
              const sendAmt =
                r.payoutAmountKes != null ? Number(r.payoutAmountKes) : Number(r.amountKes || 0)
              const st = String(r.status).toUpperCase()
              return (
                <li
                  key={r.id}
                  className="px-4 sm:px-5 py-4 hover:bg-slate-800/30 transition"
                >
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-6">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-sm font-bold text-violet-200">
                        {String(name).slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-white truncate">{name}</p>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${statusStyle(st)}`}
                          >
                            {statusLabel(st)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-400 truncate">
                          {r.creator?.slug ? `/${r.creator.slug}` : null}
                          {r.creator?.slug ? ' · ' : null}
                          {dest}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Requested {formatDate(r.createdAt)}
                          {r.reviewedAt
                            ? ` · ${r.reviewedBy === 'Paystack' ? 'Paystack' : `Updated ${formatDate(r.reviewedAt)}${r.reviewedBy ? ` by ${r.reviewedBy}` : ''}`}`
                            : ''}
                          {r.paidAt ? ` · Paid ${formatDate(r.paidAt)}` : ''}
                        </p>
                        {r.notes ? (
                          <p className="mt-1 text-xs text-slate-500 line-clamp-2">{r.notes}</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-end justify-between gap-4 xl:contents">
                      <div className="xl:text-right xl:w-40 shrink-0">
                        <p className="text-lg font-bold tabular-nums text-white">
                          {formatAmount(Number(r.amountKes || 0))}
                        </p>
                        {fee > 0 ? (
                          <p className="text-[11px] text-slate-500">
                            Fee {formatAmount(fee)} · send {formatAmount(sendAmt)}
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-500">Withdrawal amount</p>
                        )}
                        {r.payoutReference ? (
                          <p className="text-[11px] text-slate-400 truncate max-w-[160px]">
                            Ref {r.payoutReference}
                          </p>
                        ) : null}
                      </div>

                      {!isCreatorWorkspace ? (
                        <div className="flex flex-wrap gap-2 xl:justify-end xl:w-64">
                          {st === 'PENDING' || st === 'APPROVED' ? (
                            <>
                              <span className="inline-flex items-center text-xs text-cyan-300/80">
                                Paystack sending
                              </span>
                              {st === 'PENDING' ? (
                                <button
                                  type="button"
                                  disabled={reviewingPayoutId === r.id}
                                  onClick={() => onReview(r.id, 'REJECTED')}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-700 hover:bg-rose-600 disabled:opacity-40 text-white"
                                >
                                  Return funds
                                </button>
                              ) : null}
                            </>
                          ) : st === 'REJECTED' || st === 'FAILED' || st === 'CANCELLED' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                              <Ban className="h-3.5 w-3.5" /> Back in wallet
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-400/80">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Sent to M-Pesa
                            </span>
                          )}
                        </div>
                      ) : st === 'PENDING' || st === 'APPROVED' ? (
                        <p className="text-xs text-cyan-300/80 xl:w-48 xl:text-right">
                          Paystack is sending this to M-Pesa
                        </p>
                      ) : st === 'FAILED' ? (
                        <p className="text-xs text-rose-300/80 xl:w-48 xl:text-right">
                          {r.failureReason || 'Transfer failed — amount returned'}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {!isCreatorWorkspace && pagination && pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-slate-400">
          <p>
            {pagination.total} request{pagination.total === 1 ? '' : 's'} · page {pagination.page} of{' '}
            {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onPrevPage}
              disabled={pagination.page === 1}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={onNextPage}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  meta,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  meta: string
  icon: typeof Clock3
  tone: 'amber' | 'cyan' | 'emerald' | 'rose'
}) {
  const ring =
    tone === 'amber'
      ? 'border-amber-500/20 bg-amber-500/5'
      : tone === 'cyan'
        ? 'border-cyan-500/20 bg-cyan-500/5'
        : tone === 'emerald'
          ? 'border-emerald-500/20 bg-emerald-500/5'
          : 'border-rose-500/20 bg-rose-500/5'
  const iconC =
    tone === 'amber'
      ? 'text-amber-300 bg-amber-500/15'
      : tone === 'cyan'
        ? 'text-cyan-300 bg-cyan-500/15'
        : tone === 'emerald'
          ? 'text-emerald-300 bg-emerald-500/15'
          : 'text-rose-300 bg-rose-500/15'
  return (
    <div className={`rounded-2xl border p-4 ${ring}`}>
      <div className="flex items-center gap-2">
        <span className={`rounded-lg p-1.5 ${iconC}`}>
          <Icon className="h-4 w-4" />
        </span>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{meta}</p>
    </div>
  )
}
