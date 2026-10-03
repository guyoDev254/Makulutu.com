'use client'

export type DashboardRangePreset =
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'last7'
  | 'last30'
  | 'custom'

const PRESETS = [
  ['today', 'Today'],
  ['yesterday', 'Yesterday'],
  ['thisWeek', 'This week'],
  ['last7', 'Last 7 days'],
  ['last30', 'Last 30 days'],
] as const

function nairobiTodayYmd() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

type Props = {
  preset: DashboardRangePreset
  from: string
  to: string
  periodLabel?: string | null
  accent?: 'cyan' | 'violet' | 'amber'
  title?: string
  onPreset: (id: Exclude<DashboardRangePreset, 'custom'>) => void
  onCustomStart: (ymd: string) => void
  onFromChange: (ymd: string) => void
  onToChange: (ymd: string) => void
  onApplyCustom: () => void
}

export function DashboardRangeControls({
  preset,
  from,
  to,
  periodLabel,
  accent = 'cyan',
  title = 'Your day and week',
  onPreset,
  onCustomStart,
  onFromChange,
  onToChange,
  onApplyCustom,
}: Props) {
  const on =
    accent === 'violet'
      ? 'bg-violet-600 text-white ring-2 ring-violet-400/40'
      : accent === 'amber'
        ? 'bg-amber-600 text-white ring-2 ring-amber-400/50'
        : 'bg-cyan-600 text-white ring-2 ring-cyan-400/40'
  const off = 'bg-slate-800 text-slate-200 hover:bg-slate-700'

  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-900/40 p-4 sm:p-5">
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          {periodLabel ? `${periodLabel} · Nairobi time` : 'Pick a day or week to see completed support'}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => onPreset(id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              preset === id ? on : off
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onCustomStart(nairobiTodayYmd())}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
            preset === 'custom' ? on : off
          }`}
        >
          Custom
        </button>
      </div>
      {preset === 'custom' ? (
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => onFromChange(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-600 rounded-lg text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => onToChange(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-600 rounded-lg text-white text-sm"
            />
          </div>
          <button
            type="button"
            onClick={onApplyCustom}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
              accent === 'violet'
                ? 'bg-violet-600 hover:bg-violet-500'
                : accent === 'amber'
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : 'bg-cyan-600 hover:bg-cyan-500'
            }`}
          >
            Apply
          </button>
        </div>
      ) : null}
    </div>
  )
}
