'use client'

import Link from 'next/link'
import {
  Users,
  CreditCard,
  Calendar,
  TrendingUp,
  Loader2,
  Search,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
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
  MessageCircle,
  Settings as SettingsIcon,
  Lock,
  Megaphone,
  Trash2,
  CalendarCheck,
  RotateCcw,
} from 'lucide-react'
import { DashboardCharts } from '@/components/admin/DashboardCharts'
import { COACHING_SERVICE_LABELS } from '@/components/admin/constants'
import type { AdminDashboardModel } from '@/components/admin/adminDashboardTypes'
import { AdminDashboardModals } from '@/components/admin/AdminDashboardModals'

export type { AdminDashboardModel }

export function AdminDashboardView({ admin }: { admin: AdminDashboardModel }) {
  if (admin.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const {
    stats,
    activeTab,
    setActiveTab,
    refreshing,
    adminUser,
    users,
    subscriptions,
    payments,
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
    setShowChangePasswordModal,
    setCreatingSubscription,
    saveCoachingBooking,
    toggleShoutoutSelected,
    toggleAllShoutoutsOnPage,
    handleDeleteSelectedShoutouts,
    handleRefresh,
    handleLogout,
    handleEditUser,
    handleConfirmWhatsApp,
    handleMarkWhatsAppRemoved,
    isAdminOrSuper,
    handleEditSubscription,
    handleEditPayment,
    handleSaveSettings,
    exportToCSV,
    formatCurrency,
    formatAmountForRole,
    formatDate,
    shoutoutPlatformLabel,
    getStatusBadge,
  } = admin

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
              { id: 'bookings', label: 'Bookings', icon: CalendarCheck },
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
                    setCoachingBookingStatusFilter('all')
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
                <table className="w-full min-w-[1080px]">
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
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-[120px]">
                        Replay
                      </th>
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
                          colSpan={isAdminOrSuper() ? 10 : 9}
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
                            <td className="px-3 sm:px-6 py-3 sm:py-4 align-middle whitespace-nowrap">
                              <button
                                type="button"
                                disabled={
                                  pay?.status !== 'COMPLETED' || replayingShoutoutId === row.id
                                }
                                onClick={() => void replayShoutout(row.id)}
                                title={
                                  pay?.status !== 'COMPLETED'
                                    ? 'Only completed payments can be replayed'
                                    : 'Send this shoutout to OBS again'
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                {replayingShoutoutId === row.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                                ) : (
                                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                                )}
                                Replay
                              </button>
                            </td>
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

        {activeTab === 'bookings' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-700/60 bg-gray-800/40 px-4 py-3 text-sm text-gray-300">
              <span className="font-semibold text-white">
                {coachingBookingsPagination.total}{' '}
                {coachingBookingsPagination.total === 1 ? 'booking' : 'bookings'}
              </span>{' '}
              in the database (all pages). Each public <span className="text-gray-200">/book</span> submit calls{' '}
              <code className="text-emerald-300/90 text-xs">POST /coaching-bookings</code>; the visitor sees a
              success message (no WhatsApp or copy step). If this stays at 0 after testing, run{' '}
              <code className="text-gray-200 text-xs">npx prisma migrate deploy</code> on the{' '}
              <strong className="text-gray-100">same</strong> database the API uses, and confirm{' '}
              <code className="text-gray-200 text-xs">NEXT_PUBLIC_API_URL</code> points at that API.
            </div>
            <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
              <p className="text-sm text-gray-400 max-w-2xl">
                Coaching requests from the public <span className="text-gray-300">/book</span> page. Status and
                internal notes are saved here; the public book page confirms by message only after the save succeeds.
              </p>
              <select
                value={coachingBookingStatusFilter}
                onChange={(e) => {
                  setCoachingBookingStatusFilter(e.target.value)
                  setCoachingBookingsPagination((p) => ({ ...p, page: 1 }))
                }}
                className="px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shrink-0"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="contacted">Contacted</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
              <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                <table className="w-full min-w-[960px]">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Service
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Name / contact
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Availability
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Notes
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Admin notes
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider w-28">
                        Save
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {coachingBookings.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                          No coaching bookings yet — or the <code className="text-gray-300">coaching_bookings</code>{' '}
                          table is missing. Run the Prisma migration, then submit from the site book page.
                        </td>
                      </tr>
                    ) : (
                      coachingBookings.map((row) => {
                        const draft = bookingDrafts[row.id] ?? {
                          status: row.status,
                          adminNotes: row.adminNotes ?? '',
                        }
                        return (
                          <tr key={row.id} className="hover:bg-gray-700/30 transition align-top">
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-emerald-200/90 text-sm font-medium whitespace-nowrap">
                              {COACHING_SERVICE_LABELS[row.service] ?? row.service}
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm">
                              <div className="text-white font-medium">{row.name}</div>
                              <div className="text-gray-400 mt-1 break-all">{row.contact}</div>
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-gray-300 text-sm max-w-[180px]">
                              {row.availability ? (
                                <span className="line-clamp-3" title={row.availability}>
                                  {row.availability}
                                </span>
                              ) : (
                                <span className="text-gray-500">—</span>
                              )}
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-gray-300 text-sm max-w-[200px]">
                              {row.notes ? (
                                <span className="line-clamp-3" title={row.notes}>
                                  {row.notes}
                                </span>
                              ) : (
                                <span className="text-gray-500">—</span>
                              )}
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4">
                              <select
                                value={draft.status}
                                onChange={(e) =>
                                  setBookingDrafts((prev) => ({
                                    ...prev,
                                    [row.id]: { ...draft, status: e.target.value },
                                  }))
                                }
                                className="w-full min-w-[8rem] px-2 py-2 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              >
                                <option value="PENDING">Pending</option>
                                <option value="CONTACTED">Contacted</option>
                                <option value="SCHEDULED">Scheduled</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="CANCELLED">Cancelled</option>
                              </select>
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 min-w-[160px]">
                              <textarea
                                value={draft.adminNotes}
                                onChange={(e) =>
                                  setBookingDrafts((prev) => ({
                                    ...prev,
                                    [row.id]: { ...draft, adminNotes: e.target.value },
                                  }))
                                }
                                rows={2}
                                maxLength={1000}
                                placeholder="Internal…"
                                className="w-full px-2 py-2 bg-gray-900/80 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y min-h-[2.5rem]"
                              />
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-gray-400 text-sm whitespace-nowrap">
                              {formatDate(row.createdAt)}
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4">
                              <button
                                type="button"
                                disabled={savingBookingId === row.id}
                                onClick={() => void saveCoachingBooking(row.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
                              >
                                {savingBookingId === row.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Save className="w-4 h-4" />
                                )}
                                Save
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {coachingBookingsPagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-700/50 flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    Showing{' '}
                    {(coachingBookingsPagination.page - 1) * coachingBookingsPagination.limit + 1} to{' '}
                    {Math.min(
                      coachingBookingsPagination.page * coachingBookingsPagination.limit,
                      coachingBookingsPagination.total,
                    )}{' '}
                    of {coachingBookingsPagination.total} bookings
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCoachingBookingsPagination({
                          ...coachingBookingsPagination,
                          page: coachingBookingsPagination.page - 1,
                        })
                      }
                      disabled={coachingBookingsPagination.page === 1}
                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-4 py-2 bg-gray-700 text-white rounded-lg">
                      {coachingBookingsPagination.page} / {coachingBookingsPagination.totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCoachingBookingsPagination({
                          ...coachingBookingsPagination,
                          page: coachingBookingsPagination.page + 1,
                        })
                      }
                      disabled={coachingBookingsPagination.page >= coachingBookingsPagination.totalPages}
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

      <AdminDashboardModals admin={admin} />
    </div>
  )
}
