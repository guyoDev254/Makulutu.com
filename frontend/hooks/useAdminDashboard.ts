'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import api, { apiNetworkErrorHint, isAxiosNetworkError } from '@/lib/api'
import { creatorDashboardApi } from '@/lib/creator-dashboard-api'
import { formatApiErrorMessage } from '@/lib/api-origin'
import { isAuthenticated, getAdminUser, clearAuth } from '@/lib/auth'
import {
  clearCreatorSession,
  getCreatorToken,
  getCreatorUser,
} from '@/lib/creator-auth'
import type {
  DashboardStats,
  PaginationInfo,
  AdminTabId,
  RevenueBreakdownResponse,
  CreatorWalletSummary,
  CreatorSupporterRankings,
} from '@/components/admin/types'

export type RevenuePresetId = 'today' | 'yesterday' | 'last7' | 'last30' | 'custom'
import { exportToCSV } from '@/components/admin/exportCsv'
import { formatCurrency, formatAmountForRole as formatKesForRole, formatDate, shoutoutPlatformLabel, getStatusBadge } from '@/components/admin/format'

export type DashboardWorkspace = 'admin' | 'creator'

export function useAdminDashboard(workspace: DashboardWorkspace = 'admin') {
  const router = useRouter()
  const http = workspace === 'creator' ? creatorDashboardApi : api
  const apiPrefix = workspace === 'creator' ? '/creator-portal' : '/admin'
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [adminUser, setAdminUser] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<AdminTabId>('overview')
  const [settings, setSettings] = useState<any>({
    defaultMonthlyPrice: 1,
    shoutoutMinKes: 10,
    shoutoutMinKesWithVideo: 50,
    shoutoutMaxKes: 500_000,
    coachingAccountReviewKes: 100,
    obsAlertSecsNew: 12,
    obsAlertSecsRenewal: 12,
    obsAlertSecsShoutout: 12,
    obsAlertSecsShoutoutVideo: 45,
    obsSubscriptionMessageTemplate: '',
    obsShoutoutMessageTemplate: '',
    platformFeePercent: 5,
  })
  const [settingsForm, setSettingsForm] = useState<any>({
    defaultMonthlyPrice: 1,
    shoutoutMinKes: 10,
    shoutoutMinKesWithVideo: 50,
    shoutoutMaxKes: 500_000,
    coachingAccountReviewKes: 100,
    obsAlertSecsNew: 12,
    obsAlertSecsRenewal: 12,
    obsAlertSecsShoutout: 12,
    obsAlertSecsShoutoutVideo: 45,
    obsSubscriptionMessageTemplate: '',
    obsShoutoutMessageTemplate: '',
    platformFeePercent: 5,
  })
  
  // Pagination states
  const [usersPagination, setUsersPagination] = useState<PaginationInfo>({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [creators, setCreators] = useState<any[]>([])
  const [creatorsPagination, setCreatorsPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [updatingCreatorId, setUpdatingCreatorId] = useState<string | null>(null)
  const [creatorSuperProfileOpen, setCreatorSuperProfileOpen] = useState(false)
  const [creatorSuperProfile, setCreatorSuperProfile] = useState<any | null>(null)
  const [creatorSuperProfileLoading, setCreatorSuperProfileLoading] = useState(false)
  const [subscriptionsPagination, setSubscriptionsPagination] = useState<PaginationInfo>({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [paymentsPagination, setPaymentsPagination] = useState<PaginationInfo>({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [shoutouts, setShoutouts] = useState<any[]>([])
  const [shoutoutsPagination, setShoutoutsPagination] = useState<PaginationInfo>({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [coachingBookings, setCoachingBookings] = useState<any[]>([])
  const [coachingBookingsPagination, setCoachingBookingsPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [coachingBookingStatusFilter, setCoachingBookingStatusFilter] = useState<string>('all')
  const [bookingDrafts, setBookingDrafts] = useState<
    Record<string, { status: string; adminNotes: string }>
  >({})
  const [savingBookingId, setSavingBookingId] = useState<string | null>(null)
  const [payoutsPagination, setPayoutsPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [revenueData, setRevenueData] = useState<RevenueBreakdownResponse | null>(null)
  const [walletSummary, setWalletSummary] = useState<CreatorWalletSummary | null>(null)
  const [payoutRequests, setPayoutRequests] = useState<any[]>([])
  const [payoutRequesting, setPayoutRequesting] = useState(false)
  const [reviewingPayoutId, setReviewingPayoutId] = useState<string | null>(null)
  const [revenueLoading, setRevenueLoading] = useState(false)
  const [revenuePreset, setRevenuePreset] = useState<RevenuePresetId>('today')
  const [revenueFrom, setRevenueFrom] = useState('')
  const [revenueTo, setRevenueTo] = useState('')
  const [selectedShoutoutIds, setSelectedShoutoutIds] = useState<Set<string>>(() => new Set())
  const [replayingShoutoutId, setReplayingShoutoutId] = useState<string | null>(null)
  const shoutoutsSelectAllRef = useRef<HTMLInputElement>(null)
  /** Admin payments list (reward tier checkouts live under Tier purchases tab) */
  const [paymentsPurpose, setPaymentsPurpose] = useState<
    'SUBSCRIPTION' | 'STREAM_ALERT' | 'COACHING_BOOKING'
  >('SUBSCRIPTION')
  /** Payments tab: restrict to rows where OBS alert was recorded */
  const [paymentsObsAlertSentOnly, setPaymentsObsAlertSentOnly] = useState(false)
  const [replayingPaymentId, setReplayingPaymentId] = useState<string | null>(null)
  const [creatorRewards, setCreatorRewards] = useState<any[]>([])
  const [creatorRewardsLoading, setCreatorRewardsLoading] = useState(false)
  const [tierPurchases, setTierPurchases] = useState<any[]>([])
  const [tierPurchasesPagination, setTierPurchasesPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [tierPurchasesObsOnly, setTierPurchasesObsOnly] = useState(false)
  const [creatorRankings, setCreatorRankings] = useState<CreatorSupporterRankings | null>(null)
  const [creatorRankingsLoading, setCreatorRankingsLoading] = useState(false)
  const [tierPurchaseDetailOpen, setTierPurchaseDetailOpen] = useState(false)
  const [tierPurchaseDetail, setTierPurchaseDetail] = useState<any | null>(null)
  const [tierPurchaseDetailLoading, setTierPurchaseDetailLoading] = useState(false)
  /** Payment id for the open detail panel (set on open, cleared on close). */
  const tierPurchaseOpenPaymentIdRef = useRef<string | null>(null)
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  
  // Edit states
  const [editingUser, setEditingUser] = useState<any>(null)
  const [editingSubscription, setEditingSubscription] = useState<any>(null)
  const [editingPayment, setEditingPayment] = useState<any>(null)
  const [creatingSubscription, setCreatingSubscription] = useState(false)
  const [editUserForm, setEditUserForm] = useState<any>({})
  const [editSubscriptionForm, setEditSubscriptionForm] = useState<any>({})
  const [editPaymentForm, setEditPaymentForm] = useState<any>({})
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)
  const [changePasswordForm, setChangePasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const [changePasswordLoading, setChangePasswordLoading] = useState(false)
  const [newSubscriptionForm, setNewSubscriptionForm] = useState<any>({
    userId: '',
    months: 1,
    amount: 1,
    startDate: new Date().toISOString().split('T')[0],
    status: 'active',
  })

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    if (activeTab !== 'tierPurchases') {
      tierPurchaseOpenPaymentIdRef.current = null
      setTierPurchaseDetailOpen(false)
      setTierPurchaseDetail(null)
    }
  }, [activeTab])

  useEffect(() => {
    if (workspace === 'creator') {
      if (!getCreatorToken()) {
        router.push('/creator/login')
        return
      }
      const cu = getCreatorUser()
      setAdminUser(
        cu
          ? {
              username: cu.displayName || cu.slug || 'Creator',
              role: 'CREATOR',
              slug: cu.slug,
            }
          : null,
      )
    } else {
      if (!isAuthenticated()) {
        router.push('/login')
        return
      }
      setAdminUser(getAdminUser())
    }

    void fetchDashboardData()

    if (activeTab === 'subscriptions' && workspace === 'admin') {
      void fetchUsers()
    }
  }, [router, activeTab, workspace])

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers()
    } else if (activeTab === 'creators' && workspace === 'admin') {
      fetchCreators()
    } else if (activeTab === 'subscriptions') {
      fetchSubscriptions()
    } else if (activeTab === 'payments') {
      fetchPayments()
    } else if (activeTab === 'tierPurchases') {
      fetchTierPurchases()
    } else if (activeTab === 'shoutouts') {
      fetchStreamShoutouts()
    } else if (activeTab === 'bookings') {
      fetchCoachingBookings()
    } else if (activeTab === 'payouts') {
      fetchPayoutRequests()
    } else if (activeTab === 'settings') {
      fetchSettings()
      fetchCreatorRewards()
    } else if (activeTab === 'rewards') {
      fetchCreatorRewards()
    } else if (activeTab === 'rankings' && workspace === 'creator') {
      void fetchCreatorRankings()
    }
    // revenue: loaded via fetchRevenue in its own effect
  }, [
    activeTab,
    debouncedSearch,
    statusFilter,
    usersPagination.page,
    creatorsPagination.page,
    subscriptionsPagination.page,
    paymentsPagination.page,
    paymentsPurpose,
    paymentsObsAlertSentOnly,
    tierPurchasesPagination.page,
    tierPurchasesObsOnly,
    shoutoutsPagination.page,
    coachingBookingsPagination.page,
    payoutsPagination.page,
    coachingBookingStatusFilter,
    workspace,
  ])

  const fetchDashboardData = async () => {
    try {
      const statsRes = await http.get(`${apiPrefix}/dashboard`)
      setStats(statsRes.data)
      if (workspace === 'creator') {
        try {
          const walletRes = await http.get<CreatorWalletSummary>(
            `${apiPrefix}/wallet-summary`,
          )
          setWalletSummary(walletRes.data)
          const payoutsRes = await http.get(`${apiPrefix}/payout-requests`)
          setPayoutRequests(payoutsRes.data || [])
        } catch {
          setWalletSummary(null)
          setPayoutRequests([])
        }
      } else {
        setWalletSummary(null)
        setPayoutRequests([])
      }
      setLoading(false)
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error)
      setLoading(false)
      Swal.fire({
        icon: 'error',
        title: 'Error Loading Data',
        text: isAxiosNetworkError(error)
          ? apiNetworkErrorHint()
          : error.response?.data?.message || 'Failed to load dashboard data',
        confirmButtonColor: '#dc2626',
      })
    }
  }

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams({
        page: usersPagination.page.toString(),
        limit: usersPagination.limit.toString(),
      })
      if (debouncedSearch) params.append('search', debouncedSearch)
      
      const res = await http.get(`${apiPrefix}/users?${params}`)
      setUsers(res.data.data || [])
      setUsersPagination(res.data.pagination)
    } catch (error: any) {
      console.error('Error fetching users:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load users',
        confirmButtonColor: '#dc2626',
      })
    }
  }

  const fetchCreators = async () => {
    if (workspace !== 'admin') return
    try {
      const params = new URLSearchParams({
        page: creatorsPagination.page.toString(),
        limit: creatorsPagination.limit.toString(),
      })
      if (debouncedSearch) params.append('search', debouncedSearch)
      const res = await api.get(`/admin/creators?${params}`)
      setCreators(res.data.data || [])
      setCreatorsPagination(res.data.pagination)
    } catch (error: any) {
      console.error('Error fetching creators:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load streamer accounts',
        confirmButtonColor: '#dc2626',
      })
    }
  }

  const patchCreatorAdmin = async (
    id: string,
    body: { isActive?: boolean; supportEnabled?: boolean; onboardingComplete?: boolean },
  ) => {
    if (workspace !== 'admin') return
    setUpdatingCreatorId(id)
    try {
      const res = await api.patch(`/admin/creators/${id}`, body)
      const updated = res.data
      setCreators((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)))
    } catch (error: any) {
      const msg =
        error.response?.data?.message || 'Failed to update streamer'
      Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#dc2626' })
    } finally {
      setUpdatingCreatorId(null)
    }
  }

  const fetchSubscriptions = async () => {
    try {
      const params = new URLSearchParams({
        page: subscriptionsPagination.page.toString(),
        limit: subscriptionsPagination.limit.toString(),
      })
      if (debouncedSearch) params.append('search', debouncedSearch)
      if (statusFilter !== 'all') params.append('status', statusFilter.toUpperCase())
      
      const res = await http.get(`${apiPrefix}/subscriptions?${params}`)
      setSubscriptions(res.data.data || [])
      setSubscriptionsPagination(res.data.pagination)
    } catch (error: any) {
      console.error('Error fetching subscriptions:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load subscriptions',
        confirmButtonColor: '#dc2626',
      })
    }
  }

  const fetchCreatorRewards = async () => {
    setCreatorRewardsLoading(true)
    try {
      const res = await http.get(`${apiPrefix}/creator-rewards`)
      setCreatorRewards(res.data || [])
    } catch (error: any) {
      console.error('Error fetching creator rewards:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: formatApiErrorMessage(error.response?.data, 'Failed to load reward tiers.'),
        confirmButtonColor: '#dc2626',
      })
    } finally {
      setCreatorRewardsLoading(false)
    }
  }

  const saveCreatorReward = async (body: Record<string, unknown>, id?: string) => {
    try {
      if (id) {
        await http.patch(`${apiPrefix}/creator-rewards/${id}`, body)
      } else {
        await http.post(`${apiPrefix}/creator-rewards`, body)
      }
      await fetchCreatorRewards()
      Swal.fire({
        icon: 'success',
        title: id ? 'Updated' : 'Created',
        timer: 1500,
        showConfirmButton: false,
      })
      return true
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Save failed',
        text: formatApiErrorMessage(error.response?.data, 'Could not save tier.'),
        confirmButtonColor: '#dc2626',
      })
      return false
    }
  }

  /** Persist tier list order (`sortOrder` = 0, 1, 2, …) after drag-and-drop in admin. */
  const reorderCreatorRewards = async (orderedIds: string[]) => {
    try {
      await Promise.all(
        orderedIds.map((id, sortOrder) =>
          http.patch(`${apiPrefix}/creator-rewards/${id}`, { sortOrder }),
        ),
      )
      await fetchCreatorRewards()
      return true
    } catch (error: unknown) {
      const err = error as { response?: { data?: unknown } }
      Swal.fire({
        icon: 'error',
        title: 'Reorder failed',
        text: formatApiErrorMessage(err.response?.data, 'Could not save tier order.'),
        confirmButtonColor: '#dc2626',
      })
      return false
    }
  }

  const fetchPayments = async () => {
    try {
      const params = new URLSearchParams({
        page: paymentsPagination.page.toString(),
        limit: paymentsPagination.limit.toString(),
      })
      if (debouncedSearch) params.append('search', debouncedSearch)
      if (statusFilter !== 'all') params.append('status', statusFilter.toUpperCase())
      params.append('purpose', paymentsPurpose)
      if (paymentsObsAlertSentOnly) params.append('alertEmitted', 'true')

      const res = await http.get(`${apiPrefix}/payments?${params}`)
      setPayments(res.data.data || [])
      setPaymentsPagination(res.data.pagination)
    } catch (error: any) {
      console.error('Error fetching payments:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load payments',
        confirmButtonColor: '#dc2626',
      })
    }
  }

  const fetchTierPurchases = async () => {
    try {
      const params = new URLSearchParams({
        page: tierPurchasesPagination.page.toString(),
        limit: tierPurchasesPagination.limit.toString(),
        purpose: 'CREATOR_REWARD',
      })
      if (debouncedSearch) params.append('search', debouncedSearch)
      if (statusFilter !== 'all') params.append('status', statusFilter.toUpperCase())
      if (tierPurchasesObsOnly) params.append('alertEmitted', 'true')

      const res = await http.get(`${apiPrefix}/payments?${params}`)
      setTierPurchases(res.data.data || [])
      setTierPurchasesPagination(res.data.pagination)
    } catch (error: unknown) {
      console.error('Error fetching tier purchases:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: isAxiosNetworkError(error)
          ? apiNetworkErrorHint()
          : 'Failed to load tier purchases',
        confirmButtonColor: '#dc2626',
      })
    }
  }

  const fetchCreatorRankings = async () => {
    if (workspace !== 'creator') return
    setCreatorRankingsLoading(true)
    try {
      const res = await http.get<CreatorSupporterRankings>(`${apiPrefix}/rankings?limit=50`)
      setCreatorRankings(res.data)
    } catch (error: unknown) {
      console.error('Error fetching rankings:', error)
      setCreatorRankings(null)
      const err = error as { response?: { data?: unknown } }
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: formatApiErrorMessage(err.response?.data, 'Failed to load rankings.'),
        confirmButtonColor: '#dc2626',
      })
    } finally {
      setCreatorRankingsLoading(false)
    }
  }

  const openTierPurchaseDetail = useCallback(async (paymentId: string) => {
    tierPurchaseOpenPaymentIdRef.current = paymentId
    setTierPurchaseDetailOpen(true)
    setTierPurchaseDetailLoading(true)
    setTierPurchaseDetail(null)
    try {
      const res = await http.get(`${apiPrefix}/payments/${paymentId}`)
      setTierPurchaseDetail(res.data)
    } catch (error: unknown) {
      const err = error as { response?: { data?: unknown } }
      Swal.fire({
        icon: 'error',
        title: 'Could not load',
        text: formatApiErrorMessage(err.response?.data, 'Failed to load payment details.'),
        confirmButtonColor: '#dc2626',
      })
      setTierPurchaseDetail(null)
      setTierPurchaseDetailOpen(false)
      tierPurchaseOpenPaymentIdRef.current = null
    } finally {
      setTierPurchaseDetailLoading(false)
    }
  }, [apiPrefix, http])

  const closeTierPurchaseDetail = useCallback(() => {
    tierPurchaseOpenPaymentIdRef.current = null
    setTierPurchaseDetailOpen(false)
    setTierPurchaseDetail(null)
  }, [])

  const fetchStreamShoutouts = async () => {
    try {
      const params = new URLSearchParams({
        page: shoutoutsPagination.page.toString(),
        limit: shoutoutsPagination.limit.toString(),
      })
      if (debouncedSearch) params.append('search', debouncedSearch)
      if (statusFilter !== 'all') params.append('status', statusFilter.toUpperCase())

      const res = await http.get(`${apiPrefix}/stream-shoutouts?${params}`)
      setShoutouts(res.data.data || [])
      setShoutoutsPagination(res.data.pagination)
    } catch (error: any) {
      console.error('Error fetching stream shoutouts:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to load stream shoutouts (is the DB migration applied?)',
        confirmButtonColor: '#dc2626',
      })
    }
  }

  const fetchCoachingBookings = async () => {
    if (workspace === 'creator') {
      setCoachingBookings([])
      setCoachingBookingsPagination({
        page: 1,
        limit: coachingBookingsPagination.limit,
        total: 0,
        totalPages: 0,
      })
      return
    }
    try {
      const params = new URLSearchParams({
        page: coachingBookingsPagination.page.toString(),
        limit: coachingBookingsPagination.limit.toString(),
      })
      if (coachingBookingStatusFilter !== 'all') {
        params.append('status', coachingBookingStatusFilter.toUpperCase())
      }
      const res = await http.get(`${apiPrefix}/coaching-bookings?${params}`)
      setCoachingBookings(res.data.data || [])
      setCoachingBookingsPagination(res.data.pagination)
    } catch (error: any) {
      console.error('Error fetching coaching bookings:', error)
      const fallback =
        'Failed to load coaching bookings. Run prisma migrate deploy on the API database, or check the API logs.'
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: isAxiosNetworkError(error)
          ? apiNetworkErrorHint()
          : formatApiErrorMessage(error.response?.data, fallback),
        confirmButtonColor: '#dc2626',
      })
    }
  }

  const fetchPayoutRequests = async () => {
    try {
      if (workspace === 'creator') {
        const res = await http.get(`${apiPrefix}/payout-requests`)
        const rows = res.data || []
        setPayoutRequests(rows)
        setPayoutsPagination({
          page: 1,
          limit: rows.length || 10,
          total: rows.length,
          totalPages: 1,
        })
        return
      }
      const params = new URLSearchParams({
        page: payoutsPagination.page.toString(),
        limit: payoutsPagination.limit.toString(),
      })
      if (debouncedSearch) params.append('search', debouncedSearch)
      if (statusFilter !== 'all') params.append('status', statusFilter.toUpperCase())
      const res = await http.get(`${apiPrefix}/payout-requests?${params}`)
      setPayoutRequests(res.data.data || [])
      setPayoutsPagination(res.data.pagination)
    } catch (error: unknown) {
      console.error('Error fetching payout requests:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: isAxiosNetworkError(error)
          ? apiNetworkErrorHint()
          : 'Failed to load payout requests',
        confirmButtonColor: '#dc2626',
      })
    }
  }

  const fetchRevenue = async (opts?: {
    preset?: RevenuePresetId
    from?: string
    to?: string
  }) => {
    const preset = opts?.preset ?? revenuePreset
    const from = (opts?.from ?? revenueFrom).trim()
    const to = (opts?.to ?? revenueTo).trim()
    if (preset === 'custom' && (!from || !to)) {
      return
    }
    setRevenueLoading(true)
    try {
      const params = new URLSearchParams({ preset })
      if (preset === 'custom') {
        params.set('from', from)
        params.set('to', to)
      }
      const res = await http.get<RevenueBreakdownResponse>(`${apiPrefix}/revenue?${params}`)
      setRevenueData(res.data)
    } catch (error: unknown) {
      const err = error as { response?: { data?: unknown } }
      console.error('Error fetching revenue:', error)
      Swal.fire({
        icon: 'error',
        title: 'Revenue failed',
        text: isAxiosNetworkError(error)
          ? apiNetworkErrorHint()
          : formatApiErrorMessage(err.response?.data, 'Could not load revenue breakdown.'),
        confirmButtonColor: '#dc2626',
      })
    } finally {
      setRevenueLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab !== 'revenue') return
    if (revenuePreset === 'custom') return
    void fetchRevenue({ preset: revenuePreset })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: custom range uses Apply only
  }, [activeTab, revenuePreset])

  useEffect(() => {
    if (activeTab !== 'bookings') return
    const next: Record<string, { status: string; adminNotes: string }> = {}
    for (const b of coachingBookings) {
      next[b.id] = { status: b.status, adminNotes: b.adminNotes ?? '' }
    }
    setBookingDrafts(next)
  }, [coachingBookings, activeTab])

  const saveCoachingBooking = async (id: string) => {
    const draft = bookingDrafts[id]
    if (!draft) return
    setSavingBookingId(id)
    try {
      await http.patch(`${apiPrefix}/coaching-bookings/${id}`, {
        status: draft.status,
        adminNotes: draft.adminNotes.trim() ? draft.adminNotes.trim() : null,
      })
      await fetchCoachingBookings()
      Swal.fire({
        icon: 'success',
        title: 'Saved',
        timer: 1500,
        showConfirmButton: false,
      })
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Save failed',
        text: error.response?.data?.message || 'Try again.',
        confirmButtonColor: '#dc2626',
      })
    } finally {
      setSavingBookingId(null)
    }
  }

  useEffect(() => {
    if (activeTab !== 'shoutouts') {
      setSelectedShoutoutIds(new Set())
    }
  }, [activeTab])

  useEffect(() => {
    const el = shoutoutsSelectAllRef.current
    if (!el || shoutouts.length === 0) return
    const onPage = shoutouts.filter((r) => selectedShoutoutIds.has(r.id)).length
    el.indeterminate = onPage > 0 && onPage < shoutouts.length
  }, [shoutouts, selectedShoutoutIds])

  const toggleShoutoutSelected = (id: string) => {
    setSelectedShoutoutIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllShoutoutsOnPage = (checked: boolean) => {
    setSelectedShoutoutIds((prev) => {
      const next = new Set(prev)
      for (const r of shoutouts) {
        if (checked) next.add(r.id)
        else next.delete(r.id)
      }
      return next
    })
  }

  const handleDeleteSelectedShoutouts = async () => {
    const ids = Array.from(selectedShoutoutIds)
    if (ids.length === 0) return
    if (workspace === 'creator') {
      await Swal.fire({
        icon: 'info',
        title: 'Not available',
        text: 'Bulk delete for shoutouts is only available in the platform admin dashboard.',
        confirmButtonColor: '#6b7280',
      })
      return
    }
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Delete selected shoutouts?',
      html: `This will remove <strong>${ids.length}</strong> shoutout record(s) and their linked payment rows. This cannot be undone.`,
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete',
    })
    if (!result.isConfirmed) return
    try {
      const res = await http.post(`${apiPrefix}/stream-shoutouts/delete`, { ids })
      const n = res.data?.deleted ?? 0
      setSelectedShoutoutIds(new Set())
      await fetchStreamShoutouts()
      await fetchDashboardData()
      Swal.fire({
        icon: 'success',
        title: 'Deleted',
        text: n === 0 ? 'No matching rows were removed.' : `Removed ${n} payment(s) and shoutout(s).`,
        timer: 2000,
        showConfirmButton: false,
      })
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Delete failed',
        text: error.response?.data?.message || error.message || 'Try again.',
        confirmButtonColor: '#dc2626',
      })
    }
  }

  const replayShoutout = async (id: string) => {
    setReplayingShoutoutId(id)
    try {
      await http.post(`${apiPrefix}/stream-shoutouts/${id}/replay`)
      Swal.fire({
        icon: 'success',
        title: 'Replay sent',
        text: 'The OBS shoutout alert was fired again.',
        timer: 2500,
        showConfirmButton: false,
      })
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Replay failed',
        text: error.response?.data?.message || error.message || 'Could not replay shoutout.',
        confirmButtonColor: '#dc2626',
      })
    } finally {
      setReplayingShoutoutId(null)
    }
  }

  const replayPaymentObsAlert = async (paymentId: string) => {
    setReplayingPaymentId(paymentId)
    try {
      await http.post(`${apiPrefix}/payments/${paymentId}/replay-obs-alert`)
      Swal.fire({
        icon: 'success',
        title: 'Replay sent',
        text: 'The OBS alert was fired again for this payment.',
        timer: 2500,
        showConfirmButton: false,
      })
      void fetchTierPurchases()
      if (tierPurchaseOpenPaymentIdRef.current === paymentId) {
        try {
          const res = await http.get(`${apiPrefix}/payments/${paymentId}`)
          setTierPurchaseDetail(res.data)
        } catch {
          /* ignore */
        }
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: unknown } }
      Swal.fire({
        icon: 'error',
        title: 'Replay failed',
        text: formatApiErrorMessage(
          err.response?.data,
          'Could not replay OBS alert for this payment.',
        ),
        confirmButtonColor: '#dc2626',
      })
    } finally {
      setReplayingPaymentId(null)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchDashboardData()
    if (activeTab === 'users') await fetchUsers()
    if (activeTab === 'creators' && workspace === 'admin') await fetchCreators()
    if (activeTab === 'subscriptions') await fetchSubscriptions()
    if (activeTab === 'payments') await fetchPayments()
    if (activeTab === 'tierPurchases') await fetchTierPurchases()
    if (activeTab === 'rankings' && workspace === 'creator') await fetchCreatorRankings()
    if (activeTab === 'shoutouts') await fetchStreamShoutouts()
    if (activeTab === 'bookings') await fetchCoachingBookings()
    if (activeTab === 'payouts') await fetchPayoutRequests()
    if (activeTab === 'revenue') await fetchRevenue()
    if (activeTab === 'rewards') await fetchCreatorRewards()
    if (activeTab === 'settings') await fetchSettings()
    setRefreshing(false)
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

  const handleChangePassword = async () => {
    if (!changePasswordForm.newPassword || changePasswordForm.newPassword.length < 6) {
      Swal.fire({ icon: 'error', title: 'Invalid', text: 'New password must be at least 6 characters', confirmButtonColor: '#dc2626' })
      return
    }
    if (changePasswordForm.newPassword !== changePasswordForm.confirmPassword) {
      Swal.fire({ icon: 'error', title: 'Mismatch', text: 'New password and confirm password do not match', confirmButtonColor: '#dc2626' })
      return
    }
    setChangePasswordLoading(true)
    try {
      await api.patch('/auth/change-password', {
        oldPassword: changePasswordForm.oldPassword,
        newPassword: changePasswordForm.newPassword,
      })
      setShowChangePasswordModal(false)
      setChangePasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
      Swal.fire({
        icon: 'success',
        title: 'Password changed',
        text: 'Your password has been updated successfully.',
        timer: 2000,
        showConfirmButton: false,
      })
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to change password'
      Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#dc2626' })
    } finally {
      setChangePasswordLoading(false)
    }
  }

  const handleEditUser = (user: any) => {
    setEditingUser(user)
    setEditUserForm({
      name: user.name,
      tiktokUsername: user.tiktokUsername,
      mpesaMobile: user.mpesaMobile,
      whatsappNumber: user.whatsappNumber,
      isActive: user.isActive,
    })
  }

  const handleConfirmWhatsApp = async (user: any) => {
    try {
      await http.patch(`${apiPrefix}/users/${user.id}/whatsapp-confirm`)
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, addedToWhatsApp: true } : u))
      )
      Swal.fire({
        icon: 'success',
        title: 'Confirmed',
        text: `${user.name} has been marked as added to WhatsApp group`,
        timer: 2000,
        showConfirmButton: false,
      })
    } catch (error: any) {
      console.error('Error confirming WhatsApp:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to update',
        confirmButtonColor: '#dc2626',
      })
    }
  }

  const handleMarkWhatsAppRemoved = async (user: any) => {
    try {
      await http.patch(`${apiPrefix}/users/${user.id}/whatsapp-remove`)
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, addedToWhatsApp: false } : u))
      )
      Swal.fire({
        icon: 'success',
        title: 'Updated',
        text: `${user.name} has been marked as removed from WhatsApp group`,
        timer: 2000,
        showConfirmButton: false,
      })
    } catch (error: any) {
      console.error('Error marking WhatsApp removed:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to update',
        confirmButtonColor: '#dc2626',
      })
    }
  }

  const isAdminOrSuper = () => {
    const u = getAdminUser()
    return u?.role === 'ADMIN' || u?.role === 'SUPER_ADMIN'
  }

  const isSuperAdmin = () => {
    if (workspace === 'creator') return false
    return getAdminUser()?.role === 'SUPER_ADMIN'
  }

  const emailCreatorFromAdmin = async (c: {
    id: string
    email: string
    displayName: string
  }) => {
    if (workspace !== 'admin') return
    if (!isSuperAdmin()) {
      await Swal.fire({
        icon: 'info',
        title: 'Super admin only',
        text: 'Only super admins can email creators from the dashboard.',
        confirmButtonColor: '#0891b2',
      })
      return
    }
    const esc = (s: string) =>
      s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    const result = await Swal.fire({
      title: 'Email creator',
      html: `
        <p style="text-align:left;margin:0 0 10px;font-size:14px;color:#374151;">To <strong>${esc(c.email)}</strong> (${esc(c.displayName)})</p>
        <input id="creator-email-subject" class="swal2-input" maxlength="200" placeholder="Subject (e.g. Account notice)" />
        <textarea id="creator-email-body" class="swal2-textarea" maxlength="4000" placeholder="Your message to the creator"></textarea>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Send email',
      confirmButtonColor: '#0891b2',
      preConfirm: () => {
        const subjectEl = document.getElementById('creator-email-subject') as HTMLInputElement | null
        const bodyEl = document.getElementById('creator-email-body') as HTMLTextAreaElement | null
        const subject = subjectEl?.value?.trim() || ''
        const message = bodyEl?.value?.trim() || ''
        if (subject.length < 3) {
          Swal.showValidationMessage('Subject must be at least 3 characters.')
          return false
        }
        if (!message) {
          Swal.showValidationMessage('Message cannot be empty.')
          return false
        }
        return { subject, message }
      },
    })
    if (!result.isConfirmed || !result.value) return
    try {
      await api.post(`/admin/creators/${c.id}/notify-email`, result.value)
      await Swal.fire({
        icon: 'success',
        title: 'Email sent',
        text: 'The creator should receive this at their registered email.',
        confirmButtonColor: '#16a34a',
      })
    } catch (error: any) {
      const msg =
        formatApiErrorMessage(error.response?.data, 'Could not send email.') ||
        error.response?.data?.message ||
        'Could not send email.'
      await Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#dc2626' })
    }
  }

  const openCreatorSuperProfile = async (creatorId: string) => {
    if (workspace !== 'admin') return
    setCreatorSuperProfileOpen(true)
    setCreatorSuperProfile(null)
    setCreatorSuperProfileLoading(true)
    try {
      const res = await api.get(`/admin/creators/${creatorId}/super-profile`)
      setCreatorSuperProfile(res.data)
    } catch (error: unknown) {
      setCreatorSuperProfileOpen(false)
      const err = error as { response?: { data?: unknown } }
      Swal.fire({
        icon: 'error',
        title: 'Could not load profile',
        text: formatApiErrorMessage(
          err.response?.data,
          'This view requires super admin access.',
        ),
        confirmButtonColor: '#dc2626',
      })
    } finally {
      setCreatorSuperProfileLoading(false)
    }
  }

  const closeCreatorSuperProfile = () => {
    setCreatorSuperProfileOpen(false)
    setCreatorSuperProfile(null)
  }

  const handleSaveUser = async () => {
    try {
      const response = await http.put(`${apiPrefix}/users/${editingUser.id}`, editUserForm)
      Swal.fire({
        icon: 'success',
        title: 'User Updated',
        text: 'User information has been updated successfully',
        timer: 1500,
        showConfirmButton: false,
      })
      setEditingUser(null)
      setEditUserForm({})
      await fetchUsers()
      await fetchDashboardData() // Refresh stats
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: error.response?.data?.message || 'Failed to update user',
        confirmButtonColor: '#dc2626',
      })
    }
  }

  const handleEditSubscription = (subscription: any) => {
    setEditingSubscription(subscription)
    setEditSubscriptionForm({
      months: subscription.months,
      amount: parseFloat(subscription.amount),
      discountAmount: 0,
      discountPercentage: 0,
      startDate: new Date(subscription.startDate).toISOString().split('T')[0],
      endDate: new Date(subscription.endDate).toISOString().split('T')[0],
      status: subscription.status.toLowerCase(),
    })
  }

  const handleSaveSubscription = async () => {
    try {
      const updateData: any = {
        months: parseInt(editSubscriptionForm.months),
        amount: parseFloat(editSubscriptionForm.amount),
        startDate: editSubscriptionForm.startDate,
        endDate: editSubscriptionForm.endDate,
        status: editSubscriptionForm.status.toUpperCase(),
      }

      // Add discount if provided
      if (editSubscriptionForm.discountAmount > 0) {
        updateData.discountAmount = parseFloat(editSubscriptionForm.discountAmount)
      } else if (editSubscriptionForm.discountPercentage > 0) {
        updateData.discountPercentage = parseFloat(editSubscriptionForm.discountPercentage)
      }

      const response = await http.put(`${apiPrefix}/subscriptions/${editingSubscription.id}`, updateData)
      
      Swal.fire({
        icon: 'success',
        title: 'Subscription Updated',
        text: `Subscription updated successfully. Final amount: ${formatCurrency(response.data.amount)}`,
        timer: 2000,
        showConfirmButton: false,
      })
      
      setEditingSubscription(null)
      setEditSubscriptionForm({})
      await fetchSubscriptions()
      await fetchDashboardData()
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: error.response?.data?.message || 'Failed to update subscription',
        confirmButtonColor: '#dc2626',
      })
    }
  }

  const calculateDiscountedAmount = () => {
    const baseAmount = parseFloat(editSubscriptionForm.amount) || 0
    if (editSubscriptionForm.discountAmount > 0) {
      return Math.max(0, baseAmount - parseFloat(editSubscriptionForm.discountAmount))
    } else if (editSubscriptionForm.discountPercentage > 0) {
      const discount = (baseAmount * parseFloat(editSubscriptionForm.discountPercentage)) / 100
      return Math.max(0, baseAmount - discount)
    }
    return baseAmount
  }

  const handleEditPayment = (payment: any) => {
    if (payment.status?.toLowerCase() !== 'pending') {
      Swal.fire({
        icon: 'warning',
        title: 'Cannot Edit',
        text: 'Only pending payments can be edited',
        confirmButtonColor: '#dc2626',
      })
      return
    }
    setEditingPayment(payment)
    setEditPaymentForm({
      amount: parseFloat(payment.amount),
      months: payment.months,
    })
  }

  const handleSavePayment = async () => {
    try {
      await http.put(`${apiPrefix}/payments/${editingPayment.id}`, editPaymentForm)
      Swal.fire({
        icon: 'success',
        title: 'Payment Updated',
        text: 'Payment has been updated successfully',
        timer: 1500,
        showConfirmButton: false,
      })
      const savedId = editingPayment.id
      setEditingPayment(null)
      setEditPaymentForm({})
      await fetchPayments()
      await fetchTierPurchases()
      await fetchDashboardData()
      if (tierPurchaseOpenPaymentIdRef.current === savedId) {
        try {
          const res = await http.get(`${apiPrefix}/payments/${savedId}`)
          setTierPurchaseDetail(res.data)
        } catch {
          /* ignore */
        }
      }
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: error.response?.data?.message || 'Failed to update payment',
        confirmButtonColor: '#dc2626',
      })
    }
  }

  const handleCreateSubscription = async () => {
    try {
      if (!newSubscriptionForm.userId) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'Please select a user',
          confirmButtonColor: '#dc2626',
        })
        return
      }

      // Calculate end date if not provided
      let endDate = newSubscriptionForm.endDate
      if (!endDate) {
        const start = new Date(newSubscriptionForm.startDate)
        const end = new Date(start)
        end.setMonth(end.getMonth() + parseInt(newSubscriptionForm.months))
        endDate = end.toISOString().split('T')[0]
      }

      const createData = {
        userId: newSubscriptionForm.userId,
        months: parseInt(newSubscriptionForm.months),
        amount: parseFloat(newSubscriptionForm.amount),
        startDate: newSubscriptionForm.startDate,
        endDate: endDate,
        status: newSubscriptionForm.status.toUpperCase(),
      }

      const response = await http.post(`${apiPrefix}/subscriptions/create`, createData)
      Swal.fire({
        icon: 'success',
        title: 'Subscription Created',
        text: `Subscription created successfully. Amount: ${formatCurrency(response.data.amount)}`,
        timer: 2000,
        showConfirmButton: false,
      })
      setCreatingSubscription(false)
      setNewSubscriptionForm({
        userId: '',
        months: 1,
        amount: 1,
        startDate: new Date().toISOString().split('T')[0],
        status: 'active',
      })
      await fetchSubscriptions()
      await fetchDashboardData()
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Creation Failed',
        text: error.response?.data?.message || 'Failed to create subscription',
        confirmButtonColor: '#dc2626',
      })
    }
  }

  const fetchSettings = async () => {
    const settingsDefaults = {
      defaultMonthlyPrice: 1,
      shoutoutMinKes: 10,
      shoutoutMinKesWithVideo: 50,
      shoutoutMaxKes: 500_000,
      coachingAccountReviewKes: 100,
      obsAlertSecsNew: 12,
      obsAlertSecsRenewal: 12,
      obsAlertSecsShoutout: 12,
      obsAlertSecsShoutoutVideo: 45,
      obsSubscriptionMessageTemplate: '',
      obsShoutoutMessageTemplate: '',
      platformFeePercent: 5,
      supportCatalogOrder: [] as string[],
      supportTierMembershipTitle: '',
      supportTierMembershipDescription: '',
      supportTierShoutoutTitle: '',
      supportTierShoutoutDescription: '',
    }
    try {
      const res = await http.get(`${apiPrefix}/settings`)
      const merged = { ...settingsDefaults, ...res.data }
      setSettings(merged)
      setSettingsForm(merged)
    } catch (error: any) {
      console.error('Error fetching settings:', error)
      setSettings(settingsDefaults)
      setSettingsForm(settingsDefaults)
    }
  }

  const handleSaveSettings = async () => {
    try {
      // Validate price
      if (!settingsForm.defaultMonthlyPrice || settingsForm.defaultMonthlyPrice <= 0) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'Price must be greater than 0',
          confirmButtonColor: '#dc2626',
        })
        return
      }

      const sm = Number(settingsForm.shoutoutMinKes)
      const smv = Number(settingsForm.shoutoutMinKesWithVideo)
      const sx = Number(settingsForm.shoutoutMaxKes)
      if (!Number.isFinite(sm) || sm < 1) {
        Swal.fire({ icon: 'error', title: 'Invalid', text: 'Shoutout base minimum must be at least 1 KES.', confirmButtonColor: '#dc2626' })
        return
      }
      if (!Number.isFinite(smv) || smv < 1) {
        Swal.fire({ icon: 'error', title: 'Invalid', text: 'Shoutout minimum with clip must be at least 1 KES.', confirmButtonColor: '#dc2626' })
        return
      }
      if (!Number.isFinite(sx) || sx < 1) {
        Swal.fire({ icon: 'error', title: 'Invalid', text: 'Shoutout maximum must be at least 1 KES.', confirmButtonColor: '#dc2626' })
        return
      }
      if (smv < sm) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid',
          text: 'Minimum with clip must be ≥ base shoutout minimum.',
          confirmButtonColor: '#dc2626',
        })
        return
      }
      if (sx < smv) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid',
          text: 'Maximum must be ≥ minimum with clip.',
          confirmButtonColor: '#dc2626',
        })
        return
      }

      const coachKes = Number(settingsForm.coachingAccountReviewKes)
      if (!Number.isFinite(coachKes) || coachKes < 1 || coachKes > 10_000_000) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid',
          text: 'Account review checkout must be between 1 and 10,000,000 KES.',
          confirmButtonColor: '#dc2626',
        })
        return
      }

      const obsSecChecks: Array<{ key: string; label: string }> = [
        { key: 'obsAlertSecsNew', label: 'New subscriber overlay' },
        { key: 'obsAlertSecsRenewal', label: 'Renewal overlay' },
        { key: 'obsAlertSecsShoutout', label: 'Shoutout (no clip) overlay' },
        { key: 'obsAlertSecsShoutoutVideo', label: 'Shoutout (with clip) overlay' },
      ]
      for (const { key, label } of obsSecChecks) {
        const sec = Number(settingsForm[key])
        if (!Number.isFinite(sec) || sec < 3 || sec > 600) {
          Swal.fire({
            icon: 'error',
            title: 'Invalid',
            text: `${label}: use 3–600 seconds.`,
            confirmButtonColor: '#dc2626',
          })
          return
        }
      }

      if (workspace !== 'creator') {
        const feePct = Number(settingsForm.platformFeePercent)
        if (!Number.isFinite(feePct) || feePct < 0 || feePct > 100) {
          Swal.fire({
            icon: 'error',
            title: 'Invalid',
            text: 'Platform fee must be between 0 and 100 percent.',
            confirmButtonColor: '#dc2626',
          })
          return
        }
      }

      const payload =
        workspace === 'creator'
          ? { ...settingsForm, platformFeePercent: undefined }
          : settingsForm

      const response = await http.put(`${apiPrefix}/settings`, payload)
      setSettings(response.data)
      setSettingsForm(response.data) // Update form with saved values
      Swal.fire({
        icon: 'success',
        title: 'Settings Updated',
        text:
          workspace === 'creator'
            ? 'Your support & OBS settings were saved.'
            : 'Platform settings saved.',
        timer: 2000,
        showConfirmButton: false,
      })
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: error.response?.data?.message || 'Failed to update settings',
        confirmButtonColor: '#dc2626',
      })
    }
  }


  const formatAmountForRole = (amount: number) => formatKesForRole(adminUser?.role, amount)

  const handleRequestPayout = async () => {
    if (workspace !== 'creator') return
    const lockedStatuses = new Set(['PENDING', 'APPROVED', 'PAID'])
    const lockedKes = (payoutRequests || []).reduce((sum, row) => {
      if (!lockedStatuses.has(String(row?.status || ''))) return sum
      const n = Number(row?.amountKes || 0)
      return Number.isFinite(n) ? sum + n : sum
    }, 0)
    const netKes = Number(walletSummary?.totals?.netKes || 0)
    const maxAvailable = Math.max(0, Math.round((netKes - lockedKes) * 100) / 100)
    const hasPending = (payoutRequests || []).some(
      (row) => String(row?.status || '') === 'PENDING',
    )
    if (hasPending) {
      await Swal.fire({
        icon: 'info',
        title: 'Pending request exists',
        text: 'You already have a pending payout request. Wait for review before creating another one.',
        confirmButtonColor: '#7c3aed',
      })
      return
    }
    if (!Number.isFinite(maxAvailable) || maxAvailable <= 0) {
      await Swal.fire({
        icon: 'info',
        title: 'No available balance',
        text: 'You do not have available net earnings to request right now.',
        confirmButtonColor: '#7c3aed',
      })
      return
    }

    const result = await Swal.fire({
      title: 'Request payout',
      html: `
        <div style="text-align:left; display:grid; gap:10px;">
          <div style="font-size:12px;color:#94a3b8;">Available: KES ${maxAvailable.toFixed(2)}</div>
          <div style="font-size:12px;color:#94a3b8;">Minimum request: KES 100</div>
          <input id="payout-amount" class="swal2-input" type="number" min="100" max="${maxAvailable.toFixed(2)}" step="0.01" placeholder="Amount (KES)" />
          <input id="payout-channel" class="swal2-input" maxlength="80" placeholder="Payout channel (e.g. M-Pesa 2547...)" />
          <textarea id="payout-notes" class="swal2-textarea" maxlength="1000" placeholder="Optional notes"></textarea>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Submit request',
      confirmButtonColor: '#7c3aed',
      preConfirm: () => {
        const amountInput = document.getElementById('payout-amount') as HTMLInputElement | null
        const channelInput = document.getElementById('payout-channel') as HTMLInputElement | null
        const notesInput = document.getElementById('payout-notes') as HTMLTextAreaElement | null
        const amount = Number(amountInput?.value || 0)
        const payoutChannel = channelInput?.value?.trim() || ''
        const notes = notesInput?.value?.trim() || ''
        if (!Number.isFinite(amount) || amount <= 0) {
          Swal.showValidationMessage('Enter a valid amount.')
          return null
        }
        if (amount < 100) {
          Swal.showValidationMessage('Minimum payout request is KES 100.')
          return null
        }
        if (amount > maxAvailable) {
          Swal.showValidationMessage(`Amount cannot exceed KES ${maxAvailable.toFixed(2)}.`)
          return null
        }
        return { amountKes: amount, payoutChannel, notes }
      },
    })

    if (!result.isConfirmed || !result.value) return
    setPayoutRequesting(true)
    try {
      await http.post(`${apiPrefix}/payout-requests`, result.value)
      const [walletRes, payoutsRes] = await Promise.all([
        http.get<CreatorWalletSummary>(`${apiPrefix}/wallet-summary`),
        http.get(`${apiPrefix}/payout-requests`),
      ])
      setWalletSummary(walletRes.data)
      setPayoutRequests(payoutsRes.data || [])
      await Swal.fire({
        icon: 'success',
        title: 'Request submitted',
        text: 'Your payout request has been submitted for review.',
        confirmButtonColor: '#7c3aed',
      })
    } catch (error: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Request failed',
        text: formatApiErrorMessage(
          error?.response?.data,
          'Could not submit payout request.',
        ),
        confirmButtonColor: '#dc2626',
      })
    } finally {
      setPayoutRequesting(false)
    }
  }

  const handleReviewPayoutRequest = async (
    id: string,
    status: 'APPROVED' | 'REJECTED' | 'PAID',
  ) => {
    if (workspace === 'creator') return
    const result = await Swal.fire({
      title:
        status === 'APPROVED'
          ? 'Approve payout request'
          : status === 'REJECTED'
            ? 'Reject payout request'
            : 'Mark payout as paid',
      html: `
        <div style="text-align:left; display:grid; gap:10px;">
          ${
            status === 'PAID'
              ? '<input id="payout-reference" class="swal2-input" maxlength="120" placeholder="Payout reference (optional)" />'
              : ''
          }
          <textarea id="payout-review-notes" class="swal2-textarea" maxlength="1000" placeholder="Review notes (optional)"></textarea>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText:
        status === 'APPROVED'
          ? 'Approve'
          : status === 'REJECTED'
            ? 'Reject'
            : 'Mark paid',
      confirmButtonColor:
        status === 'APPROVED' ? '#0891b2' : status === 'REJECTED' ? '#dc2626' : '#16a34a',
      preConfirm: () => {
        const notesInput = document.getElementById(
          'payout-review-notes',
        ) as HTMLTextAreaElement | null
        const referenceInput = document.getElementById(
          'payout-reference',
        ) as HTMLInputElement | null
        const notes = notesInput?.value?.trim() || ''
        const payoutReference = referenceInput?.value?.trim() || ''
        return { notes, payoutReference }
      },
    })
    if (!result.isConfirmed) return

    setReviewingPayoutId(id)
    try {
      await http.patch(`${apiPrefix}/payout-requests/${id}`, {
        status,
        ...(result.value?.notes ? { notes: result.value.notes } : {}),
        ...(result.value?.payoutReference
          ? { payoutReference: result.value.payoutReference }
          : {}),
      })
      await fetchPayoutRequests()
      await Swal.fire({
        icon: 'success',
        title: 'Updated',
        text: `Payout request marked as ${status.toLowerCase()}.`,
        timer: 1500,
        showConfirmButton: false,
      })
    } catch (error: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Update failed',
        text: formatApiErrorMessage(
          error?.response?.data,
          'Could not update payout request.',
        ),
        confirmButtonColor: '#dc2626',
      })
    } finally {
      setReviewingPayoutId(null)
    }
  }

  return {
    workspace,
    loading,
    stats,
    refreshing,
    adminUser,
    users,
    subscriptions,
    payments,
    tierPurchases,
    tierPurchasesPagination,
    setTierPurchasesPagination,
    tierPurchasesObsOnly,
    setTierPurchasesObsOnly,
    tierPurchaseDetailOpen,
    tierPurchaseDetail,
    tierPurchaseDetailLoading,
    openTierPurchaseDetail,
    closeTierPurchaseDetail,
    activeTab,
    setActiveTab,
    settings,
    settingsForm,
    setSettingsForm,
    creators,
    creatorsPagination,
    setCreatorsPagination,
    updatingCreatorId,
    usersPagination,
    setUsersPagination,
    subscriptionsPagination,
    setSubscriptionsPagination,
    paymentsPagination,
    setPaymentsPagination,
    shoutouts,
    shoutoutsPagination,
    setShoutoutsPagination,
    coachingBookings,
    coachingBookingsPagination,
    setCoachingBookingsPagination,
    payoutsPagination,
    setPayoutsPagination,
    coachingBookingStatusFilter,
    setCoachingBookingStatusFilter,
    bookingDrafts,
    setBookingDrafts,
    savingBookingId,
    selectedShoutoutIds,
    replayingShoutoutId,
    replayShoutout,
    shoutoutsSelectAllRef,
    paymentsPurpose,
    setPaymentsPurpose,
    paymentsObsAlertSentOnly,
    setPaymentsObsAlertSentOnly,
    replayingPaymentId,
    replayPaymentObsAlert,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    editingUser,
    setEditingUser,
    editingSubscription,
    setEditingSubscription,
    editingPayment,
    setEditingPayment,
    creatingSubscription,
    setCreatingSubscription,
    editUserForm,
    setEditUserForm,
    editSubscriptionForm,
    setEditSubscriptionForm,
    editPaymentForm,
    setEditPaymentForm,
    showChangePasswordModal,
    setShowChangePasswordModal,
    changePasswordForm,
    setChangePasswordForm,
    changePasswordLoading,
    newSubscriptionForm,
    setNewSubscriptionForm,
    fetchDashboardData,
    fetchUsers,
    fetchCreators,
    patchCreatorAdmin,
    emailCreatorFromAdmin,
    creatorSuperProfileOpen,
    creatorSuperProfile,
    creatorSuperProfileLoading,
    openCreatorSuperProfile,
    closeCreatorSuperProfile,
    fetchSubscriptions,
    fetchPayments,
    fetchTierPurchases,
    fetchCreatorRankings,
    creatorRankings,
    creatorRankingsLoading,
    fetchStreamShoutouts,
    fetchCoachingBookings,
    fetchPayoutRequests,
    fetchCreatorRewards,
    fetchSettings,
    creatorRewards,
    creatorRewardsLoading,
    saveCreatorReward,
    reorderCreatorRewards,
    saveCoachingBooking,
    revenueData,
    walletSummary,
    payoutRequests,
    payoutRequesting,
    reviewingPayoutId,
    revenueLoading,
    revenuePreset,
    setRevenuePreset,
    revenueFrom,
    setRevenueFrom,
    revenueTo,
    setRevenueTo,
    fetchRevenue,
    toggleShoutoutSelected,
    toggleAllShoutoutsOnPage,
    handleDeleteSelectedShoutouts,
    handleRefresh,
    handleLogout,
    handleChangePassword,
    handleEditUser,
    handleConfirmWhatsApp,
    handleMarkWhatsAppRemoved,
    isAdminOrSuper,
    isSuperAdmin,
    handleSaveUser,
    handleEditSubscription,
    handleSaveSubscription,
    calculateDiscountedAmount,
    handleEditPayment,
    handleSavePayment,
    handleCreateSubscription,
    handleSaveSettings,
    exportToCSV,
    formatCurrency,
    formatAmountForRole,
    handleRequestPayout,
    handleReviewPayoutRequest,
    formatDate,
    shoutoutPlatformLabel,
    getStatusBadge,
  }
}
