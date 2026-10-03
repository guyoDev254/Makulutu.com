'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Radio, Trash2 } from 'lucide-react'
import { creatorDashboardApi } from '@/lib/creator-dashboard-api'
import { formatApiErrorMessage } from '@/lib/api-origin'

export type ScheduledLiveRow = {
  id: string
  title: string
  description: string | null
  platform: string
  platformLabel: string
  startsAt: string
  endsAt: string | null
  streamUrl: string | null
  status: string
  effectiveStatus: string
}

const PLATFORMS = [
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'twitch', label: 'Twitch' },
  { id: 'kick', label: 'Kick' },
  { id: 'x', label: 'X' },
  { id: 'other', label: 'Other' },
]

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString('en-KE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function CreatorScheduledLivesPanel({
  showIntro = true,
}: {
  showIntro?: boolean
}) {
  const [rows, setRows] = useState<ScheduledLiveRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [platform, setPlatform] = useState('tiktok')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [streamUrl, setStreamUrl] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await creatorDashboardApi.get('/creator-portal/scheduled-lives')
      setRows(Array.isArray(res.data) ? res.data : [])
      setError(null)
    } catch (err) {
      setError(formatApiErrorMessage(err, 'Could not load scheduled lives'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const create = async () => {
    setSaving(true)
    setOk(null)
    try {
      await creatorDashboardApi.post('/creator-portal/scheduled-lives', {
        title,
        description: description.trim() || undefined,
        platform,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
        streamUrl: streamUrl.trim() || undefined,
      })
      setTitle('')
      setDescription('')
      setStartsAt('')
      setEndsAt('')
      setStreamUrl('')
      setOk('Live scheduled. Followers get an inbox alert.')
      await load()
    } catch (err) {
      setError(formatApiErrorMessage(err, 'Could not schedule this live'))
    } finally {
      setSaving(false)
    }
  }

  const act = async (id: string, action: 'go-live' | 'end' | 'cancel') => {
    try {
      await creatorDashboardApi.post(`/creator-portal/scheduled-lives/${id}/${action}`)
      await load()
    } catch (err) {
      setError(formatApiErrorMessage(err, 'Could not update live'))
    }
  }

  return (
    <div className="space-y-6">
      {showIntro ? (
        <div>
          <h2 className="text-xl font-semibold text-white">Schedule a live</h2>
          <p className="mt-1 text-sm text-gray-400">
            Tell fans when you go live, on which platform, and what the session is about. It shows on
            your public page and in the app.
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      {ok ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
          {ok}
        </p>
      ) : null}

      <form
        className="grid gap-4 rounded-2xl border border-gray-700 bg-gray-800/40 p-5 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          void create()
        }}
      >
        <label className="sm:col-span-2 text-sm">
          <span className="mb-1 block text-gray-300">Title</span>
          <input
            required
            minLength={3}
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Friday ranked grind"
            className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-gray-300">Platform</span>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white"
          >
            {PLATFORMS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-gray-300">Starts (your local time)</span>
          <input
            required
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-gray-300">Ends (optional)</span>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-gray-300">Watch link (optional)</span>
          <input
            type="url"
            value={streamUrl}
            onChange={(e) => setStreamUrl(e.target.value)}
            placeholder="https://tiktok.com/@you/live"
            className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white"
          />
        </label>
        <label className="sm:col-span-2 text-sm">
          <span className="mb-1 block text-gray-300">Description</span>
          <textarea
            maxLength={1000}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What fans should expect on stream"
            className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white"
          />
        </label>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={saving || !title.trim() || !startsAt}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
            Publish live
          </button>
        </div>
      </form>

      {loading ? (
        <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">No scheduled lives yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const liveNow = row.effectiveStatus === 'LIVE'
            const done =
              row.status === 'ENDED' ||
              row.status === 'CANCELLED' ||
              row.effectiveStatus === 'ENDED'
            return (
              <li
                key={row.id}
                className="rounded-xl border border-gray-700 bg-gray-800/50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{row.title}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {row.platformLabel} · {formatWhen(row.startsAt)}
                      {row.endsAt ? ` – ${formatWhen(row.endsAt)}` : ''}
                    </p>
                    {row.description ? (
                      <p className="mt-2 text-sm text-gray-300">{row.description}</p>
                    ) : null}
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                      liveNow
                        ? 'bg-red-500/20 text-red-200'
                        : done
                          ? 'bg-gray-700 text-gray-300'
                          : 'bg-violet-500/20 text-violet-200'
                    }`}
                  >
                    {liveNow ? 'Live' : row.status.toLowerCase()}
                  </span>
                </div>
                {!done ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!liveNow ? (
                      <button
                        type="button"
                        onClick={() => void act(row.id, 'go-live')}
                        className="rounded-lg bg-red-600/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
                      >
                        Mark live
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void act(row.id, 'end')}
                        className="rounded-lg bg-gray-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-500"
                      >
                        End live
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void act(row.id, 'cancel')}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-600 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700"
                    >
                      <Trash2 className="h-3 w-3" />
                      Cancel
                    </button>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
