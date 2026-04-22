'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Loader2,
  LogOut,
  User as UserIcon,
  Megaphone,
  Link2,
  Copy,
  Plus,
  Trash2,
  ChevronLeft,
} from 'lucide-react'
import Swal from 'sweetalert2'
import api, { apiNetworkErrorHint, isAxiosNetworkError } from '@/lib/api'
import { creatorDashboardApi } from '@/lib/creator-dashboard-api'
import {
  appendObsPlayerVoiceParams,
  OBS_BROWSER_VOICE_OPTIONS,
  OBS_GOOGLE_VOICE_OPTIONS,
  OBS_TTS_GENDER_OPTIONS,
  resolveObsPlayerDisplayUrl,
} from '@/lib/obs-player-voice'
import { isAuthenticated, getAdminUser, clearAuth } from '@/lib/auth'
import {
  clearCreatorSession,
  getCreatorToken,
  getCreatorUser,
} from '@/lib/creator-auth'

export type ObsAlertsWorkspace = 'admin' | 'creator'

export function ObsAlertsPage({ workspace }: { workspace: ObsAlertsWorkspace }) {
  const router = useRouter()
  const http = workspace === 'creator' ? creatorDashboardApi : api
  const apiPrefix = workspace === 'creator' ? '/creator-portal' : '/admin'
  const sessionOk = () =>
    workspace === 'creator' ? !!getCreatorToken() : isAuthenticated()
  const [adminUser, setAdminUser] = useState<any>(null)
  const [obsTestUsername, setObsTestUsername] = useState('TestCreator')
  const [obsTestKind, setObsTestKind] = useState<
    'new' | 'renewal' | 'shoutout' | 'account_review' | 'creator_reward'
  >('new')
  const [obsTestCreatorRewardId, setObsTestCreatorRewardId] = useState('')
  const [obsTestRewardTiers, setObsTestRewardTiers] = useState<
    Array<{ id: string; name: string; amountKes: number; active: boolean }>
  >([])
  const [obsTestCoachingAccount, setObsTestCoachingAccount] = useState('DemoGameAccount')
  const [obsTestAmountKes, setObsTestAmountKes] = useState('')
  const [obsTestVideoUrl, setObsTestVideoUrl] = useState('')
  const [obsTestMessage, setObsTestMessage] = useState('')
  const [obsTestLoading, setObsTestLoading] = useState(false)
  const [obsLinkInfo, setObsLinkInfo] = useState<{
    enabled: boolean
    playerUrl: string | null
    copyUrl: string | null
    message: string | null
    cloudTts?: boolean
    groq?: boolean
    gemini?: boolean
    uniqueLinks?: Array<{
      id: string
      label: string | null
      tokenSuffix: string
      createdAt: string
    }>
    legacyUsesSharedSecret?: boolean
  } | null>(null)
  const [obsNewLinkLabel, setObsNewLinkLabel] = useState('')
  const [obsCreateLinkLoading, setObsCreateLinkLoading] = useState(false)
  const [obsRevokeId, setObsRevokeId] = useState<string | null>(null)
  const [obsBulkRevokeLoading, setObsBulkRevokeLoading] = useState(false)
  const [selectedObsLinkIds, setSelectedObsLinkIds] = useState<Set<string>>(
    () => new Set(),
  )
  const obsSelectAllRef = useRef<HTMLInputElement>(null)
  const [obsTestLanguage, setObsTestLanguage] = useState('en-US')
  const [obsTestSkipGemini, setObsTestSkipGemini] = useState(false)
  const [obsGoogleVoice, setObsGoogleVoice] = useState('')
  const [obsBrowserVoice, setObsBrowserVoice] = useState('')
  const [obsTtsGender, setObsTtsGender] = useState('')
  const [hasMounted, setHasMounted] = useState(false)

  const isAdminOrSuper = () => {
    const u = getAdminUser()
    return u?.role === 'ADMIN' || u?.role === 'SUPER_ADMIN'
  }

  const canManageUniqueObsLinks =
    workspace === 'creator' || isAdminOrSuper()

  const uniqueObsLinks = useMemo(
    () => obsLinkInfo?.uniqueLinks ?? [],
    [obsLinkInfo?.uniqueLinks],
  )
  const selectedObsLinkCount = useMemo(
    () => uniqueObsLinks.filter((l) => selectedObsLinkIds.has(l.id)).length,
    [uniqueObsLinks, selectedObsLinkIds],
  )
  const allObsLinksSelected =
    uniqueObsLinks.length > 0 && selectedObsLinkCount === uniqueObsLinks.length

  useEffect(() => {
    const el = obsSelectAllRef.current
    if (!el) return
    el.indeterminate =
      selectedObsLinkCount > 0 && selectedObsLinkCount < uniqueObsLinks.length
  }, [selectedObsLinkCount, uniqueObsLinks.length])

  useEffect(() => {
    const valid = new Set(uniqueObsLinks.map((l) => l.id))
    setSelectedObsLinkIds((prev) => {
      let changed = false
      const next = new Set<string>()
      prev.forEach((id) => {
        if (valid.has(id)) next.add(id)
        else changed = true
      })
      if (!changed && next.size === prev.size) return prev
      return next
    })
  }, [uniqueObsLinks])

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    if (!hasMounted) return
    if (!sessionOk()) {
      router.push(workspace === 'creator' ? '/creator/login' : '/login')
      return
    }
    if (workspace === 'creator') {
      const cu = getCreatorUser()
      setAdminUser(
        cu ? { username: cu.displayName || cu.email, role: 'CREATOR' } : null,
      )
    } else {
      setAdminUser(getAdminUser())
    }
  }, [router, hasMounted, workspace])

  const obsLinkLoadError = (err: unknown) => ({
    enabled: false,
    playerUrl: null,
    copyUrl: null,
    uniqueLinks: [] as Array<{
      id: string
      label: string | null
      tokenSuffix: string
      createdAt: string
    }>,
    cloudTts: false,
    groq: false,
    gemini: false,
    message: isAxiosNetworkError(err)
      ? apiNetworkErrorHint()
      : 'Could not load OBS link.',
  })

  const loadObsAlerts = () => {
    return http
      .get(`${apiPrefix}/obs-alerts/link`)
      .then((res) => {
        setObsLinkInfo(res.data)
        return res.data
      })
      .catch((err) => {
        setObsLinkInfo(obsLinkLoadError(err))
      })
  }

  useEffect(() => {
    if (!sessionOk()) return
    let cancelled = false
    http
      .get(`${apiPrefix}/obs-alerts/link`)
      .then((res) => {
        if (!cancelled) setObsLinkInfo(res.data)
      })
      .catch((err) => {
        if (!cancelled) setObsLinkInfo(obsLinkLoadError(err))
      })
    return () => {
      cancelled = true
    }
  }, [apiPrefix, http])

  useEffect(() => {
    if (!sessionOk()) return
    let cancelled = false
    http
      .get(`${apiPrefix}/creator-rewards`)
      .then((res) => {
        if (cancelled || !Array.isArray(res.data)) return
        setObsTestRewardTiers(
          res.data.map((r: { id: string; name: string; amountKes: number; active: boolean }) => ({
            id: r.id,
            name: r.name,
            amountKes: r.amountKes,
            active: r.active,
          })),
        )
      })
      .catch(() => {
        if (!cancelled) setObsTestRewardTiers([])
      })
    return () => {
      cancelled = true
    }
  }, [apiPrefix, http])

  const apiPublicBase = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '')

  const obsVoiceParams = useMemo(
    () => ({
      googleVoice: obsGoogleVoice || undefined,
      browserVoice: obsBrowserVoice || undefined,
      ttsGender: obsTtsGender || undefined,
    }),
    [obsGoogleVoice, obsBrowserVoice, obsTtsGender],
  )

  const obsPasteUrlRaw = useMemo(() => {
    if (!obsLinkInfo) return ''
    return resolveObsPlayerDisplayUrl(
      obsLinkInfo.playerUrl,
      obsLinkInfo.copyUrl,
      apiPublicBase,
    )
  }, [obsLinkInfo, apiPublicBase])

  const obsPasteUrl = useMemo(
    () => appendObsPlayerVoiceParams(obsPasteUrlRaw, obsVoiceParams),
    [obsPasteUrlRaw, obsVoiceParams],
  )

  const copyObsPasteUrl = async () => {
    const text = obsPasteUrl
    if (!text) {
      Swal.fire({
        icon: 'info',
        title: 'No URL yet',
        text: obsLinkInfo?.message || 'Configure OBS on the backend first.',
        confirmButtonColor: '#c026d3',
      })
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      Swal.fire({
        icon: 'success',
        title: 'Copied',
        text: 'Paste into OBS → Browser Source → URL',
        timer: 1800,
        showConfirmButton: false,
      })
    } catch {
      Swal.fire({
        icon: 'error',
        title: 'Copy failed',
        text: 'Select the URL in the field and copy manually.',
        confirmButtonColor: '#dc2626',
      })
    }
  }

  const handleLogout = async () => {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Logout?',
      text: 'Are you sure you want to logout?',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, logout',
      cancelButtonText: 'Cancel',
    })

    if (result.isConfirmed) {
      if (workspace === 'creator') {
        clearCreatorSession()
        router.push('/creator/login')
      } else {
        clearAuth()
        router.push('/login')
      }
      Swal.fire({
        icon: 'success',
        title: 'Logged out',
        text: 'You have been successfully logged out',
        timer: 1500,
        showConfirmButton: false,
      })
    }
  }

  const handleTestObsAlert = async () => {
    const trimmed = obsTestUsername.trim().replace(/^@+/, '') || 'TestCreator'
    const trimmedMessage = obsTestMessage.trim()
    setObsTestLoading(true)
    try {
      const amountParsed = obsTestAmountKes.trim()
        ? Math.round(Number(obsTestAmountKes))
        : NaN
      const amountOk = Number.isFinite(amountParsed) && amountParsed >= 0
      const res = await http.post(`${apiPrefix}/obs-alerts/test`, {
        tiktokUsername: trimmed,
        kind: obsTestKind,
        languageCode: obsTestLanguage,
        ...(obsTestSkipGemini ? { skipGemini: true } : {}),
        ...(trimmedMessage ? { announcementText: trimmedMessage.slice(0, 500) } : {}),
        ...(amountOk && obsTestKind === 'shoutout'
          ? { shoutoutAmountKes: amountParsed }
          : {}),
        ...(amountOk && obsTestKind === 'account_review'
          ? { shoutoutAmountKes: amountParsed }
          : {}),
        ...(amountOk && obsTestKind === 'creator_reward'
          ? { shoutoutAmountKes: amountParsed }
          : {}),
        ...(amountOk && (obsTestKind === 'new' || obsTestKind === 'renewal')
          ? { subscriptionAmountKes: amountParsed }
          : {}),
        ...(obsTestKind === 'account_review' && obsTestCoachingAccount.trim()
          ? { coachingAccountUsername: obsTestCoachingAccount.trim().slice(0, 120) }
          : {}),
        ...(obsTestKind === 'creator_reward' && obsTestCreatorRewardId.trim()
          ? { creatorRewardId: obsTestCreatorRewardId.trim() }
          : {}),
        ...((obsTestKind === 'shoutout' || obsTestKind === 'creator_reward') &&
        obsTestVideoUrl.trim()
          ? {
              videoUrl: obsTestVideoUrl.trim().includes('://')
                ? obsTestVideoUrl.trim()
                : `https://${obsTestVideoUrl.trim()}`,
            }
          : {}),
      })
      const enabled = res.data?.obsEnabled !== false
      const sseListeners = res.data?.sseListeners as number | undefined
      const nobodyListening =
        enabled && typeof sseListeners === 'number' && sseListeners === 0
      if (nobodyListening) {
        Swal.fire({
          icon: 'warning',
          title: 'No OBS player connected',
          html: `<p class="text-left text-sm">The test ran on the API, but <strong>0</strong> browsers were subscribed to the alert stream, so nothing will show in OBS.</p><ul class="text-left text-sm mt-2 pl-4 list-disc space-y-1"><li>Add a <strong>Browser Source</strong> with the URL from this page (same host as your API).</li><li>Wait until the source status shows <strong>Connected</strong>, then test again.</li><li>If the API uses a path prefix (e.g. <code>/api</code>), reload the player after deploying — the stream URL is fixed automatically.</li><li>Multiple API workers without sticky sessions each have their own subscribers; use one instance or session affinity.</li></ul>`,
          confirmButtonColor: '#c026d3',
        })
        return
      }
      const customNote = trimmedMessage ? ' Custom message included (AI skipped for that line).' : ''
      const kindLabel =
        obsTestKind === 'account_review'
          ? 'account review'
          : obsTestKind === 'creator_reward'
            ? 'reward tier'
            : obsTestKind
      Swal.fire({
        icon: 'success',
        title: 'Alert sent',
        text: enabled
          ? `OBS should show @${trimmed} (${kindLabel}).${customNote} ${typeof sseListeners === 'number' ? `${sseListeners} listener(s) connected.` : ''}`.trim()
          : `Event emitted (dev mode). In production, set OBS_ALERT_SECRET and use the player URL with the same token, or the Browser Source will not connect.`,
        timer: enabled ? 2800 : 4500,
        showConfirmButton: false,
      })
    } catch (error: any) {
      const d = error.response?.data
      const formatValidationMessage = (m: unknown): string | null => {
        if (typeof m === 'string') return m
        if (!Array.isArray(m)) return null
        return m
          .map((item) =>
            typeof item === 'string'
              ? item
              : item && typeof item === 'object' && 'constraints' in item
                ? Object.values((item as { constraints: Record<string, string> }).constraints).join(
                    ', ',
                  )
                : JSON.stringify(item),
          )
          .filter(Boolean)
          .join('; ')
      }
      let msg =
        (typeof d?.message === 'string' && d.message) ||
        formatValidationMessage(d?.message) ||
        d?.error ||
        error.message ||
        'Failed to send test alert'
      if (isAxiosNetworkError(error)) {
        msg = apiNetworkErrorHint()
      }
      Swal.fire({
        icon: 'error',
        title: 'Test failed',
        text: typeof msg === 'string' ? msg : 'Check admin auth, API URL, and server logs.',
        confirmButtonColor: '#dc2626',
      })
    } finally {
      setObsTestLoading(false)
    }
  }

  const handleCreateObsStreamLink = async () => {
    setObsCreateLinkLoading(true)
    try {
      const label = obsNewLinkLabel.trim()
      const res = await http.post(`${apiPrefix}/obs-stream-links`, {
        ...(label ? { label } : {}),
      })
      const rawUrl = resolveObsPlayerDisplayUrl(
        res.data?.playerUrl,
        res.data?.copyUrl,
        apiPublicBase,
      )
      const url = rawUrl
        ? appendObsPlayerVoiceParams(rawUrl, obsVoiceParams)
        : ''
      await loadObsAlerts()
      setObsNewLinkLabel('')
      const esc = (t: string) =>
        t
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
      await Swal.fire({
        icon: 'success',
        title: 'Unique OBS link created',
        html: url
          ? `<p class="text-sm text-left mb-2">Copy this into OBS → Browser Source → URL. Voice options from the dropdowns are included. Save the token somewhere safe.</p><p class="text-xs font-mono break-all text-left bg-gray-900 p-2 rounded">${esc(url)}</p>`
          : '<p>Link created. Set OBS_PLAYER_BASE_URL on the API to see a full URL here.</p>',
        confirmButtonColor: '#c026d3',
      })
      if (url && navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(url)
        } catch {
          /* ignore */
        }
      }
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Could not create link',
        text:
          error.response?.data?.message ||
          error.message ||
          'Admin role required or server error.',
        confirmButtonColor: '#dc2626',
      })
    } finally {
      setObsCreateLinkLoading(false)
    }
  }

  const handleRevokeObsStreamLink = async (id: string) => {
    const ok = await Swal.fire({
      icon: 'warning',
      title: 'Revoke this link?',
      text: 'OBS sources using this URL will stop receiving alerts.',
      showCancelButton: true,
      confirmButtonText: 'Revoke',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
    })
    if (!ok.isConfirmed) return
    setObsRevokeId(id)
    try {
      await http.delete(`${apiPrefix}/obs-stream-links/${id}`)
      setSelectedObsLinkIds((prev) => {
        const n = new Set(prev)
        n.delete(id)
        return n
      })
      await loadObsAlerts()
      Swal.fire({
        icon: 'success',
        title: 'Revoked',
        timer: 1600,
        showConfirmButton: false,
      })
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Revoke failed',
        text: error.response?.data?.message || error.message || 'Try again.',
        confirmButtonColor: '#dc2626',
      })
    } finally {
      setObsRevokeId(null)
    }
  }

  const toggleObsLinkSelection = (id: string) => {
    setSelectedObsLinkIds((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const handleBulkRevokeObsStreamLinks = async () => {
    const ids = uniqueObsLinks
      .filter((l) => selectedObsLinkIds.has(l.id))
      .map((l) => l.id)
    if (ids.length === 0) return
    const ok = await Swal.fire({
      icon: 'warning',
      title: `Revoke ${ids.length} link${ids.length === 1 ? '' : 's'}?`,
      text: 'OBS sources using these URLs will stop receiving alerts.',
      showCancelButton: true,
      confirmButtonText: 'Revoke all',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
    })
    if (!ok.isConfirmed) return
    setObsBulkRevokeLoading(true)
    setObsRevokeId(null)
    try {
      const results = await Promise.allSettled(
        ids.map((id) => http.delete(`${apiPrefix}/obs-stream-links/${id}`)),
      )
      const failed = results.filter((r) => r.status === 'rejected').length
      await loadObsAlerts()
      setSelectedObsLinkIds(new Set())
      if (failed === 0) {
        Swal.fire({
          icon: 'success',
          title: 'Revoked',
          text: `${ids.length} link${ids.length === 1 ? '' : 's'} revoked.`,
          timer: 1800,
          showConfirmButton: false,
        })
      } else {
        Swal.fire({
          icon: failed === ids.length ? 'error' : 'warning',
          title: failed === ids.length ? 'Revoke failed' : 'Partially revoked',
          text:
            failed === ids.length
              ? 'None of the links could be revoked. Try again.'
              : `${ids.length - failed} revoked, ${failed} failed.`,
          confirmButtonColor: '#dc2626',
        })
      }
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || error.message || 'Try again.',
        confirmButtonColor: '#dc2626',
      })
    } finally {
      setObsBulkRevokeLoading(false)
    }
  }

  if (!hasMounted || !sessionOk()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">
            {!hasMounted ? 'Loading…' : 'Redirecting…'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={
        workspace === 'creator'
          ? 'min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
          : 'min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-950'
      }
    >
      <header
        className={
          workspace === 'creator'
            ? 'bg-gray-800/50 backdrop-blur-lg border-b border-gray-700/50 sticky top-0 z-50'
            : 'bg-slate-900/60 backdrop-blur-lg border-b border-slate-700/50 sticky top-0 z-50'
        }
      >
        <div className="container mx-auto max-w-[1600px] px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3 min-w-0">
              <Link
                href={workspace === 'creator' ? '/creator/workspace' : '/admin'}
                className="inline-flex items-center gap-2 text-sm text-fuchsia-300 hover:text-fuchsia-200 transition shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
                {workspace === 'creator' ? 'Creator workspace' : 'Platform admin'}
              </Link>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                  OBS subscriber alerts
                </h1>
                {workspace !== 'creator' ? (
                  <p className="text-xs text-slate-400 mt-0.5 hidden sm:block max-w-md">
                    Platform tools — test and link management; production alerts still respect each creator’s stream
                    scope.
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {adminUser && (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-700/50 rounded-lg min-w-0">
                  <UserIcon className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-300 truncate">
                    {adminUser.username}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 min-h-[44px] bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-[1600px] px-3 sm:px-4 py-6 sm:py-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="bg-gradient-to-br from-fuchsia-500/10 to-purple-600/5 rounded-xl p-6 border border-fuchsia-500/25 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex gap-3">
              <div className="p-3 bg-fuchsia-500/20 rounded-lg shrink-0">
                <Megaphone className="w-6 h-6 text-fuchsia-300" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Test &amp; URLs</h2>
                <p className="text-sm text-gray-400 mt-1 max-w-xl">
                  Add this URL as an OBS Browser Source, keep it open, then use Test below. Real
                  subscribers fire the same trigger automatically.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-3 lg:min-w-[280px]">
              <div className="min-w-[140px]">
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  TTS language
                </label>
                <select
                  value={obsTestLanguage}
                  onChange={(e) => setObsTestLanguage(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900/60 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-sm"
                >
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="sw-KE">Kiswahili (Kenya)</option>
                  <option value="fr-FR">French</option>
                  <option value="es-ES">Spanish</option>
                  <option value="de-DE">German</option>
                  <option value="ar-XA">Arabic</option>
                  <option value="hi-IN">Hindi</option>
                  <option value="zh-CN">Chinese (Mandarin)</option>
                  <option value="ja-JP">Japanese</option>
                  <option value="pt-BR">Portuguese (Brazil)</option>
                </select>
              </div>
              <div className="flex-1 min-w-[160px]">
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  {obsTestKind === 'account_review'
                    ? 'Booking display name'
                    : obsTestKind === 'creator_reward'
                      ? 'Name on stream'
                      : 'TikTok username'}
                </label>
                <input
                  type="text"
                  value={obsTestUsername}
                  onChange={(e) => setObsTestUsername(e.target.value)}
                  placeholder={
                    obsTestKind === 'account_review'
                      ? 'Customer name'
                      : obsTestKind === 'creator_reward'
                        ? 'TestSupporter'
                        : 'TestCreator'
                  }
                  className="w-full px-3 py-2 bg-gray-900/60 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-sm"
                />
              </div>
              <div className="min-w-[120px]">
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Type</label>
                <select
                  value={obsTestKind}
                  onChange={(e) =>
                    setObsTestKind(
                      e.target.value as
                        | 'new'
                        | 'renewal'
                        | 'shoutout'
                        | 'account_review'
                        | 'creator_reward',
                    )
                  }
                  className="w-full px-3 py-2 bg-gray-900/60 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-sm"
                >
                  <option value="new">New subscriber</option>
                  <option value="renewal">Resubscribed</option>
                  <option value="shoutout">Shoutout</option>
                  <option value="account_review">Account review</option>
                  <option value="creator_reward">Reward tier</option>
                </select>
              </div>
              <div className="min-w-[100px]">
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  {obsTestKind === 'shoutout'
                    ? 'Shoutout KES'
                    : obsTestKind === 'account_review'
                      ? 'Review KES'
                      : obsTestKind === 'creator_reward'
                        ? 'Tier KES'
                        : 'Subscription KES'}
                  <span className="text-gray-600 font-normal"> (opt.)</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={obsTestAmountKes}
                  onChange={(e) => setObsTestAmountKes(e.target.value)}
                  placeholder="—"
                  className="w-full px-3 py-2 bg-gray-900/60 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-400 self-end pb-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={obsTestSkipGemini}
                  onChange={(e) => setObsTestSkipGemini(e.target.checked)}
                  disabled={
                    obsTestKind === 'shoutout' ||
                    obsTestKind === 'account_review' ||
                    obsTestKind === 'creator_reward'
                  }
                  className="rounded border-gray-600 bg-gray-900 text-fuchsia-600 focus:ring-fuchsia-500 disabled:opacity-40"
                />
                Skip AI line
              </label>
              <button
                type="button"
                onClick={handleTestObsAlert}
                disabled={obsTestLoading}
                className="px-4 py-2 h-[38px] self-end bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
              >
                {obsTestLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Megaphone className="w-4 h-4" />
                )}
                Test alert
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Alert message <span className="text-gray-600 font-normal">(optional)</span>
              </label>
              <textarea
                value={obsTestMessage}
                onChange={(e) => setObsTestMessage(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder={
                  obsTestKind === 'account_review'
                    ? 'Optional booking notes (same as live checkout)'
                    : obsTestKind === 'creator_reward'
                      ? 'Optional supporter message (fills {{message}} in tier TTS script)'
                      : 'Same as public support page: short line for OBS / TTS (skips AI when set)'
                }
                className="w-full px-3 py-2 bg-gray-900/60 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-sm resize-y min-h-[4.5rem]"
              />
              <p className="text-xs text-gray-500 mt-1">
                Max 500 characters. Leave empty to use the normal template or AI line.
              </p>
            </div>
            {obsTestKind === 'account_review' && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Game / account username <span className="text-gray-600 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={obsTestCoachingAccount}
                  onChange={(e) => setObsTestCoachingAccount(e.target.value)}
                  placeholder="eFootball / in-game name"
                  maxLength={120}
                  className="w-full px-3 py-2 bg-gray-900/60 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Shown on the account-review overlay like a real paid booking.
                </p>
              </div>
            )}
            {obsTestKind === 'creator_reward' && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Tier to preview
                </label>
                <select
                  value={obsTestCreatorRewardId}
                  onChange={(e) => setObsTestCreatorRewardId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900/60 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-sm"
                >
                  <option value="">Generic test (default banner &amp; TTS)</option>
                  {obsTestRewardTiers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} · KES {t.amountKes}
                      {!t.active ? ' (inactive)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Uses that tier&apos;s banner label and TTS template. Leave KES empty to use the tier price, or
                  override. Inactive tiers can still be previewed.
                </p>
              </div>
            )}
            {(obsTestKind === 'shoutout' || obsTestKind === 'creator_reward') && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Clip URL <span className="text-gray-600 font-normal">(optional, TikTok)</span>
                </label>
                <input
                  type="url"
                  inputMode="url"
                  value={obsTestVideoUrl}
                  onChange={(e) => setObsTestVideoUrl(e.target.value)}
                  placeholder="https://www.tiktok.com/@user/video/…"
                  className="w-full px-3 py-2 bg-gray-900/60 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {obsTestKind === 'shoutout'
                    ? 'Same validation as live shoutout checkout. Leave empty to test text-only shoutout.'
                    : 'Same validation as live reward checkout. Leave empty for text-only.'}
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-fuchsia-500/20 pt-4 space-y-4">
            <div className="rounded-lg border border-fuchsia-500/15 bg-gray-900/25 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white">Voice (applied to OBS URL)</h3>
              <p className="text-xs text-gray-500">
                Set these before you <strong className="text-gray-400">Generate link</strong> or{' '}
                <strong className="text-gray-400">Copy</strong>. <code className="text-gray-400">voice</code>{' '}
                is for Google Cloud TTS; <code className="text-gray-400">browserVoice</code> matches a
                name in OBS&apos;s built-in browser when cloud TTS is off or fails.
              </p>
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Google Cloud voice
                  </label>
                  <select
                    value={obsGoogleVoice}
                    onChange={(e) => setObsGoogleVoice(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900/70 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  >
                    {OBS_GOOGLE_VOICE_OPTIONS.map((o) => (
                      <option key={o.value || 'default'} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Browser fallback voice
                  </label>
                  <select
                    value={obsBrowserVoice}
                    onChange={(e) => setObsBrowserVoice(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900/70 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  >
                    {OBS_BROWSER_VOICE_OPTIONS.map((o) => (
                      <option key={o.value || 'default-b'} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Browser gender bias
                  </label>
                  <select
                    value={obsTtsGender}
                    onChange={(e) => setObsTtsGender(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900/70 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  >
                    {OBS_TTS_GENDER_OPTIONS.map((o) => (
                      <option key={o.value || 'default-g'} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {canManageUniqueObsLinks ? (
              <div className="rounded-lg border border-fuchsia-500/20 bg-gray-900/30 p-4 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">Unique OBS links</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    One URL per Browser Source or scene. Revoking a link does not affect others. The
                    full URL is shown only when you generate it—copy it immediately.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={obsNewLinkLabel}
                    onChange={(e) => setObsNewLinkLabel(e.target.value)}
                    placeholder="Label (optional), e.g. Main scene"
                    className="flex-1 min-w-0 px-3 py-2 bg-gray-900/60 border border-gray-600 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                  />
                  <button
                    type="button"
                    onClick={handleCreateObsStreamLink}
                    disabled={obsCreateLinkLoading}
                    className="px-4 py-2 bg-fuchsia-700 hover:bg-fuchsia-600 text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                  >
                    {obsCreateLinkLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Generate link
                  </button>
                </div>
                {uniqueObsLinks.length > 0 && (
                  <>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
                        <input
                          ref={obsSelectAllRef}
                          type="checkbox"
                          checked={allObsLinksSelected}
                          disabled={obsBulkRevokeLoading}
                          onChange={() => {
                            setSelectedObsLinkIds(() =>
                              allObsLinksSelected
                                ? new Set()
                                : new Set(uniqueObsLinks.map((l) => l.id)),
                            )
                          }}
                          className="rounded border-gray-600 bg-gray-900 text-fuchsia-600 focus:ring-fuchsia-500 disabled:opacity-40"
                        />
                        Select all
                      </label>
                      {selectedObsLinkCount > 0 && (
                        <button
                          type="button"
                          onClick={handleBulkRevokeObsStreamLinks}
                          disabled={obsBulkRevokeLoading}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-600/90 hover:bg-red-600 text-white disabled:opacity-50 transition"
                        >
                          {obsBulkRevokeLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          Delete selected ({selectedObsLinkCount})
                        </button>
                      )}
                    </div>
                    <ul className="space-y-2">
                      {uniqueObsLinks.map((link) => (
                        <li
                          key={link.id}
                          className="flex items-center gap-2 text-sm bg-gray-900/60 border border-gray-700/60 rounded-lg px-3 py-2"
                        >
                          <input
                            type="checkbox"
                            checked={selectedObsLinkIds.has(link.id)}
                            disabled={obsBulkRevokeLoading}
                            onChange={() => toggleObsLinkSelection(link.id)}
                            className="rounded border-gray-600 bg-gray-900 text-fuchsia-600 focus:ring-fuchsia-500 shrink-0 disabled:opacity-40"
                            aria-label={`Select ${link.label || 'link'}`}
                          />
                          <span className="text-gray-200 min-w-0 flex-1 truncate">
                            <span className="font-medium">
                              {link.label || 'Unnamed source'}
                            </span>
                            <span className="text-gray-500 ml-2 font-mono text-xs">
                              …{link.tokenSuffix}
                            </span>
                            <span className="text-gray-600 ml-2 text-xs">
                              {new Date(link.createdAt).toLocaleString()}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRevokeObsStreamLink(link.id)}
                            disabled={
                              obsBulkRevokeLoading || obsRevokeId === link.id
                            }
                            className="p-2 rounded-md text-red-400 hover:bg-red-500/10 disabled:opacity-40 shrink-0"
                            title="Revoke link"
                          >
                            {obsRevokeId === link.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            ) : null}

            <div>
              {workspace !== 'creator' && (
                <>
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-400 mb-2">
                    <Link2 className="w-3.5 h-3.5" />
                    Shared secret URL {obsLinkInfo?.legacyUsesSharedSecret ? '' : '(optional)'}
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      readOnly
                      value={obsPasteUrl}
                      placeholder={
                        obsLinkInfo === null
                          ? 'Loading…'
                          : 'Set OBS_PLAYER_BASE_URL or WEBHOOK_BASE_URL on the API'
                      }
                      className="flex-1 min-w-0 px-3 py-2 bg-gray-900/70 border border-gray-600 rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      type="button"
                      onClick={copyObsPasteUrl}
                      disabled={!obsPasteUrl}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 shrink-0 disabled:opacity-40"
                    >
                      <Copy className="w-4 h-4" />
                      Copy
                    </button>
                  </div>
                </>
              )}
              {obsLinkInfo?.message && (
                <p className="text-xs text-amber-400/90 mt-2">{obsLinkInfo.message}</p>
              )}
              <div className="text-xs mt-2 space-y-1">
                {obsLinkInfo?.cloudTts ? (
                  <p className="text-emerald-400/90">
                    Google Cloud TTS is enabled — high-quality speech in many languages.
                  </p>
                ) : (
                  <p className="text-gray-500">
                    Add GOOGLE_CLOUD_TTS_API_KEY on the API for neural multilingual TTS; otherwise
                    the OBS player uses your system browser voices.
                  </p>
                )}
                {obsLinkInfo?.groq ? (
                  <p className="text-sky-400/90">
                    Groq (free tier) is enabled — alert lines use fast Llama; no Google AI Studio
                    needed. Gemini is only used if Groq is off and GOOGLE_GEMINI_API_KEY is set.
                  </p>
                ) : obsLinkInfo?.gemini ? (
                  <p className="text-sky-400/90">
                    Google Gemini is enabled for AI lines. For a strong free default, add{' '}
                    <code className="text-sky-300/90">GROQ_API_KEY</code> from console.groq.com
                    (Groq is tried first).
                  </p>
                ) : (
                  <p className="text-gray-500">
                    Add <code className="text-gray-400">GROQ_API_KEY</code> (free at groq.com) for AI
                    alert lines, or <code className="text-gray-400">GOOGLE_GEMINI_API_KEY</code>.
                    Otherwise fixed templates are used for speech.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
