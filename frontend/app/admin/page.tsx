'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  Link2,
  Copy,
  Plus,
  Trash2,
} from 'lucide-react'
import Swal from 'sweetalert2'
import api, { apiNetworkErrorHint, isAxiosNetworkError } from '@/lib/api'
import { isAuthenticated, getAdminUser, clearAuth } from '@/lib/auth'

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
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'subscriptions' | 'payments' | 'settings'>('overview')
  const [settings, setSettings] = useState<any>({ defaultMonthlyPrice: 1 })
  const [settingsForm, setSettingsForm] = useState<any>({ defaultMonthlyPrice: 1 })
  
  // Pagination states
  const [usersPagination, setUsersPagination] = useState<PaginationInfo>({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [subscriptionsPagination, setSubscriptionsPagination] = useState<PaginationInfo>({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [paymentsPagination, setPaymentsPagination] = useState<PaginationInfo>({ page: 1, limit: 10, total: 0, totalPages: 0 })
  
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
  const [obsTestUsername, setObsTestUsername] = useState('TestCreator')
  const [obsTestKind, setObsTestKind] = useState<'new' | 'renewal'>('new')
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
  const [obsTestLanguage, setObsTestLanguage] = useState('en-US')
  const [obsTestSkipGemini, setObsTestSkipGemini] = useState(false)

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
    } else if (activeTab === 'settings') {
      fetchSettings()
    }
  }, [activeTab, debouncedSearch, statusFilter, usersPagination.page, subscriptionsPagination.page, paymentsPagination.page])

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
    return api
      .get('/admin/obs-alerts/link')
      .then((res) => {
        setObsLinkInfo(res.data)
        return res.data
      })
      .catch((err) => {
        setObsLinkInfo(obsLinkLoadError(err))
      })
  }

  useEffect(() => {
    if (activeTab !== 'overview' || loading) return
    let cancelled = false
    api
      .get('/admin/obs-alerts/link')
      .then((res) => {
        if (!cancelled) setObsLinkInfo(res.data)
      })
      .catch((err) => {
        if (!cancelled) setObsLinkInfo(obsLinkLoadError(err))
      })
    return () => {
      cancelled = true
    }
  }, [activeTab, loading])

  const apiPublicBase = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '')
  const obsPasteUrl = (() => {
    if (!obsLinkInfo) return ''
    if (obsLinkInfo.playerUrl) return obsLinkInfo.playerUrl
    const path = obsLinkInfo.copyUrl
    if (path?.startsWith('/') && apiPublicBase) {
      return `${apiPublicBase}${path}`
    }
    return path ?? ''
  })()

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

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchDashboardData()
    if (activeTab === 'users') await fetchUsers()
    if (activeTab === 'subscriptions') await fetchSubscriptions()
    if (activeTab === 'payments') await fetchPayments()
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
    if (payment.status.toLowerCase() !== 'pending') {
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
    try {
      const res = await api.get('/admin/settings')
      setSettings(res.data)
      setSettingsForm(res.data)
    } catch (error: any) {
      console.error('Error fetching settings:', error)
      // If settings don't exist, use defaults
      setSettings({ defaultMonthlyPrice: 1 })
      setSettingsForm({ defaultMonthlyPrice: 1 })
    }
  }

  const handleTestObsAlert = async () => {
    const trimmed = obsTestUsername.trim().replace(/^@+/, '') || 'TestCreator'
    setObsTestLoading(true)
    try {
      const res = await api.post('/admin/obs-alerts/test', {
        tiktokUsername: trimmed,
        kind: obsTestKind,
        languageCode: obsTestLanguage,
        ...(obsTestSkipGemini ? { skipGemini: true } : {}),
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
      Swal.fire({
        icon: 'success',
        title: 'Alert sent',
        text: enabled
          ? `OBS should show @${trimmed} (${obsTestKind}). ${typeof sseListeners === 'number' ? `${sseListeners} listener(s) connected.` : ''}`.trim()
          : `Event emitted (dev mode). In production, set OBS_ALERT_SECRET and use the player URL with the same token, or the Browser Source will not connect.`,
        timer: enabled ? 2800 : 4500,
        showConfirmButton: false,
      })
    } catch (error: any) {
      const d = error.response?.data
      let msg =
        (typeof d?.message === 'string' && d.message) ||
        (Array.isArray(d?.message) && d.message.join('; ')) ||
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
      const res = await api.post('/admin/obs-stream-links', {
        ...(label ? { label } : {}),
      })
      const url = res.data?.playerUrl || res.data?.copyUrl
      await loadObsAlerts()
      setObsNewLinkLabel('')
      await Swal.fire({
        icon: 'success',
        title: 'Unique OBS link created',
        html: url
          ? `<p class="text-sm text-left mb-2">Copy this into OBS → Browser Source → URL. The token is shown only once; save it somewhere safe.</p><p class="text-xs font-mono break-all text-left bg-gray-900 p-2 rounded">${url}</p>`
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
      await api.delete(`/admin/obs-stream-links/${id}`)
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

      const response = await api.put('/admin/settings', settingsForm)
      setSettings(response.data)
      setSettingsForm(response.data) // Update form with saved values
      Swal.fire({
        icon: 'success',
        title: 'Settings Updated',
        text: `Default monthly price updated to ${formatCurrency(response.data.defaultMonthlyPrice)}`,
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
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-gray-400 text-sm mt-1">Manage your subscription platform</p>
            </div>
            <div className="flex items-center gap-3">
              {adminUser && (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-700/50 rounded-lg">
                  <UserIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-300">{adminUser.username}</span>
                  <span className="text-xs text-gray-500 uppercase">({adminUser.role})</span>
                </div>
              )}
              <button
                onClick={() => setShowChangePasswordModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                title="Change password"
              >
                <Lock className="w-4 h-4" />
                Change password
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-gray-800/30 backdrop-blur-sm border-b border-gray-700/50">
        <div className="container mx-auto px-4">
          <div className="flex space-x-1 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'subscriptions', label: 'Subscriptions', icon: Calendar },
              { id: 'payments', label: 'Payments', icon: CreditCard },
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
                  className={`flex items-center gap-2 px-6 py-4 font-semibold transition whitespace-nowrap ${
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
      <div className="container mx-auto px-4 py-8">
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
                <p className="text-sm text-gray-400">{stats.payments.total} total transactions</p>
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

            <div className="bg-gradient-to-br from-fuchsia-500/10 to-purple-600/5 rounded-xl p-6 border border-fuchsia-500/25 space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex gap-3">
                  <div className="p-3 bg-fuchsia-500/20 rounded-lg shrink-0">
                    <Megaphone className="w-6 h-6 text-fuchsia-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">OBS subscriber alert (test)</h3>
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
                      TikTok username
                    </label>
                    <input
                      type="text"
                      value={obsTestUsername}
                      onChange={(e) => setObsTestUsername(e.target.value)}
                      placeholder="TestCreator"
                      className="w-full px-3 py-2 bg-gray-900/60 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-sm"
                    />
                  </div>
                  <div className="min-w-[120px]">
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Type</label>
                    <select
                      value={obsTestKind}
                      onChange={(e) =>
                        setObsTestKind(e.target.value as 'new' | 'renewal')
                      }
                      className="w-full px-3 py-2 bg-gray-900/60 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500 text-sm"
                    >
                      <option value="new">New subscriber</option>
                      <option value="renewal">Resubscribed</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-gray-400 self-end pb-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={obsTestSkipGemini}
                      onChange={(e) => setObsTestSkipGemini(e.target.checked)}
                      className="rounded border-gray-600 bg-gray-900 text-fuchsia-600 focus:ring-fuchsia-500"
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
              </div>

              <div className="border-t border-fuchsia-500/20 pt-4 space-y-4">
                {isAdminOrSuper() && (
                  <div className="rounded-lg border border-fuchsia-500/20 bg-gray-900/30 p-4 space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold text-white">
                        Unique OBS links
                      </h4>
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
                    {(obsLinkInfo?.uniqueLinks?.length ?? 0) > 0 && (
                      <ul className="space-y-2">
                        {obsLinkInfo!.uniqueLinks!.map((link) => (
                          <li
                            key={link.id}
                            className="flex items-center justify-between gap-2 text-sm bg-gray-900/60 border border-gray-700/60 rounded-lg px-3 py-2"
                          >
                            <span className="text-gray-200 min-w-0 truncate">
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
                              disabled={obsRevokeId === link.id}
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
                    )}
                  </div>
                )}

                <div>
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
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">User</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">TikTok</th>
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
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">User</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Months</th>
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
            {/* Search, Filter and Actions */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search payments by user, transaction ID, or reference..."
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
                onClick={() => exportToCSV(payments, 'payments')}
                className="flex items-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>

            {/* Payments Table */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">User</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Months</th>
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
                      payments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-700/30 transition">
                          <td className="px-6 py-4">
                            <div className="font-medium text-white">{payment.user?.name || 'N/A'}</div>
                            <div className="text-sm text-gray-400">{payment.user?.mpesaMobile || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 text-gray-300 font-semibold">{formatAmountForRole(Number(payment.amount))}</td>
                          <td className="px-6 py-4 text-gray-300">{payment.months} month{payment.months !== 1 ? 's' : ''}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(payment.status)}`}>
                              {payment.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-300 text-sm font-mono">
                            {payment.transactionId || payment.reference || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-gray-400 text-sm">{formatDate(payment.createdAt)}</td>
                          <td className="px-6 py-4">
                            {payment.status.toLowerCase() === 'pending' && isAdminOrSuper() && (
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
                      ))
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
