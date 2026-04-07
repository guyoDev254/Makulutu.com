'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import api, { apiNetworkErrorHint, isAxiosNetworkError } from '@/lib/api'
import { formatApiErrorMessage } from '@/lib/api-origin'
import { isAuthenticated, getAdminUser, clearAuth } from '@/lib/auth'
import type {
  DashboardStats,
  PaginationInfo,
  AdminTabId,
  RevenueBreakdownResponse,
} from '@/components/admin/types'

export type RevenuePresetId = 'today' | 'yesterday' | 'last7' | 'last30' | 'custom'
import { exportToCSV } from '@/components/admin/exportCsv'
import { formatCurrency, formatAmountForRole as formatKesForRole, formatDate, shoutoutPlatformLabel, getStatusBadge } from '@/components/admin/format'

export function useAdminDashboard() {
  const router = useRouter()
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
  })
  
  // Pagination states
  const [usersPagination, setUsersPagination] = useState<PaginationInfo>({ page: 1, limit: 10, total: 0, totalPages: 0 })
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
  const [revenueData, setRevenueData] = useState<RevenueBreakdownResponse | null>(null)
  const [revenueLoading, setRevenueLoading] = useState(false)
  const [revenuePreset, setRevenuePreset] = useState<RevenuePresetId>('today')
  const [revenueFrom, setRevenueFrom] = useState('')
  const [revenueTo, setRevenueTo] = useState('')
  const [selectedShoutoutIds, setSelectedShoutoutIds] = useState<Set<string>>(() => new Set())
  const [replayingShoutoutId, setReplayingShoutoutId] = useState<string | null>(null)
  const shoutoutsSelectAllRef = useRef<HTMLInputElement>(null)
  /** Admin payments list: subscription vs stream shoutout checkouts */
  const [paymentsPurpose, setPaymentsPurpose] = useState<'SUBSCRIPTION' | 'STREAM_ALERT'>('SUBSCRIPTION')
  
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
    // Check authentication
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }

    const user = getAdminUser()
    setAdminUser(user)
    fetchDashboardData()
    
    // Load users for create subscription dropdown
    if (activeTab === 'subscriptions') {
      fetchUsers()
    }
  }, [router, activeTab])

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers()
    } else if (activeTab === 'subscriptions') {
      fetchSubscriptions()
    } else if (activeTab === 'payments') {
      fetchPayments()
    } else if (activeTab === 'shoutouts') {
      fetchStreamShoutouts()
    } else if (activeTab === 'bookings') {
      fetchCoachingBookings()
    } else if (activeTab === 'settings') {
      fetchSettings()
    }
    // revenue: loaded via fetchRevenue in its own effect
  }, [
    activeTab,
    debouncedSearch,
    statusFilter,
    usersPagination.page,
    subscriptionsPagination.page,
    paymentsPagination.page,
    paymentsPurpose,
    shoutoutsPagination.page,
    coachingBookingsPagination.page,
    coachingBookingStatusFilter,
  ])

  const fetchDashboardData = async () => {
    try {
      const statsRes = await api.get('/admin/dashboard')
      setStats(statsRes.data)
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
      
      const res = await api.get(`/admin/users?${params}`)
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

  const fetchSubscriptions = async () => {
    try {
      const params = new URLSearchParams({
        page: subscriptionsPagination.page.toString(),
        limit: subscriptionsPagination.limit.toString(),
      })
      if (debouncedSearch) params.append('search', debouncedSearch)
      if (statusFilter !== 'all') params.append('status', statusFilter.toUpperCase())
      
      const res = await api.get(`/admin/subscriptions?${params}`)
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

  const fetchPayments = async () => {
    try {
      const params = new URLSearchParams({
        page: paymentsPagination.page.toString(),
        limit: paymentsPagination.limit.toString(),
      })
      if (debouncedSearch) params.append('search', debouncedSearch)
      if (statusFilter !== 'all') params.append('status', statusFilter.toUpperCase())
      params.append('purpose', paymentsPurpose)

      const res = await api.get(`/admin/payments?${params}`)
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

  const fetchStreamShoutouts = async () => {
    try {
      const params = new URLSearchParams({
        page: shoutoutsPagination.page.toString(),
        limit: shoutoutsPagination.limit.toString(),
      })
      if (debouncedSearch) params.append('search', debouncedSearch)
      if (statusFilter !== 'all') params.append('status', statusFilter.toUpperCase())

      const res = await api.get(`/admin/stream-shoutouts?${params}`)
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
    try {
      const params = new URLSearchParams({
        page: coachingBookingsPagination.page.toString(),
        limit: coachingBookingsPagination.limit.toString(),
      })
      if (coachingBookingStatusFilter !== 'all') {
        params.append('status', coachingBookingStatusFilter.toUpperCase())
      }
      const res = await api.get(`/admin/coaching-bookings?${params}`)
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
      const res = await api.get<RevenueBreakdownResponse>(`/admin/revenue?${params}`)
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
      await api.patch(`/admin/coaching-bookings/${id}`, {
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
      const res = await api.post('/admin/stream-shoutouts/delete', { ids })
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
      await api.post(`/admin/stream-shoutouts/${id}/replay`)
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

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchDashboardData()
    if (activeTab === 'users') await fetchUsers()
    if (activeTab === 'subscriptions') await fetchSubscriptions()
    if (activeTab === 'payments') await fetchPayments()
    if (activeTab === 'shoutouts') await fetchStreamShoutouts()
    if (activeTab === 'bookings') await fetchCoachingBookings()
    if (activeTab === 'revenue') await fetchRevenue()
    if (activeTab === 'settings') await fetchSettings()
    setRefreshing(false)
    Swal.fire({
      icon: 'success',
      title: 'Refreshed',
      text: 'Data has been refreshed',
      timer: 1500,
      showConfirmButton: false,
    })
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
      clearAuth()
      router.push('/login')
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
      await api.patch(`/admin/users/${user.id}/whatsapp-confirm`)
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
      await api.patch(`/admin/users/${user.id}/whatsapp-remove`)
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

  const handleSaveUser = async () => {
    try {
      const response = await api.put(`/admin/users/${editingUser.id}`, editUserForm)
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

      const response = await api.put(`/admin/subscriptions/${editingSubscription.id}`, updateData)
      
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
      await api.put(`/admin/payments/${editingPayment.id}`, editPaymentForm)
      Swal.fire({
        icon: 'success',
        title: 'Payment Updated',
        text: 'Payment has been updated successfully',
        timer: 1500,
        showConfirmButton: false,
      })
      setEditingPayment(null)
      setEditPaymentForm({})
      await fetchPayments()
      await fetchDashboardData()
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

      const response = await api.post('/admin/subscriptions/create', createData)
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
    }
    try {
      const res = await api.get('/admin/settings')
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

      const response = await api.put('/admin/settings', settingsForm)
      setSettings(response.data)
      setSettingsForm(response.data) // Update form with saved values
      Swal.fire({
        icon: 'success',
        title: 'Settings Updated',
        text: 'Platform settings saved.',
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

  return {
    loading,
    stats,
    refreshing,
    adminUser,
    users,
    subscriptions,
    payments,
    activeTab,
    setActiveTab,
    settings,
    settingsForm,
    setSettingsForm,
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
    fetchSubscriptions,
    fetchPayments,
    fetchStreamShoutouts,
    fetchCoachingBookings,
    fetchSettings,
    saveCoachingBooking,
    revenueData,
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
    formatDate,
    shoutoutPlatformLabel,
    getStatusBadge,
  }
}
