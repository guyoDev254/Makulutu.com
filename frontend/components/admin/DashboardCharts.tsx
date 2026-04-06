'use client'

export type TrendPoint = {
  date: string
  label: string
  completedPayments: number
  revenueKes: number
  newSubscriptions: number
}

type Props = {
  series: TrendPoint[]
  payments: {
    completed: number
    pending: number
    failed: number
    total: number
  }
  formatKes: (amount: number) => string
  hideNumericAmounts: boolean
}

function sumWindow(points: TrendPoint[], lastN: number) {
  const slice = points.slice(-lastN)
  return slice.reduce(
    (acc, p) => ({
      revenue: acc.revenue + p.revenueKes,
      payments: acc.payments + p.completedPayments,
      subs: acc.subs + p.newSubscriptions,
    }),
    { revenue: 0, payments: 0, subs: 0 },
  )
}

function pctChange(prev: number, curr: number): number | null {
  if (prev <= 0 && curr <= 0) return null
  if (prev <= 0) return curr > 0 ? 100 : null
  return Math.round(((curr - prev) / prev) * 1000) / 10
}

export function DashboardCharts({
  series,
  payments,
  formatKes,
  hideNumericAmounts,
}: Props) {
  const last7 = sumWindow(series, 7)
  const prev7 = sumWindow(series.slice(0, -7), 7)
  const revDelta = pctChange(prev7.revenue, last7.revenue)
  const payDelta = pctChange(prev7.payments, last7.payments)
  const subDelta = pctChange(prev7.subs, last7.subs)

  const maxRev = Math.max(1, ...series.map((p) => p.revenueKes))
  const maxPay = Math.max(1, ...series.map((p) => p.completedPayments))
  const maxSub = Math.max(1, ...series.map((p) => p.newSubscriptions))
  const chartH = 112
  const gap = 4
  const n = series.length
  const barW = n > 0 ? Math.max(4, (300 - gap * (n - 1)) / n) : 4

  const totalPayStatus =
    payments.completed + payments.pending + payments.failed || 1
  const completedPct = (payments.completed / totalPayStatus) * 100
  const pendingPct = (payments.pending / totalPayStatus) * 100
  const failedPct = (payments.failed / totalPayStatus) * 100

  const Delta = ({ v }: { v: number | null }) => {
    if (v === null) return <span className="text-gray-500">—</span>
    const up = v > 0
    const down = v < 0
    return (
      <span
        className={
          up
            ? 'text-emerald-400'
            : down
              ? 'text-red-400'
              : 'text-gray-400'
        }
      >
        {up ? '↑' : down ? '↓' : '→'} {Math.abs(v)}%
        <span className="text-gray-500 font-normal"> vs prior week</span>
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-semibold text-white mb-1">
            Week-over-week performance
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Last 7 days compared to the 7 days before that (UTC calendar days).
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-lg bg-gray-900/40 border border-gray-700/60 p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">
                Revenue (7d)
              </p>
              <p className="text-2xl font-bold text-amber-300 mt-1 tabular-nums">
                {hideNumericAmounts ? '—' : formatKes(last7.revenue)}
              </p>
              <p className="text-sm mt-2">
                <Delta v={hideNumericAmounts ? null : revDelta} />
              </p>
            </div>
            <div className="rounded-lg bg-gray-900/40 border border-gray-700/60 p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">
                Completed payments (7d)
              </p>
              <p className="text-2xl font-bold text-emerald-300 mt-1 tabular-nums">
                {last7.payments}
              </p>
              <p className="text-sm mt-2">
                <Delta v={payDelta} />
              </p>
            </div>
            <div className="rounded-lg bg-gray-900/40 border border-gray-700/60 p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">
                New subscriptions (7d)
              </p>
              <p className="text-2xl font-bold text-sky-300 mt-1 tabular-nums">
                {last7.subs}
              </p>
              <p className="text-sm mt-2">
                <Delta v={subDelta} />
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-1">
            Payment outcomes
          </h3>
          <p className="text-xs text-gray-500 mb-4">All-time share by status</p>
          <div className="flex-1 flex flex-col justify-center gap-4 min-h-[140px]">
            <div className="h-4 w-full rounded-full overflow-hidden flex bg-gray-900/80 border border-gray-700/50">
              {completedPct > 0 && (
                <div
                  className="h-full bg-emerald-500/90 min-w-[2px]"
                  style={{ width: `${completedPct}%` }}
                  title={`Completed ${payments.completed}`}
                />
              )}
              {pendingPct > 0 && (
                <div
                  className="h-full bg-yellow-500/90 min-w-[2px]"
                  style={{ width: `${pendingPct}%` }}
                  title={`Pending ${payments.pending}`}
                />
              )}
              {failedPct > 0 && (
                <div
                  className="h-full bg-red-500/90 min-w-[2px]"
                  style={{ width: `${failedPct}%` }}
                  title={`Failed ${payments.failed}`}
                />
              )}
            </div>
            <ul className="text-xs space-y-1.5 w-full">
              <li className="flex justify-between gap-2">
                <span className="text-emerald-400">Completed</span>
                <span className="text-white font-medium tabular-nums">
                  {payments.completed}
                </span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-yellow-400">Pending</span>
                <span className="text-white font-medium tabular-nums">
                  {payments.pending}
                </span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-red-400">Failed</span>
                <span className="text-white font-medium tabular-nums">
                  {payments.failed}
                </span>
              </li>
              <li className="flex justify-between gap-2 pt-1 border-t border-gray-700/60 text-gray-400">
                <span>Total</span>
                <span className="tabular-nums">{payments.total}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 overflow-x-auto">
          <h3 className="text-lg font-semibold text-white mb-1">
            Daily revenue (14 days)
          </h3>
          <p className="text-xs text-gray-500 mb-4">Completed payments only (KES)</p>
          <svg
            width="100%"
            height={chartH + 28}
            viewBox={`0 0 320 ${chartH + 28}`}
            preserveAspectRatio="xMidYMid meet"
            className="min-w-[280px]"
          >
            {series.map((p, i) => {
              const h =
                hideNumericAmounts
                  ? 0
                  : (p.revenueKes / maxRev) * (chartH - 8)
              const x = i * (barW + gap)
              return (
                <g key={p.date}>
                  <rect
                    x={x}
                    y={chartH - h}
                    width={barW}
                    height={Math.max(h, 0)}
                    rx={2}
                    fill="rgb(251 191 36 / 0.85)"
                  />
                  <text
                    x={x + barW / 2}
                    y={chartH + 14}
                    textAnchor="middle"
                    className="fill-gray-500"
                    style={{ fontSize: 9 }}
                  >
                    {p.label.replace(' ', '')}
                  </text>
                </g>
              )
            })}
          </svg>
          {hideNumericAmounts ? (
            <p className="text-xs text-gray-500 mt-2">
              Revenue chart hidden for your role.
            </p>
          ) : (
            <p className="text-xs text-gray-500 mt-2">
              Peak day:{' '}
              <span className="text-amber-200/90">
                {formatKes(Math.max(...series.map((p) => p.revenueKes), 0))}
              </span>
            </p>
          )}
        </div>

        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 overflow-x-auto">
          <h3 className="text-lg font-semibold text-white mb-1">
            Activity (14 days)
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Completed payments (green) · New subscriptions (blue)
          </p>
          <svg
            width="100%"
            height={chartH + 28}
            viewBox={`0 0 320 ${chartH + 28}`}
            preserveAspectRatio="xMidYMid meet"
            className="min-w-[280px]"
          >
            {series.map((p, i) => {
              const hp = (p.completedPayments / maxPay) * (chartH - 8)
              const hs = (p.newSubscriptions / maxSub) * (chartH - 8)
              const x = i * (barW + gap)
              const w2 = Math.max(2, barW / 2 - 1)
              return (
                <g key={p.date}>
                  <rect
                    x={x}
                    y={chartH - hp}
                    width={w2}
                    height={Math.max(hp, 0)}
                    rx={2}
                    fill="rgb(52 211 153 / 0.85)"
                  />
                  <rect
                    x={x + w2 + 2}
                    y={chartH - hs}
                    width={w2}
                    height={Math.max(hs, 0)}
                    rx={2}
                    fill="rgb(56 189 248 / 0.85)"
                  />
                  <text
                    x={x + barW / 2}
                    y={chartH + 14}
                    textAnchor="middle"
                    className="fill-gray-500"
                    style={{ fontSize: 9 }}
                  >
                    {p.label.replace(' ', '')}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      </div>
    </div>
  )
}
