'use client'

import type { PaymentFeeLine } from '@/components/admin/types'

function purposeLabel(p: string | null | undefined): string {
  switch (p) {
    case 'SUBSCRIPTION':
      return 'Subscription'
    case 'STREAM_ALERT':
      return 'Shoutout'
    case 'COACHING_BOOKING':
      return 'Coaching'
    case 'CREATOR_REWARD':
      return 'Reward tier'
    default:
      return p ? String(p) : '—'
  }
}

export function PlatformFeeBreakdownTable(props: {
  lines: PaymentFeeLine[]
  platformFeePercent: number
  totalCompletedPayments: number
  linesLimit: number
  formatAmount: (n: number) => string
  formatDate: (iso: string | null | undefined) => string
  variant?: 'slate' | 'gray'
  summaryLabel?: string
}) {
  const {
    lines,
    platformFeePercent,
    totalCompletedPayments,
    linesLimit,
    formatAmount,
    formatDate,
    variant = 'slate',
    summaryLabel = 'Show per-payment fee calculation',
  } = props

  const border =
    variant === 'gray'
      ? 'border-gray-700/70 bg-gray-800/40'
      : 'border-slate-700/70 bg-slate-900/40'

  if (!lines.length && totalCompletedPayments === 0) {
    return (
      <div className={`rounded-2xl border p-4 text-sm text-slate-500 ${border}`}>
        No completed payments yet — nothing to break down.
      </div>
    )
  }

  const sampleFeeSum = lines.reduce((s, l) => s + l.feeKes, 0)
  const sampleNetSum = lines.reduce((s, l) => s + l.netKes, 0)
  const sampleGrossSum = lines.reduce((s, l) => s + l.amountKes, 0)
  const truncated = totalCompletedPayments > lines.length

  return (
    <details
      className={`group rounded-2xl border ${border} overflow-hidden`}
    >
      <summary className="cursor-pointer list-none px-4 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between gap-3 text-sm font-medium text-cyan-200/95 hover:bg-slate-800/30 [&::-webkit-details-marker]:hidden">
        <span>{summaryLabel}</span>
        <span className="text-xs font-normal text-slate-500 group-open:rotate-0">
          <span className="group-open:hidden">Expand</span>
          <span className="hidden group-open:inline">Collapse</span>
        </span>
      </summary>
      <div className="border-t border-slate-700/50 px-4 pb-4 pt-3 sm:px-5">
        <p className="text-xs text-slate-400 leading-relaxed mb-3">
          For each completed payment:{' '}
          <span className="text-slate-300 font-mono text-[11px]">
            fee = round(amount × {Number(platformFeePercent).toFixed(2)}% ÷ 100, 2 dp)
          </span>
          , then{' '}
          <span className="text-slate-300 font-mono text-[11px]">net = amount − fee</span> for that row.
          Card totals sum <strong className="text-slate-300">all</strong> completed payments, not only the
          sample below.
        </p>

        {lines.length > 0 ? (
          <>
            <div className="overflow-x-auto rounded-xl border border-slate-700/60">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Completed</th>
                    <th className="px-3 py-2 font-semibold">Type</th>
                    <th className="px-3 py-2 font-semibold text-right">Amount</th>
                    <th className="px-3 py-2 font-semibold text-right">Fee</th>
                    <th className="px-3 py-2 font-semibold text-right">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {lines.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-800/20">
                      <td className="px-3 py-2 whitespace-nowrap text-slate-500">
                        {row.completedAt ? formatDate(row.completedAt) : '—'}
                      </td>
                      <td className="px-3 py-2">{purposeLabel(row.purpose)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium text-white">
                        {formatAmount(row.amountKes)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-amber-200/90">
                        {formatAmount(row.feeKes)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-emerald-200/90">
                        {formatAmount(row.netKes)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
              <p>
                {truncated ? (
                  <>
                    Showing <strong className="text-slate-400">{lines.length}</strong> of{' '}
                    <strong className="text-slate-400">{totalCompletedPayments}</strong> payments (most recent
                    first, cap {linesLimit}).
                  </>
                ) : (
                  <>
                    All <strong className="text-slate-400">{totalCompletedPayments}</strong> completed payment
                    {totalCompletedPayments === 1 ? '' : 's'} listed.
                  </>
                )}
              </p>
              {truncated ? (
                <p className="sm:text-right">
                  Sample subtotal (this table only): gross {formatAmount(sampleGrossSum)} · fees{' '}
                  {formatAmount(sampleFeeSum)} · net {formatAmount(sampleNetSum)}
                </p>
              ) : (
                <p className="sm:text-right">
                  Listed totals: gross {formatAmount(sampleGrossSum)} · fees {formatAmount(sampleFeeSum)} · net{' '}
                  {formatAmount(sampleNetSum)} — matches dashboard cards.
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="text-xs text-slate-500">No line items to display.</p>
        )}
      </div>
    </details>
  )
}
