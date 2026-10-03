'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X, Loader2, ExternalLink, Copy, Check } from 'lucide-react'
import { getStatusBadge, payoutStatusBadgeClass, payoutStatusLabel } from '@/components/admin/format'
import { PlatformFeeBreakdownTable } from '@/components/admin/PlatformFeeBreakdownTable'
import { DashboardRangeControls, type DashboardRangePreset } from '@/components/admin/DashboardRangeControls'
import { DashboardCharts } from '@/components/admin/DashboardCharts'
import api from '@/lib/api'
import type { DashboardStats } from '@/components/admin/types'

type TabId =
  | 'overview'
  | 'supporters'
  | 'payments'
  | 'subscriptions'
  | 'shoutouts'
  | 'tiers'
  | 'obs'
  | 'payouts'
  | 'coaching'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Profile' },
  { id: 'supporters', label: 'Supporters' },
  { id: 'payments', label: 'Payments' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'shoutouts', label: 'Shoutouts' },
  { id: 'tiers', label: 'Reward tiers' },
  { id: 'obs', label: 'OBS links' },
  { id: 'payouts', label: 'Payouts' },
  { id: 'coaching', label: 'Coaching' },
]

function num(v: unknown): number {
  if (v == null) return 0
  if (typeof v === 'number') return v
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export function CreatorSuperProfileModal(props: {
  open: boolean
  onClose: () => void
  loading: boolean
  data: any | null
  formatDate: (d: string | null | undefined) => string
  formatAmount: (amount: number) => string
  shoutoutPlatformLabel: (p: string) => string
}) {
  const { open, onClose, loading, data, formatDate, formatAmount, shoutoutPlatformLabel } = props
  const [tab, setTab] = useState<TabId>('overview')
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [dashPreset, setDashPreset] = useState<DashboardRangePreset>('thisWeek')
  const [dashFrom, setDashFrom] = useState('')
  const [dashTo, setDashTo] = useState('')
  const [dash, setDash] = useState<DashboardStats | null>(null)
  const [dashLoading, setDashLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setTab('overview')
      setCopiedToken(null)
      setDashPreset('thisWeek')
      setDash(null)
    }
  }, [open])

  const creatorId = data?.creator?.id as string | undefined

  useEffect(() => {
    if (!open || !creatorId) return
    if (dashPreset === 'custom' && (!dashFrom || !dashTo)) return
    let cancelled = false
    setDashLoading(true)
    const params = new URLSearchParams({ preset: dashPreset })
    if (dashPreset === 'custom') {
      params.set('from', dashFrom)
      params.set('to', dashTo)
    }
    void api
      .get<DashboardStats>(`/admin/creators/${creatorId}/dashboard?${params}`)
      .then((res) => {
        if (!cancelled) setDash(res.data)
      })
      .catch(() => {
        if (!cancelled) setDash(null)
      })
      .finally(() => {
        if (!cancelled) setDashLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, creatorId, dashPreset, dashFrom, dashTo])

  if (!open) return null

  const copyToken = async (token: string | null | undefined) => {
    if (!token) return
    try {
      await navigator.clipboard.writeText(token)
      setCopiedToken(token)
      setTimeout(() => setCopiedToken(null), 2000)
    } catch {
      /* ignore */
    }
  }

  const c = data?.creator
  const limits = data?.listLimits

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="creator-super-profile-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative flex max-h-[min(92vh,900px)] w-full max-w-6xl flex-col rounded-t-2xl border border-slate-600/80 bg-slate-950 shadow-2xl sm:rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-700/80 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2
              id="creator-super-profile-title"
              className="text-lg font-semibold text-white truncate"
            >
              {loading ? 'Loading…' : c?.displayName ?? 'Creator'}
            </h2>
            {!loading && c ? (
              <p className="mt-0.5 text-sm text-slate-400 truncate">
                /{c.slug} · {c.email}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!loading && c ? (
              <Link
                href={`/${c.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 px-2.5 py-1.5 text-xs font-medium text-cyan-200 hover:bg-cyan-950/50"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Public page
              </Link>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {!loading && data && limits ? (
          <p className="shrink-0 border-b border-slate-800 px-4 py-2 text-[11px] text-slate-500 sm:px-5">
            Super admin view — lists capped (e.g. up to {limits.supporters} supporters, {limits.payments}{' '}
            payments). Totals in the profile header use full database counts.
          </p>
        ) : null}

        {!loading && data ? (
          <div className="shrink-0 overflow-x-auto border-b border-slate-800 px-2 py-2 sm:px-4">
            <div className="flex w-max gap-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                    tab === t.id
                      ? 'bg-cyan-600/25 text-cyan-100 ring-1 ring-cyan-500/40'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-400">
              <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
              <p className="text-sm">Loading creator data…</p>
            </div>
          ) : !data ? (
            <p className="text-center text-slate-500 py-12">No data</p>
          ) : tab === 'overview' ? (
            <div className="space-y-6">
              <DashboardRangeControls
                preset={dashPreset}
                from={dashFrom}
                to={dashTo}
                periodLabel={dash?.period?.label}
                accent="cyan"
                title="This streamer's day and week"
                onPreset={(id) => setDashPreset(id)}
                onCustomStart={(ymd) => {
                  setDashFrom(ymd)
                  setDashTo(ymd)
                  setDashPreset('custom')
                }}
                onFromChange={setDashFrom}
                onToChange={setDashTo}
                onApplyCustom={() => {
                  setDashFrom(dashFrom)
                  setDashTo(dashTo)
                  setDashPreset('custom')
                }}
              />
              {dashLoading && !dash ? (
                <p className="text-sm text-slate-500">Loading period totals…</p>
              ) : dash?.period ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-4">
                    <p className="text-xs text-slate-500">Revenue in range</p>
                    <p className="text-xl font-bold text-amber-200 tabular-nums">
                      {formatAmount(dash.period.revenueKes)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-4">
                    <p className="text-xs text-slate-500">Completed payments</p>
                    <p className="text-xl font-bold text-emerald-200 tabular-nums">
                      {dash.period.completedPayments}
                    </p>
                  </div>
                  <div className="rounded-xl border border-sky-800/40 bg-sky-950/20 p-4">
                    <p className="text-xs text-slate-500">New subscriptions</p>
                    <p className="text-xl font-bold text-sky-200 tabular-nums">
                      {dash.period.newSubscriptions}
                    </p>
                  </div>
                </div>
              ) : null}
              {dash?.trends?.series?.length ? (
                <DashboardCharts
                  series={dash.trends.series}
                  payments={dash.payments}
                  formatKes={formatAmount}
                  hideNumericAmounts={false}
                  period={
                    dash.period
                      ? {
                          label: dash.period.label,
                          completedPayments: dash.period.completedPayments,
                          newSubscriptions: dash.period.newSubscriptions,
                          revenueKes: dash.period.revenueKes,
                          previous: dash.period.previous,
                        }
                      : null
                  }
                />
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-700/80 bg-slate-900/50 p-4">
                  <p className="text-xs text-slate-500">Supporters</p>
                  <p className="text-2xl font-bold text-white">{c._count?.users ?? 0}</p>
                </div>
                <div className="rounded-xl border border-slate-700/80 bg-slate-900/50 p-4">
                  <p className="text-xs text-slate-500">Payments</p>
                  <p className="text-2xl font-bold text-white">{c._count?.payments ?? 0}</p>
                </div>
                <div className="rounded-xl border border-slate-700/80 bg-slate-900/50 p-4">
                  <p className="text-xs text-slate-500">Subscriptions</p>
                  <p className="text-2xl font-bold text-white">{c._count?.subscriptions ?? 0}</p>
                </div>
                <div className="rounded-xl border border-slate-700/80 bg-slate-900/50 p-4">
                  <p className="text-xs text-slate-500">Payout requests</p>
                  <p className="text-2xl font-bold text-white">{c._count?.payoutRequests ?? 0}</p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-4">
                  <h3 className="text-sm font-semibold text-emerald-200">Wallet (completed)</h3>
                  <p className="mt-2 text-2xl font-bold text-white">
                    {formatAmount(data.walletSummary?.totals?.grossKes ?? 0)} gross
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Net {formatAmount(data.walletSummary?.totals?.netKes ?? 0)} · Fees summed per completed payment at{' '}
                    {data.walletSummary?.platformFeePercent ?? '—'}%
                  </p>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <div>
                      <dt className="text-slate-500">Subs</dt>
                      <dd>{formatAmount(data.walletSummary?.byPurpose?.subscriptionKes ?? 0)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Shoutouts</dt>
                      <dd>{formatAmount(data.walletSummary?.byPurpose?.shoutoutKes ?? 0)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Coaching</dt>
                      <dd>{formatAmount(data.walletSummary?.byPurpose?.coachingKes ?? 0)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Tiers</dt>
                      <dd>{formatAmount(data.walletSummary?.byPurpose?.creatorRewardKes ?? 0)}</dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-xl border border-slate-700/80 bg-slate-900/50 p-4 text-sm">
                  <h3 className="font-semibold text-white">Account</h3>
                  <ul className="mt-2 space-y-1.5 text-slate-300">
                    <li>
                      Active:{' '}
                      <span className={c.isActive ? 'text-emerald-400' : 'text-red-400'}>
                        {c.isActive ? 'yes' : 'no'}
                      </span>
                    </li>
                    <li>
                      Support page:{' '}
                      <span className={c.supportEnabled ? 'text-emerald-400' : 'text-slate-500'}>
                        {c.supportEnabled ? 'enabled' : 'off'}
                      </span>
                    </li>
                    <li>
                      Onboarding:{' '}
                      {c.onboardingComplete ? (
                        <span className="text-violet-300">complete</span>
                      ) : (
                        <span className="text-amber-300">incomplete</span>
                      )}
                    </li>
                    <li>Category: {c.primaryCategory ?? '—'}</li>
                    <li>Joined: {formatDate(c.createdAt)}</li>
                    <li>Last login: {c.lastLogin ? formatDate(c.lastLogin) : '—'}</li>
                  </ul>
                </div>
              </div>

              {data.walletSummary?.recentFeeLines != null ? (
                <PlatformFeeBreakdownTable
                  lines={data.walletSummary.recentFeeLines}
                  platformFeePercent={data.walletSummary.platformFeePercent ?? 0}
                  totalCompletedPayments={data.walletSummary.completedPayments ?? 0}
                  linesLimit={data.walletSummary.recentFeeLinesLimit ?? 40}
                  formatAmount={formatAmount}
                  formatDate={(d) => (d ? formatDate(d) : '—')}
                  summaryLabel="How platform fee is calculated (per payment)"
                />
              ) : null}

              {c.bio ? (
                <div>
                  <h3 className="text-sm font-semibold text-slate-300">Bio</h3>
                  <p className="mt-1 text-sm text-slate-400 whitespace-pre-wrap">{c.bio}</p>
                </div>
              ) : null}

              <div>
                <h3 className="text-sm font-semibold text-slate-300">Merged settings (effective)</h3>
                <div className="mt-2 overflow-x-auto rounded-lg border border-slate-700/80">
                  <table className="w-full min-w-[480px] text-left text-xs text-slate-300">
                    <tbody className="divide-y divide-slate-800">
                      {data.mergedSettings &&
                        Object.entries(data.mergedSettings).map(([k, v]) => (
                          <tr key={k}>
                            <th className="whitespace-nowrap px-3 py-2 font-medium text-slate-500 align-top">
                              {k}
                            </th>
                            <td className="px-3 py-2 break-all">
                              {typeof v === 'object' && v !== null
                                ? JSON.stringify(v)
                                : String(v)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {c.workspaceSettings != null ? (
                <div>
                  <h3 className="text-sm font-semibold text-slate-300">Workspace overrides (raw JSON)</h3>
                  <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-slate-700/80 bg-slate-900/80 p-3 text-[11px] text-slate-400">
                    {JSON.stringify(c.workspaceSettings, null, 2)}
                  </pre>
                </div>
              ) : null}
            </div>
          ) : tab === 'supporters' ? (
            <div className="overflow-x-auto rounded-lg border border-slate-700/80">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="bg-slate-800/80 text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">TikTok</th>
                    <th className="px-3 py-2">M-Pesa</th>
                    <th className="px-3 py-2">WhatsApp</th>
                    <th className="px-3 py-2">Subs / Pay</th>
                    <th className="px-3 py-2">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {data.supporters?.length ? (
                    data.supporters.map((u: any) => (
                      <tr key={u.id}>
                        <td className="px-3 py-2">
                          {u.name ?? '—'}
                          {!u.isActive ? (
                            <span className="ml-1 text-red-400">(inactive)</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">@{u.tiktokUsername ?? '—'}</td>
                        <td className="px-3 py-2">{u.mpesaMobile ?? '—'}</td>
                        <td className="px-3 py-2">{u.whatsappNumber ?? '—'}</td>
                        <td className="px-3 py-2">
                          {u._count?.subscriptions ?? 0} / {u._count?.payments ?? 0}
                        </td>
                        <td className="px-3 py-2 text-slate-500">{formatDate(u.createdAt)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                        No supporters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : tab === 'payments' ? (
            <div className="overflow-x-auto rounded-lg border border-slate-700/80">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead className="bg-slate-800/80 text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Purpose</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">User</th>
                    <th className="px-3 py-2">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {data.payments?.length ? (
                    data.payments.map((p: any) => (
                      <tr key={p.id}>
                        <td className="px-3 py-2 whitespace-nowrap text-slate-500">
                          {formatDate(p.createdAt)}
                        </td>
                        <td className="px-3 py-2">{p.purpose ?? '—'}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold ${getStatusBadge(String(p.status ?? 'PENDING'))}`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-medium text-white">{formatAmount(num(p.amount))}</td>
                        <td className="px-3 py-2">
                          {p.user?.name ?? '—'}{' '}
                          <span className="text-slate-500">
                            @{p.user?.tiktokUsername ?? '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2 max-w-[240px] text-slate-400">
                          {p.streamShoutout ? (
                            <span>
                              Shoutout @{p.streamShoutout.displayHandle} (
                              {shoutoutPlatformLabel(p.streamShoutout.platform)})
                            </span>
                          ) : null}
                          {p.creatorRewardPurchase ? (
                            <span>
                              Tier: {p.creatorRewardPurchase.rewardNameSnapshot} · from{' '}
                              {p.creatorRewardPurchase.displayName}
                            </span>
                          ) : null}
                          {!p.streamShoutout && !p.creatorRewardPurchase ? (
                            <span className="text-slate-600">—</span>
                          ) : null}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                        No payments
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : tab === 'subscriptions' ? (
            <div className="overflow-x-auto rounded-lg border border-slate-700/80">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-slate-800/80 text-slate-400">
                  <tr>
                    <th className="px-3 py-2">User</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Months</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Period</th>
                    <th className="px-3 py-2">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {data.subscriptions?.length ? (
                    data.subscriptions.map((s: any) => (
                      <tr key={s.id}>
                        <td className="px-3 py-2">
                          {s.user?.name ?? '—'}{' '}
                          <span className="text-slate-500">@{s.user?.tiktokUsername ?? '—'}</span>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold ${getStatusBadge(String(s.status ?? '').toLowerCase())}`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="px-3 py-2">{s.months ?? '—'}</td>
                        <td className="px-3 py-2">{formatAmount(num(s.amount))}</td>
                        <td className="px-3 py-2 text-slate-500">
                          {s.startDate ? formatDate(s.startDate) : '—'} →{' '}
                          {s.endDate ? formatDate(s.endDate) : '—'}
                        </td>
                        <td className="px-3 py-2 text-slate-500">{formatDate(s.createdAt)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                        No subscriptions
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : tab === 'shoutouts' ? (
            <div className="overflow-x-auto rounded-lg border border-slate-700/80">
              <table className="w-full min-w-[800px] text-left text-xs">
                <thead className="bg-slate-800/80 text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Handle</th>
                    <th className="px-3 py-2">Platform</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Payment</th>
                    <th className="px-3 py-2">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {data.streamShoutouts?.length ? (
                    data.streamShoutouts.map((s: any) => (
                      <tr key={s.id}>
                        <td className="px-3 py-2 whitespace-nowrap text-slate-500">
                          {formatDate(s.createdAt)}
                        </td>
                        <td className="px-3 py-2 font-medium">@{s.displayHandle}</td>
                        <td className="px-3 py-2">{shoutoutPlatformLabel(s.platform)}</td>
                        <td className="px-3 py-2">{formatAmount(num(s.amountKes))}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold ${getStatusBadge(String(s.payment?.status ?? 'PENDING'))}`}
                          >
                            {s.payment?.status}
                          </span>
                          <span className="ml-1 text-slate-500 font-mono text-[10px]">
                            {s.payment?.id?.slice(0, 8)}…
                          </span>
                        </td>
                        <td className="px-3 py-2 max-w-[280px] truncate text-slate-400">
                          {s.message ?? '—'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                        No shoutouts
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : tab === 'tiers' ? (
            <div className="overflow-x-auto rounded-lg border border-slate-700/80">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="bg-slate-800/80 text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Banner</th>
                    <th className="px-3 py-2">Price</th>
                    <th className="px-3 py-2">Active</th>
                    <th className="px-3 py-2">Order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {data.creatorRewards?.length ? (
                    data.creatorRewards.map((r: any) => (
                      <tr key={r.id}>
                        <td className="px-3 py-2 font-medium text-white">{r.name}</td>
                        <td className="px-3 py-2">{r.alertBannerLabel}</td>
                        <td className="px-3 py-2">{formatAmount(num(r.amountKes))}</td>
                        <td className="px-3 py-2">{r.active ? 'yes' : 'no'}</td>
                        <td className="px-3 py-2">{r.sortOrder}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                        No reward tiers
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : tab === 'obs' ? (
            <div className="overflow-x-auto rounded-lg border border-slate-700/80">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="bg-slate-800/80 text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Label</th>
                    <th className="px-3 py-2">Token</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {data.obsStreamLinks?.length ? (
                    data.obsStreamLinks.map((o: any) => (
                      <tr key={o.id}>
                        <td className="px-3 py-2">{o.label ?? '—'}</td>
                        <td className="px-3 py-2 font-mono text-[10px] break-all max-w-[200px]">
                          {o.token ? (
                            <span className="inline-flex items-center gap-1">
                              {o.token.slice(0, 12)}…
                              <button
                                type="button"
                                onClick={() => copyToken(o.token)}
                                className="shrink-0 rounded p-1 text-cyan-400 hover:bg-slate-800"
                                title="Copy token"
                              >
                                {copiedToken === o.token ? (
                                  <Check className="h-3.5 w-3.5" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {o.revokedAt ? (
                            <span className="text-red-400">Revoked</span>
                          ) : (
                            <span className="text-emerald-400">Active</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-500">{formatDate(o.createdAt)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                        No OBS stream links
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : tab === 'payouts' ? (
            <div className="overflow-x-auto rounded-lg border border-slate-700/80">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="bg-slate-800/80 text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Channel</th>
                    <th className="px-3 py-2">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {data.payoutRequests?.length ? (
                    data.payoutRequests.map((r: any) => (
                      <tr key={r.id}>
                        <td className="px-3 py-2 text-slate-500">{formatDate(r.createdAt)}</td>
                        <td className="px-3 py-2 font-medium text-white">
                          {formatAmount(num(r.amountKes))}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${payoutStatusBadgeClass(String(r.status))}`}
                          >
                            {payoutStatusLabel(String(r.status))}
                          </span>
                        </td>
                        <td className="px-3 py-2">{r.payoutChannel ?? '—'}</td>
                        <td className="px-3 py-2 max-w-[200px] truncate text-slate-500">
                          {r.notes ?? '—'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                        No payout requests
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-700/80">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="bg-slate-800/80 text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Service</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {data.coachingBookings?.length ? (
                    data.coachingBookings.map((b: any) => (
                      <tr key={b.id}>
                        <td className="px-3 py-2 text-slate-500">{formatDate(b.createdAt)}</td>
                        <td className="px-3 py-2">{b.name}</td>
                        <td className="px-3 py-2">{b.service}</td>
                        <td className="px-3 py-2">{b.status}</td>
                        <td className="px-3 py-2">
                          {b.payment ? (
                            <span>
                              <span
                                className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold ${getStatusBadge(String(b.payment.status ?? 'PENDING'))}`}
                              >
                                {b.payment.status}
                              </span>{' '}
                              {formatAmount(num(b.payment.amount))}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                        No coaching bookings linked to this creator&apos;s payments
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
