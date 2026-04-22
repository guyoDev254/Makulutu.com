'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AxiosInstance } from 'axios'
import { normalizeRewardAccentHex, rgbaHex } from '@/lib/reward-tier-accent'
import {
  CreditCard,
  Eye,
  Gift,
  GripVertical,
  Loader2,
  Megaphone,
  Plus,
  Sparkles,
  Store,
  Type,
  X,
} from 'lucide-react'

/** Tokens supported by backend `renderCreatorRewardTts` — shown as friendly insert buttons. */
const TTS_SNIPPETS: {
  label: string
  token: string
  plain: string
}[] = [
  {
    label: 'Supporter name',
    token: '{{displayName}}',
    plain: 'The name or handle they enter at checkout (shown on stream).',
  },
  {
    label: 'Tier name',
    token: '{{rewardName}}',
    plain: 'This reward tier’s title (the “Name” field above).',
  },
  {
    label: 'Amount paid',
    token: '{{amount}}',
    plain: 'How much they paid in shillings (number only).',
  },
  {
    label: 'Their message',
    token: '{{message}}',
    plain: 'What they typed in the optional message box (empty if they leave it blank).',
  },
]

type RewardRow = {
  id: string
  name: string
  description: string | null
  amountKes: number
  alertBannerLabel: string
  ttsScript: string | null
  allowSupporterMessage: boolean
  allowVideoClip: boolean
  maxMessageLength: number
  active: boolean
  sortOrder: number
  accentColor?: string | null
}

const ACCENT_PICKER_FALLBACK = '#f59e0b'

const TIER_PURCHASES_PAGE_SIZE = 20

const emptyForm = {
  name: '',
  description: '',
  amountKes: '100',
  alertBannerLabel: 'SUPPORTER!',
  ttsScript: '',
  allowSupporterMessage: true,
  allowVideoClip: false,
  maxMessageLength: '200',
  sortOrder: '0',
  active: true,
  accentColor: '',
}

export function AdminRewardsPanel({
  rewards,
  loading,
  saveReward,
  reorderRewards,
  formatAmountForRole,
  formatDate,
  getStatusBadge,
  openTierPurchaseDetail,
  canManageRewardTiers,
  paymentsClient,
  paymentsPathPrefix,
  panelScope = 'creator',
}: {
  rewards: RewardRow[]
  loading: boolean
  saveReward: (body: Record<string, unknown>, id?: string) => Promise<boolean>
  reorderRewards: (orderedIds: string[]) => Promise<boolean>
  formatAmountForRole: (n: number) => string
  formatDate: (iso: string) => string
  getStatusBadge: (status: string) => string
  openTierPurchaseDetail: (paymentId: string) => void
  canManageRewardTiers: boolean
  paymentsClient: AxiosInstance
  paymentsPathPrefix: string
  /** `platform` = site admin view (all creators); `creator` = single streamer workspace */
  panelScope?: 'platform' | 'creator'
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const ttsTextareaRef = useRef<HTMLTextAreaElement>(null)
  const [orderIds, setOrderIds] = useState<string[]>([])
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [reorderSaving, setReorderSaving] = useState(false)
  const [tierFormSaving, setTierFormSaving] = useState(false)
  const [tierFormAttempted, setTierFormAttempted] = useState(false)
  const [viewingTier, setViewingTier] = useState<RewardRow | null>(null)
  const [tierPurchasePage, setTierPurchasePage] = useState(1)
  const [tierPurchaseRows, setTierPurchaseRows] = useState<any[]>([])
  const [tierPurchasesLoading, setTierPurchasesLoading] = useState(false)
  const [tierPurchasesError, setTierPurchasesError] = useState<string | null>(null)
  const [tierPurchasesPagination, setTierPurchasesPagination] = useState({
    total: 0,
    totalPages: 0,
  })

  const openTierView = useCallback((r: RewardRow) => {
    setTierPurchasePage(1)
    setViewingTier(r)
  }, [])

  const closeTierView = useCallback(() => {
    setViewingTier(null)
    setTierPurchaseRows([])
    setTierPurchasesError(null)
    setTierPurchasePage(1)
  }, [])

  useEffect(() => {
    if (!viewingTier) return
    let cancelled = false
    ;(async () => {
      setTierPurchasesLoading(true)
      setTierPurchasesError(null)
      try {
        const params = new URLSearchParams({
          page: String(tierPurchasePage),
          limit: String(TIER_PURCHASES_PAGE_SIZE),
          purpose: 'CREATOR_REWARD',
          rewardId: viewingTier.id,
          status: 'COMPLETED',
        })
        const res = await paymentsClient.get(`${paymentsPathPrefix}/payments?${params}`)
        if (cancelled) return
        setTierPurchaseRows(res.data.data || [])
        const p = res.data.pagination
        setTierPurchasesPagination({
          total: p?.total ?? 0,
          totalPages: p?.totalPages ?? 0,
        })
      } catch (e: unknown) {
        const err = e as { response?: { data?: { message?: string } } }
        if (!cancelled) {
          setTierPurchasesError(err.response?.data?.message || 'Could not load purchases for this tier.')
          setTierPurchaseRows([])
        }
      } finally {
        if (!cancelled) setTierPurchasesLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [viewingTier, tierPurchasePage, paymentsClient, paymentsPathPrefix])

  const syncSignature = rewards.map((r) => `${r.id}:${r.sortOrder}`).join('|')
  useEffect(() => {
    setOrderIds(rewards.map((r) => r.id))
  }, [syncSignature])

  const displayRewards = useMemo(() => {
    const m = new Map(rewards.map((r) => [r.id, r]))
    const out: RewardRow[] = []
    for (const id of orderIds) {
      const row = m.get(id)
      if (row) out.push(row)
    }
    for (const r of rewards) {
      if (!orderIds.includes(r.id)) out.push(r)
    }
    return out
  }, [rewards, orderIds])

  const handleReorderDrop = async (sourceId: string, targetId: string) => {
    if (sourceId === targetId || reorderSaving) return
    const i = orderIds.indexOf(sourceId)
    const j = orderIds.indexOf(targetId)
    if (i < 0 || j < 0) return
    const next = [...orderIds]
    next.splice(i, 1)
    next.splice(j, 0, sourceId)
    const prev = orderIds
    setOrderIds(next)
    setReorderSaving(true)
    const ok = await reorderRewards(next)
    setReorderSaving(false)
    if (!ok) setOrderIds(prev)
  }

  const insertTtsSnippet = (token: string) => {
    const el = ttsTextareaRef.current
    const maxLen = 600
    if (!el) {
      setForm((f) => {
        const cur = f.ttsScript
        const needsSpace = cur.length > 0 && !/\s$/.test(cur)
        return { ...f, ttsScript: (cur + (needsSpace ? ' ' : '') + token).slice(0, maxLen) }
      })
      return
    }
    const start = el.selectionStart
    const end = el.selectionEnd
    const cur = form.ttsScript
    const before = cur.slice(0, start)
    const after = cur.slice(end)
    const needsSpace = before.length > 0 && !/\s$/.test(before)
    const inserted = before + (needsSpace ? ' ' : '') + token + after
    const next = inserted.slice(0, maxLen)
    setForm((f) => ({ ...f, ttsScript: next }))
    requestAnimationFrame(() => {
      el.focus()
      const pos = Math.min(start + (needsSpace ? 1 : 0) + token.length, next.length)
      el.setSelectionRange(pos, pos)
    })
  }

  const startEdit = (r: RewardRow) => {
    setEditingId(r.id)
    setTierFormAttempted(false)
    setForm({
      name: r.name,
      description: r.description || '',
      amountKes: String(r.amountKes),
      alertBannerLabel: r.alertBannerLabel,
      ttsScript: r.ttsScript || '',
      allowSupporterMessage: r.allowSupporterMessage,
      allowVideoClip: r.allowVideoClip,
      maxMessageLength: String(r.maxMessageLength),
      sortOrder: String(r.sortOrder),
      active: r.active,
      accentColor: r.accentColor ?? '',
    })
  }

  const resetNew = () => {
    setEditingId(null)
    setForm(emptyForm)
    setTierFormAttempted(false)
  }

  const tierFormValidation = (() => {
    const name = form.name.trim()
    const banner = form.alertBannerLabel.trim()
    const amountKes = Math.round(Number(form.amountKes))
    if (name.length < 2) {
      return 'Tier name must be at least 2 characters.'
    }
    if (banner.length < 2) {
      return 'OBS banner must be at least 2 characters.'
    }
    if (!Number.isFinite(amountKes) || amountKes < 1) {
      return 'Enter a valid price (KES, minimum 1).'
    }
    return null as string | null
  })()

  const accentPreview = normalizeRewardAccentHex(form.accentColor)

  const submit = async () => {
    setTierFormAttempted(true)
    if (tierFormValidation) return
    const amountKes = Math.round(Number(form.amountKes))
    const parsedAccent = normalizeRewardAccentHex(form.accentColor)
    const body: Record<string, unknown> = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      amountKes,
      alertBannerLabel: form.alertBannerLabel.trim(),
      ttsScript: form.ttsScript.trim() || undefined,
      allowSupporterMessage: form.allowSupporterMessage,
      allowVideoClip: form.allowVideoClip,
      maxMessageLength: Math.min(500, Math.max(0, Math.round(Number(form.maxMessageLength)))),
      sortOrder: Math.max(0, Math.round(Number(form.sortOrder)) || 0),
      active: form.active,
    }
    if (editingId) {
      body.accentColor = parsedAccent
    } else if (parsedAccent) {
      body.accentColor = parsedAccent
    }
    setTierFormSaving(true)
    const ok = await saveReward(body, editingId ?? undefined)
    setTierFormSaving(false)
    if (ok) {
      resetNew()
    }
  }

  if (!canManageRewardTiers) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-8 text-center">
        <p className="text-amber-400">Only Admin or Super Admin can manage reward tiers.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/25">
              <Gift className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {panelScope === 'platform' ? 'Reward tiers (platform view)' : 'Reward tiers'}
              </h2>
              <p className="text-sm text-gray-400 mt-1 max-w-2xl">
                {panelScope === 'platform' ? (
                  <>
                    List spans <span className="text-gray-300">all creators</span> for oversight and support. New tiers
                    attach to the default platform creator unless you manage them from a specific creator login. Fans still
                    checkout on each creator’s public URL; OBS shows that creator’s banner and optional TTS line.
                  </>
                ) : (
                  <>
                    Fans pay a fixed price on your public support page as a support tier; OBS shows your banner and can
                    read a custom line aloud. Use <span className="text-gray-300">Insert:</span> for name, tier, amount,
                    and message. <span className="text-gray-300">Drag the grip</span> in the table to set tier order on
                    your support page (sort order updates automatically).
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetNew}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-500 px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            New tier
          </button>
        </div>

        {loading ? (
          <div className="mt-8 flex items-center gap-2 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading…
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-lg border border-gray-700/50">
            {reorderSaving && (
              <div className="flex items-center gap-2 border-b border-gray-700/50 bg-gray-900/50 px-3 py-2 text-xs text-amber-200/90">
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden />
                Saving order…
              </div>
            )}
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="bg-gray-700/40 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <th className="px-2 py-2 w-10" aria-label="Reorder" />
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2 text-right">KES</th>
                  <th className="px-3 py-2">Banner</th>
                  <th className="px-3 py-2">Flags</th>
                  <th className="px-3 py-2">Sort</th>
                  <th className="px-3 py-2">Active</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/40">
                {displayRewards.map((r) => {
                  const rowAccent = normalizeRewardAccentHex(r.accentColor ?? '')
                  return (
                  <tr
                    key={r.id}
                    onDragOver={(e) => {
                      if (!draggingId || reorderSaving) return
                      e.preventDefault()
                      e.dataTransfer.dropEffect = 'move'
                      setOverId(r.id)
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      const sourceId = e.dataTransfer.getData('text/plain')
                      setOverId(null)
                      if (!sourceId) return
                      void handleReorderDrop(sourceId, r.id)
                    }}
                    className={`hover:bg-gray-700/15 transition-colors ${
                      overId === r.id && draggingId && draggingId !== r.id
                        ? 'bg-amber-500/10 ring-1 ring-inset ring-amber-500/35'
                        : ''
                    } ${draggingId === r.id ? 'opacity-60' : ''}`}
                  >
                    <td className="px-2 py-2 align-middle">
                      <div
                        draggable={!reorderSaving}
                        title="Drag to reorder tiers"
                        aria-label={`Drag to reorder tier: ${r.name}`}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', r.id)
                          e.dataTransfer.effectAllowed = 'move'
                          setDraggingId(r.id)
                        }}
                        onDragEnd={() => {
                          setDraggingId(null)
                          setOverId(null)
                        }}
                        className={`flex h-9 w-9 cursor-grab touch-none items-center justify-center rounded-md border border-transparent text-gray-500 hover:border-gray-600 hover:bg-gray-800/80 hover:text-gray-300 active:cursor-grabbing ${
                          reorderSaving ? 'cursor-not-allowed opacity-40' : ''
                        }`}
                      >
                        <GripVertical className="h-4 w-4" aria-hidden />
                      </div>
                    </td>
                    <td className="px-3 py-2 text-white font-medium">
                      <div className="flex items-center gap-2 min-w-0">
                        {rowAccent ? (
                          <span
                            className="h-3.5 w-3.5 shrink-0 rounded-sm ring-1 ring-white/25"
                            style={{ backgroundColor: rowAccent }}
                            title={rowAccent}
                          />
                        ) : null}
                        <span className="truncate">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-gray-200 tabular-nums">
                      {formatAmountForRole(r.amountKes)}
                    </td>
                    <td className="px-3 py-2 text-gray-300 max-w-[140px] truncate" title={r.alertBannerLabel}>
                      {r.alertBannerLabel}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {r.allowSupporterMessage ? 'msg ' : ''}
                      {r.allowVideoClip ? 'clip' : ''}
                    </td>
                    <td className="px-3 py-2 text-gray-400 tabular-nums">{r.sortOrder}</td>
                    <td className="px-3 py-2">{r.active ? 'Yes' : 'No'}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openTierView(r)}
                          className="inline-flex items-center gap-1 rounded-md border border-gray-600 bg-gray-800/80 px-2 py-1 text-xs font-semibold text-gray-200 hover:border-gray-500 hover:bg-gray-700"
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden />
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(r)}
                          className="text-amber-400 hover:text-amber-300 text-xs font-semibold"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
            {displayRewards.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-gray-500">No tiers yet — create one below.</p>
            )}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-700/50 bg-gray-800/50 backdrop-blur-sm shadow-lg shadow-black/20">
        <div className="border-b border-gray-700/50 bg-gradient-to-r from-gray-900/80 via-gray-900/40 to-transparent px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/25">
                <Sparkles className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight text-white sm:text-xl">
                  {editingId ? 'Edit tier' : 'Create tier'}
                </h3>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-gray-400">
                  {editingId
                    ? 'Update how this tier appears on the support page and what the stream shows when someone pays.'
                    : 'Set the public title, price, and optional stream voice line. You can reorder tiers anytime with the grip in the table above.'}
                </p>
              </div>
            </div>
            {editingId && (
              <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-amber-500/35 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
                Editing existing tier
              </span>
            )}
          </div>
        </div>

        <div className="space-y-8 p-5 sm:p-6">
          {tierFormAttempted && tierFormValidation && (
            <div
              className="rounded-lg border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-200"
              role="alert"
            >
              {tierFormValidation}
            </div>
          )}

          {/* Public support page */}
          <section aria-labelledby="tier-section-public">
            <div className="mb-3 flex items-center gap-2">
              <Store className="h-4 w-4 text-amber-400/90" aria-hidden />
              <h4 id="tier-section-public" className="text-xs font-bold uppercase tracking-wider text-gray-300">
                Support page
              </h4>
            </div>
            <div className="space-y-4 rounded-xl border border-gray-700/60 bg-gray-900/30 p-4 sm:p-5">
              <div>
                <div className="mb-1.5 flex flex-wrap items-end justify-between gap-2">
                  <label htmlFor="tier-name" className="text-sm font-medium text-gray-200">
                    Tier name
                  </label>
                  <span className="text-xs tabular-nums text-gray-500">
                    {form.name.length}/80
                  </span>
                </div>
                <input
                  id="tier-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value.slice(0, 80) }))}
                  maxLength={80}
                  placeholder="e.g. Tier name shown at checkout"
                  className="w-full rounded-lg border border-gray-600 bg-gray-950/80 px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/25"
                />
                <p className="mt-1.5 text-xs text-gray-500">Shown as the card title on the public support page.</p>
              </div>
              <div>
                <div className="mb-1.5 flex flex-wrap items-end justify-between gap-2">
                  <label htmlFor="tier-desc" className="text-sm font-medium text-gray-200">
                    Description
                  </label>
                  <span className="text-xs tabular-nums text-gray-500">
                    {form.description.length}/4000
                  </span>
                </div>
                <textarea
                  id="tier-desc"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value.slice(0, 4000) }))}
                  rows={3}
                  maxLength={4000}
                  placeholder="Short text on the public support card (optional)."
                  className="w-full resize-y rounded-lg border border-gray-600 bg-gray-950/80 px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/25"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="tier-price" className="mb-1.5 block text-sm font-medium text-gray-200">
                    Price (KES)
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-500">
                      KES
                    </span>
                    <input
                      id="tier-price"
                      type="number"
                      min={1}
                      max={500_000}
                      value={form.amountKes}
                      onChange={(e) => setForm((f) => ({ ...f, amountKes: e.target.value }))}
                      className="w-full rounded-lg border border-gray-600 bg-gray-950/80 py-2.5 pl-12 pr-3 text-sm text-white tabular-nums focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/25"
                    />
                  </div>
                </div>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-700/80 bg-gray-950/40 p-4 transition hover:border-gray-600">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 rounded border-gray-600 bg-gray-900 text-amber-600 focus:ring-amber-500/40"
                  />
                  <span>
                    <span className="block text-sm font-medium text-white">Visible on support page</span>
                    <span className="mt-0.5 block text-xs text-gray-500">
                      Turn off to hide the tier without deleting it.
                    </span>
                  </span>
                </label>
              </div>
              <div className="border-t border-gray-700/50 pt-4">
                <label htmlFor="tier-accent-hex" className="text-sm font-medium text-gray-200">
                  Subscribe card color
                </label>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  Optional accent for this tier’s card on the public support page (border, price, buttons). Leave
                  default for the standard amber look.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <input
                    id="tier-accent-picker"
                    type="color"
                    aria-label="Pick card accent color"
                    value={normalizeRewardAccentHex(form.accentColor) || ACCENT_PICKER_FALLBACK}
                    onChange={(e) => setForm((f) => ({ ...f, accentColor: e.target.value }))}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-gray-600 bg-gray-950 p-1"
                  />
                  <input
                    id="tier-accent-hex"
                    type="text"
                    value={form.accentColor}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        accentColor: e.target.value.slice(0, 7),
                      }))
                    }
                    placeholder="#a855f7"
                    spellCheck={false}
                    className="w-[7.5rem] rounded-lg border border-gray-600 bg-gray-950/80 px-3 py-2 font-mono text-sm text-white placeholder:text-gray-600 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/25"
                  />
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, accentColor: '' }))}
                    className="rounded-lg border border-gray-600 bg-gray-800/80 px-3 py-2 text-xs font-medium text-gray-300 hover:border-gray-500 hover:bg-gray-700"
                  >
                    Site default
                  </button>
                </div>
                <div
                  className="mt-3 rounded-lg border px-3 py-2 text-xs text-gray-400"
                  style={{
                    borderColor: accentPreview
                      ? rgbaHex(accentPreview, 0.35)
                      : 'rgba(245, 158, 11, 0.25)',
                    background: accentPreview
                      ? `linear-gradient(to right, ${rgbaHex(accentPreview, 0.14)}, transparent)`
                      : undefined,
                  }}
                >
                  Preview: supporters see this tier as a card with this accent (or amber if default).
                </div>
              </div>
            </div>
          </section>

          {/* OBS / stream */}
          <section aria-labelledby="tier-section-stream">
            <div className="mb-3 flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-amber-400/90" aria-hidden />
              <h4 id="tier-section-stream" className="text-xs font-bold uppercase tracking-wider text-gray-300">
                Stream overlay
              </h4>
            </div>
            <div className="space-y-4 rounded-xl border border-gray-700/60 bg-gray-900/30 p-4 sm:p-5">
              <div>
                <div className="mb-1.5 flex flex-wrap items-end justify-between gap-2">
                  <label htmlFor="tier-banner" className="text-sm font-medium text-gray-200">
                    OBS banner text
                  </label>
                  <span className="text-xs tabular-nums text-gray-500">
                    {form.alertBannerLabel.length}/40
                  </span>
                </div>
                <input
                  id="tier-banner"
                  value={form.alertBannerLabel}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, alertBannerLabel: e.target.value.slice(0, 40) }))
                  }
                  maxLength={40}
                  placeholder="Short label on screen"
                  className="w-full rounded-lg border border-gray-600 bg-gray-950/80 px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/25"
                />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-gray-500">Preview:</span>
                  <span className="inline-flex max-w-full truncate rounded-md border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-amber-100">
                    {form.alertBannerLabel.trim() || 'YOUR BANNER'}
                  </span>
                </div>
              </div>
              <div>
                <div className="mb-1.5 flex items-center gap-2">
                  <Type className="h-3.5 w-3.5 text-gray-500" aria-hidden />
                  <label htmlFor="tier-tts" className="text-sm font-medium text-gray-200">
                    What the stream says aloud <span className="font-normal text-gray-500">(optional)</span>
                  </label>
                </div>
                <p className="mb-3 text-xs leading-relaxed text-gray-500">
                  Leave empty for a simple default line. Otherwise write a sentence and use inserts for live details.
                </p>
                <div className="mb-3 flex flex-wrap gap-2">
                  {TTS_SNIPPETS.map(({ label, token }) => (
                    <button
                      key={token}
                      type="button"
                      onClick={() => insertTtsSnippet(token)}
                      className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-100 transition hover:border-amber-400/50 hover:bg-amber-500/20"
                    >
                      + {label}
                    </button>
                  ))}
                </div>
                <textarea
                  id="tier-tts"
                  ref={ttsTextareaRef}
                  value={form.ttsScript}
                  onChange={(e) => setForm((f) => ({ ...f, ttsScript: e.target.value }))}
                  rows={4}
                  maxLength={600}
                  placeholder="Example: Big thanks to {{displayName}} for {{rewardName}} — {{amount}} shillings!"
                  className="w-full resize-y rounded-lg border border-gray-600 bg-gray-950/80 px-3 py-2.5 text-sm leading-relaxed text-white placeholder:text-gray-600 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/25"
                  spellCheck
                />
                <p className="mt-1.5 text-xs tabular-nums text-gray-500">{form.ttsScript.length} / 600</p>
                <details className="mt-3 rounded-lg border border-gray-700/60 bg-gray-950/50 px-3 py-2 text-xs text-gray-400">
                  <summary className="cursor-pointer select-none font-medium text-gray-300 hover:text-white">
                    Insert tokens reference
                  </summary>
                  <ul className="mt-2 space-y-2 pl-0.5 list-none">
                    {TTS_SNIPPETS.map(({ label, token, plain }) => (
                      <li key={token} className="leading-snug">
                        <span className="text-gray-300">{label}</span>
                        <span className="text-gray-500"> — {plain} </span>
                        <code className="rounded bg-gray-800 px-1 py-0.5 font-mono text-[10px] text-amber-200/90">
                          {token}
                        </code>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 border-t border-gray-700/50 pt-2 text-gray-500">
                    Aliases: <code className="text-amber-200/80">{`{{name}}`}</code>,{' '}
                    <code className="text-amber-200/80">{`{{reward}}`}</code>
                  </p>
                </details>
              </div>
            </div>
          </section>

          {/* Checkout options */}
          <section aria-labelledby="tier-section-checkout">
            <div className="mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-amber-400/90" aria-hidden />
              <h4 id="tier-section-checkout" className="text-xs font-bold uppercase tracking-wider text-gray-300">
                Checkout options
              </h4>
            </div>
            <div className="space-y-3 rounded-xl border border-gray-700/60 bg-gray-900/30 p-4 sm:p-5">
              <label className="flex cursor-pointer gap-3 rounded-lg border border-transparent p-2 transition hover:bg-gray-950/50">
                <input
                  type="checkbox"
                  checked={form.allowSupporterMessage}
                  onChange={(e) => setForm((f) => ({ ...f, allowSupporterMessage: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-600 bg-gray-900 text-amber-600 focus:ring-amber-500/40"
                />
                <span>
                  <span className="block text-sm font-medium text-white">Optional supporter message</span>
                  <span className="mt-0.5 block text-xs text-gray-500">
                    Lets them add a short note at checkout (shown on stream if you use inserts).
                  </span>
                </span>
              </label>
              <div
                className={`grid gap-3 sm:grid-cols-2 sm:gap-4 ${!form.allowSupporterMessage ? 'opacity-45' : ''}`}
              >
                <div>
                  <label htmlFor="tier-maxmsg" className="mb-1.5 block text-sm font-medium text-gray-200">
                    Max message length
                  </label>
                  <input
                    id="tier-maxmsg"
                    type="number"
                    min={0}
                    max={500}
                    disabled={!form.allowSupporterMessage}
                    value={form.maxMessageLength}
                    onChange={(e) => setForm((f) => ({ ...f, maxMessageLength: e.target.value }))}
                    className="w-full rounded-lg border border-gray-600 bg-gray-950/80 px-3 py-2.5 text-sm text-white tabular-nums focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/25 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
              <label className="flex cursor-pointer gap-3 rounded-lg border border-transparent p-2 transition hover:bg-gray-950/50">
                <input
                  type="checkbox"
                  checked={form.allowVideoClip}
                  onChange={(e) => setForm((f) => ({ ...f, allowVideoClip: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-600 bg-gray-900 text-amber-600 focus:ring-amber-500/40"
                />
                <span>
                  <span className="block text-sm font-medium text-white">Allow TikTok clip URL</span>
                  <span className="mt-0.5 block text-xs text-gray-500">
                    Requires price at least the “min with video” amount from Settings / shoutout rules.
                  </span>
                </span>
              </label>
            </div>
          </section>

          <details className="group rounded-xl border border-gray-700/50 bg-gray-900/20 open:border-amber-500/20 open:bg-gray-900/35">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-gray-300 transition hover:text-white [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                <span className="text-gray-500 group-open:text-amber-400/90">▸</span>
                Advanced — sort order
              </span>
              <span className="mt-1 block text-xs font-normal text-gray-500 group-open:hidden">
                Optional number; table drag-to-reorder updates this automatically.
              </span>
            </summary>
            <div className="border-t border-gray-700/50 px-4 pb-4 pt-3">
              <label htmlFor="tier-sort" className="mb-1.5 block text-sm font-medium text-gray-200">
                Sort order
              </label>
              <input
                id="tier-sort"
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                className="max-w-[140px] rounded-lg border border-gray-600 bg-gray-950/80 px-3 py-2.5 text-sm text-white tabular-nums focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/25"
              />
              <p className="mt-2 text-xs text-gray-500">
                Lower numbers appear first on the support page. Reordering rows with the grip in the table above
                rewrites these values.
              </p>
            </div>
          </details>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-gray-700/50 bg-gray-900/50 px-5 py-4 sm:px-6">
          <button
            type="button"
            disabled={tierFormSaving}
            onClick={() => void submit()}
            className="inline-flex min-h-[42px] min-w-[140px] items-center justify-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-900/20 transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {tierFormSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : editingId ? (
              'Save changes'
            ) : (
              'Create tier'
            )}
          </button>
          {editingId && (
            <button
              type="button"
              disabled={tierFormSaving}
              onClick={resetNew}
              className="rounded-lg border border-gray-600 bg-gray-800/80 px-4 py-2.5 text-sm font-medium text-gray-200 transition hover:border-gray-500 hover:bg-gray-700 disabled:opacity-50"
            >
              Cancel edit
            </button>
          )}
        </div>
      </div>

      {viewingTier && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label="Close tier details"
            onClick={closeTierView}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tier-view-title"
            className="relative flex max-h-[min(90vh,880px)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-gray-600 bg-gray-800 shadow-2xl"
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-700 px-5 py-4">
              <div className="min-w-0">
                <h2 id="tier-view-title" className="text-lg font-bold text-white">
                  Tier details
                </h2>
                <p className="mt-0.5 truncate text-sm font-semibold text-amber-200/95" title={viewingTier.name}>
                  {viewingTier.name}
                </p>
              </div>
              <button
                type="button"
                onClick={closeTierView}
                className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-gray-700 hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-6">
              <div className="rounded-lg border border-gray-700/80 bg-gray-900/40 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Configuration</h3>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-gray-500">Price</dt>
                    <dd className="font-medium text-white">{formatAmountForRole(viewingTier.amountKes)}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Sort order</dt>
                    <dd className="text-gray-200 tabular-nums">{viewingTier.sortOrder}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Active on support page</dt>
                    <dd className="text-gray-200">{viewingTier.active ? 'Yes' : 'No'}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">OBS banner label</dt>
                    <dd className="font-mono text-xs text-amber-100/90 break-words">{viewingTier.alertBannerLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Flags</dt>
                    <dd className="text-gray-300">
                      {viewingTier.allowSupporterMessage ? 'Message allowed' : 'No message'}
                      {' · '}
                      {viewingTier.allowVideoClip ? 'Clip allowed' : 'No clip'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Max message length</dt>
                    <dd className="text-gray-200 tabular-nums">{viewingTier.maxMessageLength}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-gray-500">Tier ID</dt>
                    <dd className="font-mono text-xs text-gray-400 break-all">{viewingTier.id}</dd>
                  </div>
                </dl>
                {viewingTier.description?.trim() ? (
                  <div className="mt-4 border-t border-gray-700/60 pt-4">
                    <h4 className="text-xs font-semibold text-gray-500">Public description</h4>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-gray-300">{viewingTier.description}</p>
                  </div>
                ) : null}
                {viewingTier.ttsScript?.trim() ? (
                  <div className="mt-4 border-t border-gray-700/60 pt-4">
                    <h4 className="text-xs font-semibold text-gray-500">TTS script</h4>
                    <pre className="mt-2 max-h-36 overflow-auto rounded-md border border-gray-700/80 bg-black/30 p-3 text-xs text-gray-200 whitespace-pre-wrap break-words">
                      {viewingTier.ttsScript}
                    </pre>
                  </div>
                ) : null}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-white">Completed purchases</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Successful (completed) checkouts only. Open a row for full payment and supporter fields (same as Tier
                  purchases tab). Pending or failed rows are not listed here.
                </p>
                {tierPurchasesError ? (
                  <p className="mt-3 text-sm text-red-400">{tierPurchasesError}</p>
                ) : null}
                {tierPurchasesLoading ? (
                  <div className="mt-4 flex items-center gap-2 text-gray-400">
                    <Loader2 className="h-5 w-5 animate-spin shrink-0" aria-hidden />
                    Loading…
                  </div>
                ) : (
                  <div className="mt-4 overflow-x-auto rounded-lg border border-gray-700/60">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead>
                        <tr className="border-b border-gray-700/80 bg-gray-900/50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          <th className="px-3 py-2">On stream</th>
                          <th className="px-3 py-2">Account</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/50">
                        {tierPurchaseRows.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                              No completed payments for this tier yet.
                            </td>
                          </tr>
                        ) : (
                          tierPurchaseRows.map((p) => {
                            const cr = p.creatorRewardPurchase
                            return (
                              <tr key={p.id} className="bg-gray-900/20">
                                <td className="px-3 py-2 text-gray-200">
                                  <div className="font-medium text-white">{cr?.displayName ?? '—'}</div>
                                  <div className="text-xs text-gray-500">{cr?.rewardNameSnapshot ?? ''}</div>
                                </td>
                                <td className="px-3 py-2 text-gray-300">
                                  <div>{p.user?.name ?? '—'}</div>
                                  <div className="font-mono text-xs text-gray-500">{p.user?.mpesaMobile ?? ''}</div>
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums text-gray-200">
                                  {formatAmountForRole(Number(p.amount ?? 0))}
                                </td>
                                <td className="px-3 py-2">
                                  <span
                                    className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${getStatusBadge(p.status || '')}`}
                                  >
                                    {p.status}
                                  </span>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-gray-400 text-xs">
                                  {p.createdAt ? formatDate(String(p.createdAt)) : '—'}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      closeTierView()
                                      void openTierPurchaseDetail(p.id)
                                    }}
                                    className="text-xs font-semibold text-violet-400 hover:text-violet-300"
                                  >
                                    Open
                                  </button>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                {tierPurchasesPagination.totalPages > 1 ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
                    <span>
                      Page {tierPurchasePage} of {tierPurchasesPagination.totalPages} ({tierPurchasesPagination.total}{' '}
                      total)
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={tierPurchasePage <= 1 || tierPurchasesLoading}
                        onClick={() => setTierPurchasePage((n) => Math.max(1, n - 1))}
                        className="rounded-md border border-gray-600 px-2 py-1 font-semibold text-gray-200 hover:bg-gray-700 disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={
                          tierPurchasePage >= tierPurchasesPagination.totalPages || tierPurchasesLoading
                        }
                        onClick={() => setTierPurchasePage((n) => n + 1)}
                        className="rounded-md border border-gray-600 px-2 py-1 font-semibold text-gray-200 hover:bg-gray-700 disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="shrink-0 border-t border-gray-700 px-5 py-3 flex justify-end gap-2 bg-gray-900/40">
              <button
                type="button"
                onClick={() => {
                  closeTierView()
                  startEdit(viewingTier)
                }}
                className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/20"
              >
                Edit this tier
              </button>
              <button
                type="button"
                onClick={closeTierView}
                className="rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
