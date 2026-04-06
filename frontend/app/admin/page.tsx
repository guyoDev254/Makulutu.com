'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Users, 
  CreditCard, 
  Calendar, 
  TrendingUp, 
  Loader2, 
  Search, 
  Filter,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  UserPlus,
  Activity,
  BarChart3,
  FileText,
  LogOut,
  User as UserIcon,
  Edit,
  Save,
  X,
  MessageCircle,
  Settings as SettingsIcon,
  Lock,
  Megaphone,
  Plus,
  Trash2,
} from 'lucide-react'
import Swal from 'sweetalert2'
import api, { apiNetworkErrorHint, isAxiosNetworkError } from '@/lib/api'
import { isAuthenticated, getAdminUser, clearAuth } from '@/lib/auth'
import { DashboardCharts } from '@/components/admin/DashboardCharts'

interface DashboardStats {
  users: {
    total: number
    active: number
  }
  subscriptions: {
    total: number
    active: number
    expired: number
  }
  payments: {
    total: number
    completed: number
    pending: number
    failed: number
    totalAmount: number
    subscriptionAmount: number
    shoutoutAmount: number
  }
  trends?: {
    days: number
    series: Array<{
      date: string
      label: string
      completedPayments: number
      revenueKes: number
      newSubscriptions: number
    }>
  }
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [adminUser, setAdminUser] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'subscriptions' | 'payments' | 'shoutouts' | 'settings'>('overview')
  const [settings, setSettings] = useState<any>({
    defaultMonthlyPrice: 1,
    shoutoutMinKes: 10,
    shoutoutMinKesWithVideo: 50,
    shoutoutMaxKes: 500_000,
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
  const [selectedShoutoutIds, setSelectedShoutoutIds] = useState<Set<string>>(() => new Set())
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
    } else if (activeTab === 'settings') {
      fetchSettings()
    }
  }, [activeTab, debouncedSearch, statusFilter, usersPagination.page, subscriptionsPagination.page, paymentsPagination.page, paymentsPurpose, shoutoutsPagination.page])

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

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchDashboardData()
    if (activeTab === 'users') await fetchUsers()
    if (activeTab === 'subscriptions') await fetchSubscriptions()
    if (activeTab === 'payments') await fetchPayments()
    if (activeTab === 'shoutouts') await fetchStreamShoutouts()
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

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Data',
        text: 'There is no data to export',
        confirmButtonColor: '#dc2626',
      })
      return
    }

    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header]
          if (value === null || value === undefined) return ''
          if (typeof value === 'object') return JSON.stringify(value)
          return String(value).replace(/,/g, ';')
        }).join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const formatCurrency = (amount: number) => {
    return `KES ${parseFloat(amount.toString()).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatAmountForRole = (amount: number) => {
    return adminUser?.role === 'MODERATOR' ? '—' : formatCurrency(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const shoutoutPlatformLabel = (code: string | null | undefined) => {
    const labels: Record<string, string> = {
      tiktok: 'TikTok',
      youtube: 'YouTube',
      facebook: 'Facebook',
      x: 'X',
      twitch: 'Twitch',
      other: 'Other',
    }
    const k = (code || '').toLowerCase()
    return labels[k] || (code ? String(code) : '—')
  }

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase()
    const styles = {
      active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      expired: 'bg-red-500/10 text-red-400 border-red-500/20',
      cancelled: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
      pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      failed: 'bg-red-500/10 text-red-400 border-red-500/20',
    }
    return styles[statusLower as keyof typeof styles] || styles.pending
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-lg border-b border-gray-700/50 sticky top-0 z-50">
        <div className="container mx-auto max-w-[1600px] px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent truncate">
                Admin Dashboard
              </h1>
              <p className="text-gray-400 text-xs sm:text-sm mt-1">
                Manage your subscription platform
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto lg:justify-end">
              {adminUser && (
                <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 bg-gray-700/50 rounded-lg min-w-0 max-w-full">
                  <UserIcon className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-xs sm:text-sm text-gray-300 truncate">{adminUser.username}</span>
                  <span className="text-[10px] sm:text-xs text-gray-500 uppercase shrink-0 hidden sm:inline">
                    ({adminUser.role})
                  </span>
                </div>
              )}
              <Link
                href="/admin/obs-alerts"
                className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 min-h-[44px] bg-fuchsia-900/35 hover:bg-fuchsia-800/45 text-fuchsia-100 rounded-lg border border-fuchsia-500/25 transition text-sm"
              >
                <Megaphone className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">OBS alerts</span>
              </Link>
              <button
                onClick={() => setShowChangePasswordModal(true)}
                className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 min-h-[44px] bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-sm"
                title="Change password"
              >
                <Lock className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Change password</span>
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 min-h-[44px] bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition disabled:opacity-50 text-sm"
              >
                <RefreshCw className={`w-4 h-4 shrink-0 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 min-h-[44px] bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-gray-800/30 backdrop-blur-sm border-b border-gray-700/50">
        <div className="container mx-auto max-w-[1600px] px-2 sm:px-4">
          <div className="flex space-x-1 overflow-x-auto pb-px touch-pan-x [-webkit-overflow-scrolling:touch]">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'subscriptions', label: 'Subscriptions', icon: Calendar },
              { id: 'payments', label: 'Payments', icon: CreditCard },
              { id: 'shoutouts', label: 'Shoutouts', icon: Megaphone },
              ...(isAdminOrSuper() ? [{ id: 'settings', label: 'Settings', icon: SettingsIcon }] : []),
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any)
                    setSearchQuery('')
                    setStatusFilter('all')
                  }}
                  className={`flex items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-semibold transition whitespace-nowrap shrink-0 ${
                    activeTab === tab.id
                      ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-[1600px] px-3 sm:px-4 py-6 sm:py-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-xl p-6 border border-purple-500/20 hover:border-purple-500/40 transition">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-500/20 rounded-lg">
                    <Users className="w-6 h-6 text-purple-400" />
                  </div>
                  <UserPlus className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-gray-400 text-sm mb-1">Total Users</h3>
                <p className="text-3xl font-bold text-white mb-2">{stats.users.total}</p>
                <p className="text-sm text-emerald-400">{stats.users.active} active users</p>
              </div>

              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-xl p-6 border border-blue-500/20 hover:border-blue-500/40 transition">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <Calendar className="w-6 h-6 text-blue-400" />
                  </div>
                  <Activity className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-gray-400 text-sm mb-1">Active Subscriptions</h3>
                <p className="text-3xl font-bold text-white mb-2">{stats.subscriptions.active}</p>
                <p className="text-sm text-gray-400">{stats.subscriptions.total} total • {stats.subscriptions.expired} expired</p>
              </div>

              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 rounded-xl p-6 border border-emerald-500/20 hover:border-emerald-500/40 transition">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-emerald-500/20 rounded-lg">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-gray-400 text-sm mb-1">Completed Payments</h3>
                <p className="text-3xl font-bold text-white mb-2">{stats.payments.completed}</p>
                <p className="text-sm text-yellow-400">{stats.payments.pending} pending</p>
              </div>

              <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-xl p-6 border border-amber-500/20 hover:border-amber-500/40 transition">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-amber-500/20 rounded-lg">
                    <DollarSign className="w-6 h-6 text-amber-400" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-gray-400 text-sm mb-1">Total Revenue</h3>
                <p className="text-3xl font-bold text-white mb-2">{formatAmountForRole(stats.payments.totalAmount)}</p>
                <div className="text-sm space-y-1">
                  <p className="text-purple-300/90">
                    Subscriptions:{' '}
                    <span className="font-semibold text-white">
                      {formatAmountForRole(stats.payments.subscriptionAmount ?? 0)}
                    </span>
                  </p>
                  <p className="text-cyan-300/90">
                    Shoutouts:{' '}
                    <span className="font-semibold text-white">
                      {formatAmountForRole(stats.payments.shoutoutAmount ?? 0)}
                    </span>
                  </p>
                </div>
                <p className="text-sm text-gray-400 mt-2">{stats.payments.total} total transactions</p>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-gray-300 font-semibold">Pending Payments</h3>
                </div>
                <p className="text-2xl font-bold text-white">{stats.payments.pending}</p>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                <div className="flex items-center gap-3 mb-2">
                  <XCircle className="w-5 h-5 text-red-400" />
                  <h3 className="text-gray-300 font-semibold">Failed Payments</h3>
                </div>
                <p className="text-2xl font-bold text-white">{stats.payments.failed}</p>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <h3 className="text-gray-300 font-semibold">Total Subscriptions</h3>
                </div>
                <p className="text-2xl font-bold text-white">{stats.subscriptions.total}</p>
              </div>
            </div>

            <Link
              href="/admin/obs-alerts"
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl p-5 border border-fuchsia-500/25 bg-gradient-to-br from-fuchsia-500/10 to-purple-600/5 hover:border-fuchsia-400/40 transition group"
            >
              <div className="flex gap-3 min-w-0">
                <div className="p-3 bg-fuchsia-500/20 rounded-lg shrink-0 group-hover:bg-fuchsia-500/30 transition">
                  <Megaphone className="w-6 h-6 text-fuchsia-300" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-white">OBS subscriber alerts</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Browser source URL, test alerts, voice options, and unique stream links.
                  </p>
                </div>
              </div>
              <span className="text-sm font-semibold text-fuchsia-300 shrink-0 sm:ml-4">
                Open page →
              </span>
            </Link>

            <DashboardCharts
              series={stats.trends?.series ?? []}
              payments={stats.payments}
              formatKes={formatAmountForRole}
              hideNumericAmounts={adminUser?.role === 'MODERATOR'}
            />
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Search and Actions */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users by name, TikTok username, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <button
                onClick={() => exportToCSV(users, 'users')}
                className="flex items-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>

            {/* Users Table */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
              <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                <table className="w-full min-w-[720px]">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">User</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">TikTok</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">M-Pesa</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">WhatsApp</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">WhatsApp Group</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Subscriptions</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Payments</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Joined</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-12 text-center text-gray-400">
                          No users found
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-700/30 transition">
                          <td className="px-6 py-4">
                            <div className="font-medium text-white">{user.name}</div>
                            {!user.isActive && (
                              <span className="text-xs text-red-400">Inactive</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-gray-300">@{user.tiktokUsername}</td>
                          <td className="px-6 py-4 text-gray-300">{user.mpesaMobile}</td>
                          <td className="px-6 py-4 text-gray-300">{user.whatsappNumber}</td>
                          <td className="px-6 py-4">
                            {user.addedToWhatsApp ? (
                              <span className="inline-flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 text-emerald-400 text-sm">
                                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                                  Added
                                </span>
                                <button
                                  onClick={() => handleMarkWhatsAppRemoved(user)}
                                  className="text-xs text-amber-400 hover:text-amber-300 underline"
                                  title="Mark as removed from WhatsApp group"
                                >
                                  Mark removed
                                </button>
                              </span>
                            ) : (
                              <button
                                onClick={() => handleConfirmWhatsApp(user)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition"
                                title="Confirm user has been added to WhatsApp group"
                              >
                                <MessageCircle className="w-4 h-4 shrink-0" />
                                Confirm added
                              </button>
                            )}
                          </td>
                          <td className="px-6 py-4 text-gray-300">{user._count?.subscriptions || 0}</td>
                          <td className="px-6 py-4 text-gray-300">{user._count?.payments || 0}</td>
                          <td className="px-6 py-4 text-gray-400 text-sm">{formatDate(user.createdAt)}</td>
                          <td className="px-6 py-4">
                            {isAdminOrSuper() && (
                              <button
                                onClick={() => handleEditUser(user)}
                                className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition"
                                title="Edit user"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {usersPagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-700/50 flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    Showing {((usersPagination.page - 1) * usersPagination.limit) + 1} to {Math.min(usersPagination.page * usersPagination.limit, usersPagination.total)} of {usersPagination.total} users
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setUsersPagination({...usersPagination, page: usersPagination.page - 1})}
                      disabled={usersPagination.page === 1}
                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-4 py-2 bg-gray-700 text-white rounded-lg">
                      {usersPagination.page} / {usersPagination.totalPages}
                    </span>
                    <button
                      onClick={() => setUsersPagination({...usersPagination, page: usersPagination.page + 1})}
                      disabled={usersPagination.page >= usersPagination.totalPages}
                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-6">
            {/* Search, Filter and Actions */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search subscriptions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
              {isAdminOrSuper() && (
                <button
                  onClick={() => setCreatingSubscription(true)}
                  className="flex items-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
                >
                  <UserPlus className="w-4 h-4" />
                  Create Subscription
                </button>
              )}
              <button
                onClick={() => exportToCSV(subscriptions, 'subscriptions')}
                className="flex items-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>

            {/* Subscriptions Table */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
              <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">User</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Months</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Start Date</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">End Date</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {subscriptions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                          No subscriptions found
                        </td>
                      </tr>
                    ) : (
                      subscriptions.map((sub) => (
                        <tr key={sub.id} className="hover:bg-gray-700/30 transition">
                          <td className="px-6 py-4">
                            <div className="font-medium text-white">{sub.user?.name || 'N/A'}</div>
                            <div className="text-sm text-gray-400">@{sub.user?.tiktokUsername || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 text-gray-300">{sub.months} month{sub.months !== 1 ? 's' : ''}</td>
                          <td className="px-6 py-4 text-gray-300 text-sm">{formatDate(sub.startDate)}</td>
                          <td className="px-6 py-4 text-gray-300 text-sm">{formatDate(sub.endDate)}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(sub.status)}`}>
                              {sub.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-300 font-medium">{formatAmountForRole(Number(sub.amount))}</td>
                          <td className="px-6 py-4">
                            {isAdminOrSuper() && (
                              <button
                                onClick={() => handleEditSubscription(sub)}
                                className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition"
                                title="Edit subscription"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {subscriptionsPagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-700/50 flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    Showing {((subscriptionsPagination.page - 1) * subscriptionsPagination.limit) + 1} to {Math.min(subscriptionsPagination.page * subscriptionsPagination.limit, subscriptionsPagination.total)} of {subscriptionsPagination.total} subscriptions
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSubscriptionsPagination({...subscriptionsPagination, page: subscriptionsPagination.page - 1})}
                      disabled={subscriptionsPagination.page === 1}
                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-4 py-2 bg-gray-700 text-white rounded-lg">
                      {subscriptionsPagination.page} / {subscriptionsPagination.totalPages}
                    </span>
                    <button
                      onClick={() => setSubscriptionsPagination({...subscriptionsPagination, page: subscriptionsPagination.page + 1})}
                      disabled={subscriptionsPagination.page >= subscriptionsPagination.totalPages}
                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2 p-1 bg-gray-800/80 rounded-xl border border-gray-700/60 w-fit">
              <button
                type="button"
                onClick={() => {
                  setPaymentsPurpose('SUBSCRIPTION')
                  setPaymentsPagination((p) => ({ ...p, page: 1 }))
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  paymentsPurpose === 'SUBSCRIPTION'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                Subscription payments
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaymentsPurpose('STREAM_ALERT')
                  setPaymentsPagination((p) => ({ ...p, page: 1 }))
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  paymentsPurpose === 'STREAM_ALERT'
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                Shoutout payments
              </button>
            </div>

            {/* Search, Filter and Actions */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={
                    paymentsPurpose === 'SUBSCRIPTION'
                      ? 'Search by user, transaction ID, or reference...'
                      : 'Search by user, @handle, message, transaction, or reference...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
              <button
                onClick={() =>
                  exportToCSV(
                    payments,
                    paymentsPurpose === 'SUBSCRIPTION'
                      ? 'payments-subscriptions'
                      : 'payments-shoutouts',
                  )
                }
                className="flex items-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>

            {/* Payments Table */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
              <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                <table className="w-full min-w-[760px]">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">User</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Amount</th>
                      {paymentsPurpose === 'SUBSCRIPTION' ? (
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Months</th>
                      ) : (
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Shoutout</th>
                      )}
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Transaction ID</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                          No payments found
                        </td>
                      </tr>
                    ) : (
                      payments.map((payment) => {
                        const sh = payment.streamShoutout
                        const shoutPlat = sh?.platform ?? payment.streamAlertPlatform
                        const shoutHandle = sh?.displayHandle ?? payment.streamAlertHandle
                        const shoutMsg = sh?.message ?? payment.streamAlertMessage
                        return (
                        <tr key={payment.id} className="hover:bg-gray-700/30 transition">
                          <td className="px-6 py-4">
                            <div className="font-medium text-white">{payment.user?.name || 'N/A'}</div>
                            <div className="text-sm text-gray-400">{payment.user?.mpesaMobile || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 text-gray-300 font-semibold">{formatAmountForRole(Number(payment.amount ?? 0))}</td>
                          {paymentsPurpose === 'SUBSCRIPTION' ? (
                            <td className="px-6 py-4 text-gray-300">
                              {payment.months != null ? `${payment.months} month${payment.months !== 1 ? 's' : ''}` : '—'}
                            </td>
                          ) : (
                            <td className="px-6 py-4 text-gray-300 text-sm max-w-[220px]">
                              <div className="text-cyan-300/90 font-medium">{shoutoutPlatformLabel(shoutPlat)}</div>
                              <div className="text-white mt-0.5">@{shoutHandle || payment.user?.tiktokUsername || '—'}</div>
                              {shoutMsg ? (
                                <div className="text-gray-400 mt-1 line-clamp-2" title={shoutMsg}>
                                  {shoutMsg}
                                </div>
                              ) : (
                                <div className="text-gray-500 mt-1 italic">No message</div>
                              )}
                            </td>
                          )}
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(payment.status || '')}`}>
                              {payment.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-300 text-sm font-mono">
                            {payment.transactionId || payment.reference || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-gray-400 text-sm">{payment.createdAt ? formatDate(payment.createdAt) : '—'}</td>
                          <td className="px-6 py-4">
                            {payment.status?.toLowerCase() === 'pending' && isAdminOrSuper() && (
                              <button
                                onClick={() => handleEditPayment(payment)}
                                className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition"
                                title="Edit payment"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {paymentsPagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-700/50 flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    Showing {((paymentsPagination.page - 1) * paymentsPagination.limit) + 1} to {Math.min(paymentsPagination.page * paymentsPagination.limit, paymentsPagination.total)} of {paymentsPagination.total} payments
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPaymentsPagination({...paymentsPagination, page: paymentsPagination.page - 1})}
                      disabled={paymentsPagination.page === 1}
                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-4 py-2 bg-gray-700 text-white rounded-lg">
                      {paymentsPagination.page} / {paymentsPagination.totalPages}
                    </span>
                    <button
                      onClick={() => setPaymentsPagination({...paymentsPagination, page: paymentsPagination.page + 1})}
                      disabled={paymentsPagination.page >= paymentsPagination.totalPages}
                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stream shoutouts table (`stream_shoutouts` in DB) */}
        {activeTab === 'shoutouts' && (
          <div className="space-y-6">
            

            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search handle, message, platform, payment id, payer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="all">All payment status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
              <button
                type="button"
                onClick={() =>
                  exportToCSV(
                    shoutouts.map((row) => ({
                      id: row.id,
                      displayHandle: row.displayHandle,
                      platform: row.platform,
                      message: row.message ?? '',
                      videoUrl: row.videoUrl ?? '',
                      amountKes: row.amountKes,
                      paymentStatus: row.payment?.status,
                      paymentId: row.paymentId,
                      payerName: row.payment?.user?.name ?? '',
                      payerPhone: row.payment?.user?.mpesaMobile ?? '',
                      createdAt: row.createdAt,
                    })),
                    'stream-shoutouts',
                  )
                }
                className="flex items-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              {isAdminOrSuper() && (
                <button
                  type="button"
                  disabled={selectedShoutoutIds.size === 0}
                  onClick={() => void handleDeleteSelectedShoutouts()}
                  className="flex items-center gap-2 px-4 py-3 bg-red-600/90 hover:bg-red-600 text-white rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete selected ({selectedShoutoutIds.size})
                </button>
              )}
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
              <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                <table className="w-full min-w-[1000px]">
                  <thead className="bg-gray-700/50">
                    <tr>
                      {isAdminOrSuper() && (
                        <th className="w-12 px-3 py-3 sm:py-4 text-left">
                          <input
                            ref={shoutoutsSelectAllRef}
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-500 bg-gray-800 text-cyan-600 focus:ring-cyan-500"
                            checked={
                              shoutouts.length > 0 &&
                              shoutouts.every((r) => selectedShoutoutIds.has(r.id))
                            }
                            onChange={(e) => toggleAllShoutoutsOnPage(e.target.checked)}
                            title="Select all on this page"
                            aria-label="Select all shoutouts on this page"
                          />
                        </th>
                      )}
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        @Handle
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Platform
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Message
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Clip (TT / IG)
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Shoutout KES
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Payment
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Payer
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {shoutouts.length === 0 ? (
                      <tr>
                        <td
                          colSpan={isAdminOrSuper() ? 9 : 8}
                          className="px-6 py-12 text-center text-gray-400"
                        >
                          No shoutout rows yet — run the Prisma migration so <code className="text-gray-300">stream_shoutouts</code>{' '}
                          exists, then new shoutout checkouts will appear here.
                        </td>
                      </tr>
                    ) : (
                      shoutouts.map((row) => {
                        const pay = row.payment
                        return (
                          <tr key={row.id} className="hover:bg-gray-700/30 transition">
                            {isAdminOrSuper() && (
                              <td className="w-12 px-3 py-3 sm:py-4 align-middle">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-gray-500 bg-gray-800 text-cyan-600 focus:ring-cyan-500"
                                  checked={selectedShoutoutIds.has(row.id)}
                                  onChange={() => toggleShoutoutSelected(row.id)}
                                  aria-label={`Select shoutout @${row.displayHandle}`}
                                />
                              </td>
                            )}
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-white font-medium">@{row.displayHandle}</td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-cyan-300/90">{shoutoutPlatformLabel(row.platform)}</td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-gray-300 text-sm max-w-[200px]">
                              {row.message ? (
                                <span className="line-clamp-2" title={row.message}>
                                  {row.message}
                                </span>
                              ) : (
                                <span className="text-gray-500 italic">—</span>
                              )}
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm max-w-[160px]">
                              {row.videoUrl ? (
                                <a
                                  href={row.videoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-cyan-400 hover:text-cyan-300 underline break-all line-clamp-2"
                                >
                                  Open clip
                                </a>
                              ) : (
                                <span className="text-gray-500 italic">—</span>
                              )}
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-gray-200 font-semibold">
                              {formatAmountForRole(Number(row.amountKes ?? 0))}
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(pay?.status || '')}`}
                              >
                                {pay?.status ?? '—'}
                              </span>
                              <div className="text-xs text-gray-500 font-mono mt-1 max-w-[140px] truncate" title={pay?.id}>
                                {pay?.transactionId || pay?.reference || pay?.id?.slice(0, 8) || '—'}
                              </div>
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-gray-300">
                              <div>{pay?.user?.name || '—'}</div>
                              <div className="text-gray-500">{pay?.user?.mpesaMobile || ''}</div>
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-gray-400 text-sm">
                              {row.createdAt ? formatDate(row.createdAt) : '—'}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {shoutoutsPagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-700/50 flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    Showing {((shoutoutsPagination.page - 1) * shoutoutsPagination.limit) + 1} to{' '}
                    {Math.min(shoutoutsPagination.page * shoutoutsPagination.limit, shoutoutsPagination.total)} of{' '}
                    {shoutoutsPagination.total} rows
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setShoutoutsPagination({ ...shoutoutsPagination, page: shoutoutsPagination.page - 1 })
                      }
                      disabled={shoutoutsPagination.page === 1}
                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-4 py-2 bg-gray-700 text-white rounded-lg">
                      {shoutoutsPagination.page} / {shoutoutsPagination.totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setShoutoutsPagination({ ...shoutoutsPagination, page: shoutoutsPagination.page + 1 })
                      }
                      disabled={shoutoutsPagination.page >= shoutoutsPagination.totalPages}
                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {!isAdminOrSuper() ? (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-8 text-center">
                <p className="text-amber-400">You don&apos;t have permission to access Settings. Admin or Super Admin role required.</p>
              </div>
            ) : (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Platform Settings</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Default Monthly Subscription Price (KES)
                  </label>
                  <p className="text-xs text-gray-400 mb-3">
                    This is the default price per month used when users register for subscriptions. 
                    You can change this value and it will apply to all new registrations.
                  </p>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={settingsForm.defaultMonthlyPrice || 1}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value)
                        if (!isNaN(value) && value > 0) {
                          setSettingsForm({
                            ...settingsForm,
                            defaultMonthlyPrice: value
                          })
                        }
                      }}
                      className="w-48 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-gray-400">KES per month</span>
                  </div>
                  {(!settingsForm.defaultMonthlyPrice || settingsForm.defaultMonthlyPrice <= 0) && (
                    <p className="text-red-400 text-sm mt-1">Price must be greater than 0</p>
                  )}
                  <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <p className="text-sm text-gray-300">
                      <strong>Current Setting:</strong>{' '}
                      <span className="text-purple-400 font-semibold">
                        {formatCurrency(settings.defaultMonthlyPrice)} per month
                      </span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Example: If set to 2.50 KES, a 3-month subscription will cost 7.50 KES (2.50 × 3)
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-2">Shoutout checkout (M-Pesa)</h3>
                  <p className="text-xs text-gray-400 mb-4 max-w-2xl">
                    Public shoutout form uses these limits. If the payer adds a TikTok clip URL, the higher
                    minimum applies. Values are stored in platform settings and enforced on the server.
                  </p>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Min (no clip) <span className="text-gray-500 font-normal">KES</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={settingsForm.shoutoutMinKes ?? 10}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10)
                          if (!Number.isNaN(v) && v >= 1) {
                            setSettingsForm({ ...settingsForm, shoutoutMinKes: v })
                          }
                        }}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Min (with clip) <span className="text-gray-500 font-normal">KES</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={settingsForm.shoutoutMinKesWithVideo ?? 50}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10)
                          if (!Number.isNaN(v) && v >= 1) {
                            setSettingsForm({ ...settingsForm, shoutoutMinKesWithVideo: v })
                          }
                        }}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Max <span className="text-gray-500 font-normal">KES</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={settingsForm.shoutoutMaxKes ?? 500_000}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10)
                          if (!Number.isNaN(v) && v >= 1) {
                            setSettingsForm({ ...settingsForm, shoutoutMaxKes: v })
                          }
                        }}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    Current: <span className="text-cyan-300/90">min {settings.shoutoutMinKes}</span> /{' '}
                    <span className="text-cyan-300/90">with clip {settings.shoutoutMinKesWithVideo}</span> /{' '}
                    <span className="text-cyan-300/90">max {settings.shoutoutMaxKes}</span>
                  </p>
                </div>

                <div className="border-t border-gray-700 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-2">OBS alert display time</h3>
                  <p className="text-xs text-gray-400 mb-4 max-w-2xl">
                    How long each alert stays on screen in the OBS Browser Source before it hides. Reload the player URL
                    after saving so the new timings apply (each page load reads settings from the server). Range: 3–600
                    seconds.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        New subscriber <span className="text-gray-500 font-normal">sec</span>
                      </label>
                      <input
                        type="number"
                        min={3}
                        max={600}
                        step={1}
                        value={settingsForm.obsAlertSecsNew ?? 12}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10)
                          if (!Number.isNaN(v)) {
                            setSettingsForm({ ...settingsForm, obsAlertSecsNew: v })
                          }
                        }}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Renewal <span className="text-gray-500 font-normal">sec</span>
                      </label>
                      <input
                        type="number"
                        min={3}
                        max={600}
                        step={1}
                        value={settingsForm.obsAlertSecsRenewal ?? 12}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10)
                          if (!Number.isNaN(v)) {
                            setSettingsForm({ ...settingsForm, obsAlertSecsRenewal: v })
                          }
                        }}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Shoutout (text only) <span className="text-gray-500 font-normal">sec</span>
                      </label>
                      <input
                        type="number"
                        min={3}
                        max={600}
                        step={1}
                        value={settingsForm.obsAlertSecsShoutout ?? 12}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10)
                          if (!Number.isNaN(v)) {
                            setSettingsForm({ ...settingsForm, obsAlertSecsShoutout: v })
                          }
                        }}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Shoutout (with clip) <span className="text-gray-500 font-normal">sec</span>
                      </label>
                      <input
                        type="number"
                        min={3}
                        max={600}
                        step={1}
                        value={settingsForm.obsAlertSecsShoutoutVideo ?? 45}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10)
                          if (!Number.isNaN(v)) {
                            setSettingsForm({ ...settingsForm, obsAlertSecsShoutoutVideo: v })
                          }
                        }}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    Saved: new {settings.obsAlertSecsNew ?? 12}s · renewal {settings.obsAlertSecsRenewal ?? 12}s ·
                    shoutout {settings.obsAlertSecsShoutout ?? 12}s · with clip {settings.obsAlertSecsShoutoutVideo ?? 45}s
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => {
                      setSettingsForm(settings)
                    }}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                  >
                    Reset
                  </button>
                  <button
                    onClick={handleSaveSettings}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Settings
                  </button>
                </div>
              </div>
            </div>
            )}
          </div>
        )}
      </div>

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-purple-400" />
                Change password
              </h2>
              <button
                onClick={() => {
                  setShowChangePasswordModal(false)
                  setChangePasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
                }}
                className="p-2 hover:bg-gray-700 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Current password</label>
                <input
                  type="password"
                  value={changePasswordForm.oldPassword}
                  onChange={(e) => setChangePasswordForm({ ...changePasswordForm, oldPassword: e.target.value })}
                  placeholder="Enter current password"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">New password</label>
                <input
                  type="password"
                  value={changePasswordForm.newPassword}
                  onChange={(e) => setChangePasswordForm({ ...changePasswordForm, newPassword: e.target.value })}
                  placeholder="At least 6 characters"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Confirm new password</label>
                <input
                  type="password"
                  value={changePasswordForm.confirmPassword}
                  onChange={(e) => setChangePasswordForm({ ...changePasswordForm, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoComplete="new-password"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowChangePasswordModal(false)
                    setChangePasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={changePasswordLoading}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition flex items-center gap-2 disabled:opacity-50"
                >
                  {changePasswordLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Change password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Edit User</h2>
              <button
                onClick={() => setEditingUser(null)}
                className="p-2 hover:bg-gray-700 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                <input
                  type="text"
                  value={editUserForm.name}
                  onChange={(e) => setEditUserForm({...editUserForm, name: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">TikTok Username</label>
                <input
                  type="text"
                  value={editUserForm.tiktokUsername}
                  onChange={(e) => setEditUserForm({...editUserForm, tiktokUsername: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">M-Pesa Mobile</label>
                <input
                  type="text"
                  value={editUserForm.mpesaMobile}
                  onChange={(e) => setEditUserForm({...editUserForm, mpesaMobile: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">WhatsApp Number</label>
                <input
                  type="text"
                  value={editUserForm.whatsappNumber}
                  onChange={(e) => setEditUserForm({...editUserForm, whatsappNumber: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editUserForm.isActive}
                  onChange={(e) => setEditUserForm({...editUserForm, isActive: e.target.checked})}
                  className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-300">Active User</label>
              </div>
            </div>
            <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUser}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Subscription Modal */}
      {editingSubscription && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Edit Subscription</h2>
              <button
                onClick={() => setEditingSubscription(null)}
                className="p-2 hover:bg-gray-700 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-400">
                  <strong>User:</strong> {editingSubscription.user?.name} (@{editingSubscription.user?.tiktokUsername})
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Months</label>
                  <input
                    type="number"
                    min="1"
                    value={editSubscriptionForm.months}
                    onChange={(e) => {
                      const months = e.target.value
                      const start = new Date(editSubscriptionForm.startDate)
                      const end = new Date(start)
                      end.setMonth(end.getMonth() + parseInt(months))
                      setEditSubscriptionForm({
                        ...editSubscriptionForm,
                        months,
                        endDate: end.toISOString().split('T')[0],
                      })
                    }}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                  <select
                    value={editSubscriptionForm.status}
                    onChange={(e) => setEditSubscriptionForm({...editSubscriptionForm, status: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Base Amount (KES)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editSubscriptionForm.amount}
                  onChange={(e) => setEditSubscriptionForm({...editSubscriptionForm, amount: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="border-t border-gray-700 pt-4">
                <h3 className="text-lg font-semibold text-white mb-3">Apply Discount</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Discount Amount (KES)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editSubscriptionForm.discountAmount}
                      onChange={(e) => {
                        const val = e.target.value
                        setEditSubscriptionForm({
                          ...editSubscriptionForm,
                          discountAmount: val,
                          discountPercentage: val ? 0 : editSubscriptionForm.discountPercentage
                        })
                      }}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Discount Percentage (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={editSubscriptionForm.discountPercentage}
                      onChange={(e) => {
                        const val = e.target.value
                        setEditSubscriptionForm({
                          ...editSubscriptionForm,
                          discountPercentage: val,
                          discountAmount: val ? 0 : editSubscriptionForm.discountAmount
                        })
                      }}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="0"
                    />
                  </div>
                </div>
                {(editSubscriptionForm.discountAmount > 0 || editSubscriptionForm.discountPercentage > 0) && (
                  <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <p className="text-sm text-gray-300">
                      <span className="text-emerald-400 font-semibold">Final Amount:</span>{' '}
                      <span className="text-xl font-bold text-white">{formatCurrency(calculateDiscountedAmount())}</span>
                    </p>
                    {editSubscriptionForm.discountAmount > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        Discount: {formatCurrency(editSubscriptionForm.discountAmount)}
                      </p>
                    )}
                    {editSubscriptionForm.discountPercentage > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        Discount: {editSubscriptionForm.discountPercentage}% ({formatCurrency((parseFloat(editSubscriptionForm.amount) * parseFloat(editSubscriptionForm.discountPercentage)) / 100)})
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={editSubscriptionForm.startDate}
                    onChange={(e) => {
                      const startDate = e.target.value
                      const start = new Date(startDate)
                      const end = new Date(start)
                      end.setMonth(end.getMonth() + parseInt(editSubscriptionForm.months))
                      setEditSubscriptionForm({
                        ...editSubscriptionForm,
                        startDate,
                        endDate: end.toISOString().split('T')[0],
                      })
                    }}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
                  <input
                    type="date"
                    value={editSubscriptionForm.endDate}
                    onChange={(e) => setEditSubscriptionForm({...editSubscriptionForm, endDate: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Auto-calculated from start date + months</p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setEditingSubscription(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSubscription}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payment Modal */}
      {editingPayment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Edit Payment</h2>
              <button
                onClick={() => {
                  setEditingPayment(null)
                  setEditPaymentForm({})
                }}
                className="p-2 hover:bg-gray-700 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-400">
                  <strong>Note:</strong> Only pending payments can be edited. This will update the payment amount before it's completed.
                </p>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-400">
                  <strong>User:</strong> {editingPayment.user?.name} (@{editingPayment.user?.tiktokUsername})
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Amount (KES)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editPaymentForm.amount}
                  onChange={(e) => setEditPaymentForm({...editPaymentForm, amount: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Months</label>
                <input
                  type="number"
                  min="1"
                  value={editPaymentForm.months}
                  onChange={(e) => setEditPaymentForm({...editPaymentForm, months: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setEditingPayment(null)
                  setEditPaymentForm({})
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePayment}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Subscription Modal */}
      {creatingSubscription && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Create Subscription</h2>
              <button
                onClick={() => {
                  setCreatingSubscription(false)
                  setNewSubscriptionForm({
                    userId: '',
                    months: 1,
                    amount: 1,
                    startDate: new Date().toISOString().split('T')[0],
                    status: 'active',
                  })
                }}
                className="p-2 hover:bg-gray-700 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Select User</label>
                {users.length === 0 ? (
                  <div className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-400">
                    Loading users...
                  </div>
                ) : (
                  <select
                    value={newSubscriptionForm.userId}
                    onChange={(e) => setNewSubscriptionForm({...newSubscriptionForm, userId: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">-- Select User --</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} (@{user.tiktokUsername}) - {user.mpesaMobile}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Months</label>
                  <input
                    type="number"
                    min="1"
                    value={newSubscriptionForm.months}
                    onChange={(e) => {
                      const months = e.target.value
                      const start = new Date(newSubscriptionForm.startDate)
                      const end = new Date(start)
                      end.setMonth(end.getMonth() + parseInt(months))
                      setNewSubscriptionForm({
                        ...newSubscriptionForm,
                        months,
                        endDate: end.toISOString().split('T')[0],
                      })
                    }}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Amount (KES)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newSubscriptionForm.amount}
                    onChange={(e) => setNewSubscriptionForm({...newSubscriptionForm, amount: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={newSubscriptionForm.startDate}
                    onChange={(e) => {
                      const startDate = e.target.value
                      const start = new Date(startDate)
                      const end = new Date(start)
                      end.setMonth(end.getMonth() + parseInt(newSubscriptionForm.months))
                      setNewSubscriptionForm({
                        ...newSubscriptionForm,
                        startDate,
                        endDate: end.toISOString().split('T')[0],
                      })
                    }}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">End Date (Auto-calculated)</label>
                  <input
                    type="date"
                    value={(() => {
                      if (newSubscriptionForm.endDate) return newSubscriptionForm.endDate
                      const start = new Date(newSubscriptionForm.startDate)
                      const end = new Date(start)
                      end.setMonth(end.getMonth() + parseInt(newSubscriptionForm.months))
                      return end.toISOString().split('T')[0]
                    })()}
                    onChange={(e) => setNewSubscriptionForm({...newSubscriptionForm, endDate: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    readOnly
                  />
                  <p className="text-xs text-gray-400 mt-1">Auto-calculated from start date + months</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                  <select
                    value={newSubscriptionForm.status}
                    onChange={(e) => setNewSubscriptionForm({...newSubscriptionForm, status: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                <p className="text-sm text-gray-300">
                  <strong>Total Amount:</strong>{' '}
                  <span className="text-xl font-bold text-white">{formatCurrency(newSubscriptionForm.amount)}</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Duration: {newSubscriptionForm.months} month{newSubscriptionForm.months != 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setCreatingSubscription(false)
                  setNewSubscriptionForm({
                    userId: '',
                    months: 1,
                    amount: 1,
                    startDate: new Date().toISOString().split('T')[0],
                    status: 'active',
                  })
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSubscription}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Create Subscription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
