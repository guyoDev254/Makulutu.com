'use client'

import { useState } from 'react'
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
  DollarSign,
  UserPlus,
  BarChart3,
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
  Wallet,
  Gift,
  ArrowUp,
  ArrowDown,
  ShoppingBag,
  Menu,
  X,
  ExternalLink,
  Sparkles,
  UserSquare2,
  ArrowRight,
  AlertTriangle,
  LayoutDashboard,
  Trophy,
} from 'lucide-react'
import type { AdminTabId } from '@/components/admin/types'
import { DashboardCharts } from '@/components/admin/DashboardCharts'
import { COACHING_SERVICE_LABELS } from '@/components/admin/constants'
import type { AdminDashboardModel } from '@/components/admin/adminDashboardTypes'
import { AdminDashboardModals } from '@/components/admin/AdminDashboardModals'
import { CreatorSuperProfileModal } from '@/components/admin/CreatorSuperProfileModal'
import { PlatformFeeBreakdownTable } from '@/components/admin/PlatformFeeBreakdownTable'
import { AdminRewardsPanel } from '@/components/admin/AdminRewardsPanel'
import api from '@/lib/api'
import { creatorDashboardApi } from '@/lib/creator-dashboard-api'

export type { AdminDashboardModel }

function platformRoleLabel(role: string | undefined): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Super admin · platform-wide'
    case 'ADMIN':
      return 'Admin · platform-wide'
    case 'MODERATOR':
      return 'Moderator · support tools only'
    default:
      return role ? String(role).replace(/_/g, ' ') : ''
  }
}

/** Same rules as the OBS player — preview only, for Settings UI. */
function previewObsMessageTemplate(
  tpl: string | undefined,
  vars: { name: string; platform: string; amount: string; message: string; kind: string },
): string {
  const src = (tpl ?? '').trim()
  if (!src) return ''
  return src
    .replace(/\{\{\s*name\s*\}\}/gi, vars.name)
    .replace(/\{\{\s*platform\s*\}\}/gi, vars.platform)
    .replace(/\{\{\s*amount\s*\}\}/gi, vars.amount)
    .replace(/\{\{\s*message\s*\}\}/gi, vars.message)
    .replace(/\{\{\s*kind\s*\}\}/gi, vars.kind)
    .replace(/\{\{\s*displayName\s*\}\}/gi, vars.name)
    .replace(/\{\{\s*tiktokUsername\s*\}\}/gi, vars.name)
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 500)
}

const OBS_MSG_SAMPLE = {
  name: 'Jamie',
  platform: 'TikTok',
  subAmount: '2500',
  shoutAmount: '500',
  subNote: 'Love the streams!',
  shoutNote: 'GGs!',
} as const

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
    workspace,
    stats,
    activeTab,
    setActiveTab,
    refreshing,
    adminUser,
    users,
    creators,
    creatorsPagination,
    setCreatorsPagination,
    patchCreatorAdmin,
    emailCreatorFromAdmin,
    updatingCreatorId,
    creatorSuperProfileOpen,
    creatorSuperProfile,
    creatorSuperProfileLoading,
    openCreatorSuperProfile,
    closeCreatorSuperProfile,
    subscriptions,
    payments,
    tierPurchases,
    tierPurchasesPagination,
    setTierPurchasesPagination,
    tierPurchasesObsOnly,
    setTierPurchasesObsOnly,
    creatorRankings,
    creatorRankingsLoading,
    openTierPurchaseDetail,
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
    setShowChangePasswordModal,
    setCreatingSubscription,
    saveCoachingBooking,
    creatorRewards,
    creatorRewardsLoading,
    saveCreatorReward,
    reorderCreatorRewards,
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
    handleEditUser,
    handleConfirmWhatsApp,
    handleMarkWhatsAppRemoved,
    isAdminOrSuper,
    isSuperAdmin,
    handleEditSubscription,
    handleEditPayment,
    handleSaveSettings,
    exportToCSV,
    formatCurrency,
    formatAmountForRole,
    handleRequestPayout,
    handleReviewPayoutRequest,
    formatDate,
    shoutoutPlatformLabel,
    getStatusBadge,
  } = admin

  const isCreatorWorkspace = workspace === 'creator'
  const showRewardTiersTab = isCreatorWorkspace || isAdminOrSuper()
  const showPlatformSettingsTab = isCreatorWorkspace || isAdminOrSuper()
  const showShoutoutBulkDelete = isAdminOrSuper() && !isCreatorWorkspace
  const superAdminUser = isSuperAdmin()
  const [platformSidebarOpen, setPlatformSidebarOpen] = useState(false)

  const navigatePlatformTab = (id: AdminTabId) => {
    setActiveTab(id)
    setSearchQuery('')
    setStatusFilter('all')
    setCoachingBookingStatusFilter('all')
    setPlatformSidebarOpen(false)
  }

  const platformSidebarSections: {
    heading: string
    items: {
      id: AdminTabId
      label: string
      icon: typeof Users
      show: boolean
    }[]
  }[] = [
    {
      heading: 'Main',
      items: [
        { id: 'overview', label: 'Dashboard', icon: BarChart3, show: true },
        { id: 'creators', label: 'Streamers', icon: UserSquare2, show: true },
        { id: 'users', label: 'Supporters', icon: Users, show: true },
        { id: 'subscriptions', label: 'Subscriptions', icon: Calendar, show: true },
        { id: 'payments', label: 'Payments', icon: CreditCard, show: true },
        { id: 'tierPurchases', label: 'Tier checkouts', icon: ShoppingBag, show: true },
      ],
    },
    {
      heading: 'Operations',
      items: [
        { id: 'shoutouts', label: 'Shoutouts', icon: Megaphone, show: true },
        { id: 'bookings', label: 'Coaching', icon: CalendarCheck, show: true },
        { id: 'payouts', label: 'Payouts', icon: Wallet, show: true },
        { id: 'revenue', label: 'Revenue', icon: TrendingUp, show: true },
      ],
    },
    {
      heading: 'Configuration',
      items: [
        { id: 'rewards', label: 'Reward tiers', icon: Gift, show: showRewardTiersTab },
        { id: 'settings', label: 'Settings', icon: SettingsIcon, show: showPlatformSettingsTab },
      ],
    },
  ]

  const renderPlatformSidebarNav = () => (
    <nav className="flex flex-col gap-6 p-3 pt-4">
      {platformSidebarSections.map((section) => {
        const visible = section.items.filter((i) => i.show)
        if (visible.length === 0) return null
        return (
          <div key={section.heading}>
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {section.heading}
            </p>
            <ul className="space-y-0.5">
              {visible.map((item) => {
                const Icon = item.icon
                const active = activeTab === item.id
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => navigatePlatformTab(item.id)}
                      className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                        active
                          ? 'bg-cyan-500/15 text-cyan-100 ring-1 ring-cyan-500/35'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 opacity-80" aria-hidden />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium leading-tight">{item.label}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
      {superAdminUser ? (
        <div className="border-t border-slate-700/60 pt-4">
          <Link
            href="/creator/signup"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setPlatformSidebarOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/80"
          >
            <Sparkles className="h-4 w-4 shrink-0 text-amber-400/90" />
            New streamer signup
            <ExternalLink className="h-3.5 w-3.5 ml-auto opacity-50" aria-hidden />
          </Link>
        </div>
      ) : null}
    </nav>
  )

  return (
    <div
      className={
        (isCreatorWorkspace
          ? 'min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
          : 'min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-950')
      }
    >
      {/* Header */}
      <header
        className={
          isCreatorWorkspace
            ? 'bg-gray-800/50 backdrop-blur-lg border-b border-gray-700/50 sticky top-0 z-50'
            : 'bg-slate-900/60 backdrop-blur-lg border-b border-slate-700/50 sticky top-0 z-50'
        }
      >
        <div className="container mx-auto max-w-[1600px] px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex items-start gap-3">
              {!isCreatorWorkspace ? (
                <button
                  type="button"
                  onClick={() => setPlatformSidebarOpen((o) => !o)}
                  className="lg:hidden mt-1 p-2 rounded-lg border border-slate-600/60 bg-slate-800/80 text-slate-200 hover:bg-slate-700/80 shrink-0"
                  aria-label={platformSidebarOpen ? 'Close menu' : 'Open menu'}
                >
                  {platformSidebarOpen ? (
                    <X className="w-5 h-5" />
                  ) : (
                    <Menu className="w-5 h-5" />
                  )}
                </button>
              ) : null}
              <div className="min-w-0">
              <h1
                className={
                  isCreatorWorkspace
                    ? 'text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent truncate'
                    : 'text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent truncate'
                }
              >
                {isCreatorWorkspace ? 'Creator workspace' : 'Platform admin'}
              </h1>
              <p
                className={
                  isCreatorWorkspace
                    ? 'text-gray-400 text-xs sm:text-sm mt-1'
                    : 'text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl'
                }
              >
                {isCreatorWorkspace
                  ? 'Your subscribers, revenue, shoutouts, and OBS tools'
                  : 'All creators, billing, payouts, and platform settings.'}
              </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto lg:justify-end">
              {adminUser && (
                <div
                  className={
                    isCreatorWorkspace
                      ? 'flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 bg-gray-700/50 rounded-lg min-w-0 max-w-full'
                      : 'flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 bg-slate-800/70 rounded-lg min-w-0 max-w-full border border-slate-600/40'
                  }
                >
                  <UserIcon className="w-4 h-4 text-gray-400 shrink-0" />
                  <div className="min-w-0 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                    <span className="text-xs sm:text-sm text-gray-300 truncate">
                      {adminUser.username}
                    </span>
                    {isCreatorWorkspace && adminUser.slug ? (
                      <span className="text-[10px] sm:text-xs text-violet-300/90 truncate">
                        /{adminUser.slug}
                      </span>
                    ) : null}
                  </div>
                  {!isCreatorWorkspace ? (
                    <span className="text-[10px] sm:text-xs text-cyan-200/80 shrink-0 hidden sm:inline max-w-[200px] truncate">
                      {platformRoleLabel(adminUser.role)}
                    </span>
                  ) : (
                    <span className="text-[10px] sm:text-xs text-gray-500 uppercase shrink-0 hidden sm:inline">
                      Creator
                    </span>
                  )}
                </div>
              )}
              {isCreatorWorkspace ? (
                <Link
                  href="/creator/profile"
                  className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 min-h-[44px] bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-sm"
                  title="Public profile & page URL"
                >
                  <UserIcon className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Profile</span>
                </Link>
              ) : null}
              <Link
                href={isCreatorWorkspace ? '/creator/obs-alerts' : '/admin/obs-alerts'}
                className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 min-h-[44px] bg-fuchsia-900/35 hover:bg-fuchsia-800/45 text-fuchsia-100 rounded-lg border border-fuchsia-500/25 transition text-sm"
              >
                <Megaphone className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">OBS alerts</span>
              </Link>
              {!isCreatorWorkspace ? (
                <button
                  onClick={() => setShowChangePasswordModal(true)}
                  className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 min-h-[44px] bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition text-sm"
                  title="Change password"
                >
                  <Lock className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Change password</span>
                </button>
              ) : null}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className={
                  isCreatorWorkspace
                    ? 'flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 min-h-[44px] bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition disabled:opacity-50 text-sm'
                    : 'flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 min-h-[44px] bg-cyan-700 hover:bg-cyan-600 text-white rounded-lg transition disabled:opacity-50 text-sm'
                }
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

      {isCreatorWorkspace ? (
        <div className="bg-gray-800/30 backdrop-blur-sm border-b border-gray-700/50">
          <div className="container mx-auto max-w-[1600px] px-2 sm:px-4">
            <div className="flex space-x-1 overflow-x-auto pb-px touch-pan-x [-webkit-overflow-scrolling:touch]">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'users', label: 'Users', icon: Users },
                { id: 'subscriptions', label: 'Subscriptions', icon: Calendar },
                { id: 'payments', label: 'Payments', icon: CreditCard },
                { id: 'tierPurchases', label: 'Tier purchases', icon: ShoppingBag },
                { id: 'rankings', label: 'Rankings', icon: Trophy },
                { id: 'shoutouts', label: 'Shoutouts', icon: Megaphone },
                { id: 'payouts', label: 'Payouts', icon: Wallet },
                { id: 'revenue', label: 'Revenue', icon: TrendingUp },
                ...(showRewardTiersTab
                  ? [{ id: 'rewards', label: 'Reward tiers', icon: Gift }]
                  : []),
                ...(showPlatformSettingsTab
                  ? [{ id: 'settings', label: 'Settings', icon: SettingsIcon }]
                  : []),
              ].map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id as AdminTabId)
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
      ) : (
        <>
          {platformSidebarOpen ? (
            <div
              className="fixed inset-0 z-50 flex lg:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Platform navigation"
            >
              <button
                type="button"
                className="absolute inset-0 bg-black/65"
                aria-label="Close menu"
                onClick={() => setPlatformSidebarOpen(false)}
              />
              <div className="relative flex h-full w-[min(288px,90vw)] flex-col border-r border-slate-700/60 bg-slate-950 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-700/60 px-3 py-3">
                  <span className="text-sm font-semibold text-white">Platform menu</span>
                  <button
                    type="button"
                    onClick={() => setPlatformSidebarOpen(false)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">{renderPlatformSidebarNav()}</div>
              </div>
            </div>
          ) : null}
          <aside
            className="pointer-events-none hidden lg:pointer-events-auto lg:fixed lg:bottom-0 lg:left-0 lg:top-[4.5rem] lg:z-30 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-slate-700/50 lg:bg-slate-900/75"
            aria-label="Platform navigation"
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{renderPlatformSidebarNav()}</div>
          </aside>
        </>
      )}

      {/* Content */}
      <div
        className={`mx-auto w-full max-w-[1600px] px-3 sm:px-4 py-6 sm:py-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] ${
          isCreatorWorkspace ? 'container' : 'lg:pl-72'
        }`}
      >
        {!isCreatorWorkspace && activeTab !== 'overview' ? (
          <header className="mb-5 border-b border-slate-700/40 pb-4">
            <h2 className="text-lg font-semibold text-white tracking-tight">
              {
                {
                  creators: 'Streamers',
                  users: 'Supporters',
                  subscriptions: 'Subscriptions',
                  payments: 'Payments',
                  tierPurchases: 'Tier checkouts',
                  rankings: 'Rankings',
                  shoutouts: 'Shoutouts',
                  bookings: 'Coaching',
                  payouts: 'Payouts',
                  revenue: 'Revenue',
                  rewards: 'Reward tiers',
                  settings: 'Settings',
                }[activeTab]
              }
            </h2>
          </header>
        ) : null}
        {activeTab === 'overview' && stats && (
          <div className="space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 hidden rounded-xl border border-slate-600/60 bg-slate-800/80 p-2.5 sm:block">
                  <LayoutDashboard className="h-6 w-6 text-cyan-400/90" aria-hidden />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    {isCreatorWorkspace ? 'Your dashboard' : 'Dashboard'}
                  </h2>
                  <p className="mt-1 max-w-xl text-sm text-slate-400">
                    {isCreatorWorkspace
                      ? 'Supporters, subscriptions, and payouts in one place. Use the tabs above for full lists.'
                      : `${new Date().toLocaleDateString('en-KE', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} · Full platform snapshot${
                          stats?.payoutProcessingSchedule
                            ? ' · Creator payouts: super admin processing day is Wednesday (see Payouts tab).'
                            : ''
                        }`}
                  </p>
                </div>
              </div>
              {!isCreatorWorkspace && adminUser?.role ? (
                <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-100/90">
                  {platformRoleLabel(adminUser.role)}
                </span>
              ) : null}
            </div>

            {!isCreatorWorkspace &&
            ((typeof stats.pendingPayoutRequests === 'number' && stats.pendingPayoutRequests > 0) ||
              stats.payments.failed > 0) ? (
              <div className="space-y-3">
                {typeof stats.pendingPayoutRequests === 'number' && stats.pendingPayoutRequests > 0 ? (
                  <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/50 to-slate-900/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-3">
                      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" aria-hidden />
                      <div>
                        <p className="text-sm font-semibold text-amber-100">
                          {stats.pendingPayoutRequests} payout request
                          {stats.pendingPayoutRequests === 1 ? '' : 's'} need review
                        </p>
                        <p className="mt-0.5 text-xs text-amber-200/75">
                          Approve, reject, or mark paid from Payouts.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigatePlatformTab('payouts')}
                      className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-amber-600/90 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-500 sm:self-auto"
                    >
                      Review payouts
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                ) : null}
                {stats.payments.failed > 0 ? (
                  <div className="flex flex-col gap-3 rounded-2xl border border-red-500/25 bg-red-950/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-3">
                      <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" aria-hidden />
                      <div>
                        <p className="text-sm font-semibold text-red-100">
                          {stats.payments.failed} failed payment
                          {stats.payments.failed === 1 ? '' : 's'}
                        </p>
                        <p className="mt-0.5 text-xs text-red-200/70">
                          Check the Payments tab for details and follow-up.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigatePlatformTab('payments')}
                      className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-red-500/40 bg-red-500/15 px-4 py-2.5 text-sm font-semibold text-red-100 hover:bg-red-500/25 sm:self-auto"
                    >
                      Open payments
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {(() => {
              const r = stats.payments.revenueBySource
              const sub = r?.subscriptionsKes ?? stats.payments.subscriptionAmount ?? 0
              const shout = r?.shoutoutsKes ?? stats.payments.shoutoutAmount ?? 0
              const coach = r?.coachingKes ?? 0
              const tiers = r?.tiersKes ?? 0
              const other = r?.otherKes ?? 0
              const totalKes =
                r?.totalKes ??
                stats.payments.totalAmount ??
                sub + shout + coach + tiers + other
              const denom = totalKes > 0 ? totalKes : 1
              const slices = [
                {
                  key: 'sub',
                  label: 'Subscriptions',
                  kes: sub,
                  fill: 'rgb(167 139 250 / 0.9)',
                },
                {
                  key: 'shout',
                  label: 'Shoutouts',
                  kes: shout,
                  fill: 'rgb(34 211 238 / 0.9)',
                },
                {
                  key: 'coach',
                  label: 'Coaching',
                  kes: coach,
                  fill: 'rgb(251 191 36 / 0.9)',
                },
                {
                  key: 'tiers',
                  label: 'Reward tiers',
                  kes: tiers,
                  fill: 'rgb(232 121 249 / 0.9)',
                },
                {
                  key: 'other',
                  label: 'Other',
                  kes: other,
                  fill: 'rgb(148 163 184 / 0.85)',
                },
              ].filter((s) => s.kes > 0)
              const showModeratorPlaceholder = adminUser?.role === 'MODERATOR'

              return (
                <div className="rounded-2xl border border-slate-700/70 bg-slate-900/45 p-4 shadow-lg shadow-black/15 sm:p-6">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white">Revenue by source</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Share of completed payments (all time{isCreatorWorkspace ? ', your page' : ''})
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        isCreatorWorkspace ? setActiveTab('revenue') : navigatePlatformTab('revenue')
                      }
                      className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-slate-600/70 bg-slate-800/60 px-3 py-2 text-xs font-medium text-slate-200 hover:border-cyan-500/40 hover:bg-slate-800"
                    >
                      Full revenue report
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>

                  {showModeratorPlaceholder ? (
                    <p className="rounded-xl border border-dashed border-slate-600/60 bg-slate-950/40 py-8 text-center text-sm text-slate-500">
                      Amount breakdown is hidden for your role. Open the Revenue tab for allowed details.
                    </p>
                  ) : totalKes <= 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-600/60 bg-slate-950/40 py-8 text-center text-sm text-slate-500">
                      No completed revenue yet — shares will appear after successful checkouts.
                    </p>
                  ) : (
                    <>
                      <div
                        className="flex h-5 w-full overflow-hidden rounded-full border border-slate-700/60 bg-slate-950/80"
                        role="img"
                        aria-label="Revenue share by source"
                      >
                        {slices.map((s) => (
                          <div
                            key={s.key}
                            className="min-w-[3px] transition-[flex-grow] duration-300"
                            style={{
                              flexGrow: s.kes,
                              backgroundColor: s.fill,
                            }}
                            title={`${s.label}: ${formatAmountForRole(s.kes)}`}
                          />
                        ))}
                      </div>
                      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {[
                          { key: 'sub', label: 'Subscriptions', kes: sub, dot: 'bg-violet-400' },
                          { key: 'shout', label: 'Shoutouts', kes: shout, dot: 'bg-cyan-400' },
                          { key: 'coach', label: 'Coaching', kes: coach, dot: 'bg-amber-400' },
                          { key: 'tiers', label: 'Reward tiers', kes: tiers, dot: 'bg-fuchsia-400' },
                          { key: 'other', label: 'Other', kes: other, dot: 'bg-slate-400' },
                        ]
                          .filter((row) => row.kes > 0)
                          .map((row) => (
                          <li
                            key={row.key}
                            className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-950/30 px-3 py-2.5 text-sm"
                          >
                            <span className="flex min-w-0 items-center gap-2 text-slate-300">
                              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${row.dot}`} aria-hidden />
                              <span className="truncate">{row.label}</span>
                            </span>
                            <span className="shrink-0 text-right tabular-nums">
                              <span className="font-semibold text-white">
                                {formatAmountForRole(row.kes)}
                              </span>
                              <span className="ml-2 text-xs text-slate-500">
                                {((row.kes / denom) * 100).toFixed(1)}%
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-3 text-xs text-slate-500 text-right tabular-nums">
                        Total completed: {formatAmountForRole(totalKes)}
                      </p>
                    </>
                  )}
                </div>
              )
            })()}

            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {isCreatorWorkspace ? 'Audience & billing' : 'Key metrics'}
              </h3>
              <div
                className={`grid gap-3 sm:gap-4 md:grid-cols-2 ${
                  !isCreatorWorkspace && stats.streamers ? 'lg:grid-cols-5' : 'lg:grid-cols-4'
                }`}
              >
                {!isCreatorWorkspace && stats.streamers ? (
                  <button
                    type="button"
                    onClick={() => navigatePlatformTab('creators')}
                    className="group text-left rounded-2xl bg-gradient-to-br from-cyan-500/12 to-cyan-600/5 p-5 sm:p-6 border border-cyan-500/25 hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-500/5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 w-full"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="rounded-xl bg-cyan-500/20 p-2.5">
                        <UserSquare2 className="w-6 h-6 text-cyan-400" aria-hidden />
                      </div>
                      <ArrowRight className="h-4 w-4 text-cyan-500/60 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                    </div>
                    <h3 className="text-slate-400 text-sm mb-1">Streamers</h3>
                    <p className="text-3xl font-bold text-white tabular-nums">{stats.streamers.total}</p>
                    <p className="text-sm text-emerald-400/90 mt-1">{stats.streamers.active} active</p>
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setActiveTab('users')}
                  className="text-left rounded-2xl bg-gradient-to-br from-purple-500/12 to-purple-600/5 p-5 sm:p-6 border border-purple-500/25 hover:border-purple-400/45 hover:shadow-lg hover:shadow-purple-500/5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 w-full"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="rounded-xl bg-purple-500/20 p-2.5">
                      <Users className="w-6 h-6 text-purple-400" aria-hidden />
                    </div>
                  </div>
                  <h3 className="text-slate-400 text-sm mb-1">Supporters</h3>
                  <p className="text-3xl font-bold text-white tabular-nums">{stats.users.total}</p>
                  <p className="text-sm text-emerald-400/90 mt-1">{stats.users.active} active</p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('subscriptions')}
                  className="text-left rounded-2xl bg-gradient-to-br from-blue-500/12 to-blue-600/5 p-5 sm:p-6 border border-blue-500/25 hover:border-blue-400/45 hover:shadow-lg hover:shadow-blue-500/5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 w-full"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="rounded-xl bg-blue-500/20 p-2.5">
                      <Calendar className="w-6 h-6 text-blue-400" aria-hidden />
                    </div>
                  </div>
                  <h3 className="text-slate-400 text-sm mb-1">Active subscriptions</h3>
                  <p className="text-3xl font-bold text-white tabular-nums">{stats.subscriptions.active}</p>
                  <p className="text-sm text-slate-400 mt-1">
                    {stats.subscriptions.total} total · {stats.subscriptions.expired} expired
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('payments')}
                  className="text-left rounded-2xl bg-gradient-to-br from-emerald-500/12 to-emerald-600/5 p-5 sm:p-6 border border-emerald-500/25 hover:border-emerald-400/45 hover:shadow-lg hover:shadow-emerald-500/5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 w-full"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="rounded-xl bg-emerald-500/20 p-2.5">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" aria-hidden />
                    </div>
                  </div>
                  <h3 className="text-slate-400 text-sm mb-1">Completed payments</h3>
                  <p className="text-3xl font-bold text-white tabular-nums">{stats.payments.completed}</p>
                  <p className="text-sm text-yellow-400/90 mt-1">
                    {stats.payments.pending} pending
                    {stats.payments.failed > 0 ? (
                      <span className="text-red-400/90"> · {stats.payments.failed} failed</span>
                    ) : null}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('revenue')}
                  className="text-left rounded-2xl bg-gradient-to-br from-amber-500/12 to-amber-600/5 p-5 sm:p-6 border border-amber-500/25 hover:border-amber-400/45 hover:shadow-lg hover:shadow-amber-500/5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 w-full"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="rounded-xl bg-amber-500/20 p-2.5">
                      <DollarSign className="w-6 h-6 text-amber-400" aria-hidden />
                    </div>
                  </div>
                  <h3 className="text-slate-400 text-sm mb-1">Gross revenue</h3>
                  <p className="text-2xl sm:text-3xl font-bold text-white tabular-nums leading-tight">
                    {formatAmountForRole(stats.payments.totalAmount)}
                  </p>
                  <div className="text-xs sm:text-sm space-y-0.5 mt-2 text-slate-400">
                    <p>
                      Subs{' '}
                      <span className="font-semibold text-purple-200/90">
                        {formatAmountForRole(stats.payments.subscriptionAmount ?? 0)}
                      </span>
                    </p>
                    <p>
                      Shoutouts{' '}
                      <span className="font-semibold text-cyan-200/90">
                        {formatAmountForRole(stats.payments.shoutoutAmount ?? 0)}
                      </span>
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">{stats.payments.total} transactions</p>
                </button>
              </div>
            </div>

            {isCreatorWorkspace && walletSummary && (
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Earnings & payouts
                </h3>
                <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                  <div className="rounded-2xl bg-gradient-to-br from-emerald-500/12 to-emerald-600/5 p-5 border border-emerald-500/25">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="rounded-lg bg-emerald-500/20 p-2">
                        <Wallet className="w-5 h-5 text-emerald-400" aria-hidden />
                      </div>
                      <h3 className="text-slate-300 text-sm font-semibold">Gross earnings</h3>
                    </div>
                    <p className="text-2xl font-bold text-white tabular-nums">
                      {formatAmountForRole(walletSummary.totals.grossKes)}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      {walletSummary.completedPayments} completed payments
                    </p>
                  </div>
                  <div className="rounded-2xl bg-gradient-to-br from-amber-500/12 to-amber-600/5 p-5 border border-amber-500/25">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="rounded-lg bg-amber-500/20 p-2">
                        <ArrowDown className="w-5 h-5 text-amber-400" aria-hidden />
                      </div>
                      <h3 className="text-slate-300 text-sm font-semibold">Platform fee</h3>
                    </div>
                    <p className="text-2xl font-bold text-white tabular-nums">
                      {formatAmountForRole(walletSummary.totals.feeKes)}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      {walletSummary.platformFeePercent}% on each completed payment, summed
                    </p>
                  </div>
                  <div className="rounded-2xl bg-gradient-to-br from-cyan-500/12 to-cyan-600/5 p-5 border border-cyan-500/25">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="rounded-lg bg-cyan-500/20 p-2">
                        <ArrowUp className="w-5 h-5 text-cyan-400" aria-hidden />
                      </div>
                      <h3 className="text-slate-300 text-sm font-semibold">Estimated net</h3>
                    </div>
                    <p className="text-2xl font-bold text-white tabular-nums">
                      {formatAmountForRole(walletSummary.totals.netKes)}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">Gross minus per-payment fees</p>
                  </div>
                  <div className="rounded-2xl bg-gradient-to-br from-violet-500/12 to-violet-600/5 p-5 border border-violet-500/25 flex flex-col">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="rounded-lg bg-violet-500/20 p-2">
                        <CreditCard className="w-5 h-5 text-violet-300" aria-hidden />
                      </div>
                      <h3 className="text-slate-300 text-sm font-semibold">Payout requests</h3>
                    </div>
                    <p className="text-2xl font-bold text-white tabular-nums">{payoutRequests.length}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Pending:{' '}
                      {payoutRequests.filter((r) => String(r.status) === 'PENDING').length}
                    </p>
                    <button
                      type="button"
                      onClick={handleRequestPayout}
                      disabled={
                        payoutRequesting ||
                        payoutRequests.some((r) => String(r.status) === 'PENDING')
                      }
                      className="mt-auto pt-4 inline-flex items-center justify-center rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-3 py-2.5 text-xs font-semibold w-full"
                    >
                      {payoutRequesting ? 'Submitting…' : 'Request payout'}
                    </button>
                  </div>
                </div>

                {walletSummary.recentFeeLines != null ? (
                  <div className="mt-5">
                    <PlatformFeeBreakdownTable
                      lines={walletSummary.recentFeeLines}
                      platformFeePercent={walletSummary.platformFeePercent}
                      totalCompletedPayments={walletSummary.completedPayments}
                      linesLimit={walletSummary.recentFeeLinesLimit ?? 40}
                      formatAmount={formatAmountForRole}
                      formatDate={(d) => (d ? formatDate(d) : '—')}
                      summaryLabel="How platform fee is calculated (per payment)"
                    />
                  </div>
                ) : null}
              </div>
            )}

            {isCreatorWorkspace && payoutRequests.length > 0 && (
              <div className="rounded-2xl border border-slate-700/70 bg-slate-900/40 p-5 sm:p-6">
                <h3 className="text-slate-100 font-semibold mb-4">Recent payout requests</h3>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px]">
                    <thead className="text-xs uppercase text-gray-400">
                      <tr>
                        <th className="text-left py-2 pr-4">Date</th>
                        <th className="text-left py-2 pr-4">Amount</th>
                        <th className="text-left py-2 pr-4">Status</th>
                        <th className="text-left py-2 pr-4">Channel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payoutRequests.slice(0, 5).map((r) => (
                        <tr key={r.id} className="border-t border-gray-700/40">
                          <td className="py-2 pr-4 text-sm text-gray-300">
                            {formatDate(r.createdAt)}
                          </td>
                          <td className="py-2 pr-4 text-sm font-semibold text-white">
                            {formatAmountForRole(Number(r.amountKes || 0))}
                          </td>
                          <td className="py-2 pr-4 text-sm">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                r.status === 'PAID'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : r.status === 'APPROVED'
                                    ? 'bg-cyan-500/20 text-cyan-300'
                                    : r.status === 'REJECTED'
                                      ? 'bg-red-500/20 text-red-300'
                                      : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-sm text-gray-400">
                            {r.payoutChannel || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Trends
              </h3>
              <DashboardCharts
                series={stats.trends?.series ?? []}
                payments={stats.payments}
                formatKes={formatAmountForRole}
                hideNumericAmounts={adminUser?.role === 'MODERATOR'}
              />
            </div>
          </div>
        )}

        {activeTab === 'payouts' && (
          <div className="space-y-6">
            {!isCreatorWorkspace && stats?.payoutProcessingSchedule ? (
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/25 px-4 py-4 text-sm text-cyan-50/95">
                <p className="font-semibold text-cyan-100">
                  Weekly payout run — every {stats.payoutProcessingSchedule.weekday} (super admin)
                </p>
                <p className="mt-2 text-cyan-100/80 leading-relaxed">
                  {stats.payoutProcessingSchedule.summary}
                </p>
                <p className="mt-2 text-xs text-cyan-200/65">
                  Next scheduled reminder email (server time):{' '}
                  {new Date(stats.payoutProcessingSchedule.nextReminderAt).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              </div>
            ) : null}
            {!isCreatorWorkspace && (
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search payout requests..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            )}

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
              <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                <table className="w-full min-w-[860px]">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Date</th>
                      {!isCreatorWorkspace && (
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Creator</th>
                      )}
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Channel</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Reference</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Reviewed</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Notes</th>
                      {!isCreatorWorkspace && (
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {payoutRequests.length === 0 ? (
                      <tr>
                        <td
                          colSpan={isCreatorWorkspace ? 8 : 9}
                          className="px-4 py-8 text-sm text-gray-400 text-center"
                        >
                          No payout requests found.
                        </td>
                      </tr>
                    ) : (
                      payoutRequests.map((r: any) => (
                        <tr key={r.id} className="border-t border-gray-700/40">
                          <td className="px-4 py-3 text-sm text-gray-300">{formatDate(r.createdAt)}</td>
                          {!isCreatorWorkspace && (
                            <td className="px-4 py-3 text-sm text-gray-200">
                              {r.creator?.displayName || r.creator?.slug || '—'}
                            </td>
                          )}
                          <td className="px-4 py-3 text-sm font-semibold text-white">
                            {formatAmountForRole(Number(r.amountKes || 0))}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                r.status === 'PAID'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : r.status === 'APPROVED'
                                    ? 'bg-cyan-500/20 text-cyan-300'
                                    : r.status === 'REJECTED'
                                      ? 'bg-red-500/20 text-red-300'
                                      : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300">{r.payoutChannel || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-300">{r.payoutReference || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-400">
                            {r.reviewedAt
                              ? `${r.reviewedBy || 'admin'} · ${formatDate(r.reviewedAt)}`
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400 max-w-[280px] truncate">
                            {r.notes || '—'}
                          </td>
                          {!isCreatorWorkspace && (
                            <td className="px-4 py-3 text-right">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={reviewingPayoutId === r.id || r.status !== 'PENDING'}
                                  onClick={() => handleReviewPayoutRequest(r.id, 'APPROVED')}
                                  className="px-2.5 py-1.5 text-xs rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  disabled={reviewingPayoutId === r.id || r.status !== 'PENDING'}
                                  onClick={() => handleReviewPayoutRequest(r.id, 'REJECTED')}
                                  className="px-2.5 py-1.5 text-xs rounded bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white"
                                >
                                  Reject
                                </button>
                                <button
                                  type="button"
                                  disabled={reviewingPayoutId === r.id || r.status !== 'APPROVED'}
                                  onClick={() => handleReviewPayoutRequest(r.id, 'PAID')}
                                  className="px-2.5 py-1.5 text-xs rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white"
                                >
                                  Mark paid
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {!isCreatorWorkspace && payoutsPagination.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">
                  Page {payoutsPagination.page} of {payoutsPagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setPayoutsPagination((p: any) => ({ ...p, page: Math.max(1, p.page - 1) }))
                    }
                    disabled={payoutsPagination.page === 1}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg text-sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() =>
                      setPayoutsPagination((p: any) => ({
                        ...p,
                        page: Math.min(p.totalPages, p.page + 1),
                      }))
                    }
                    disabled={payoutsPagination.page >= payoutsPagination.totalPages}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg text-sm"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Streamer / creator accounts (platform admin) */}
        {!isCreatorWorkspace && activeTab === 'creators' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by email, slug, or display name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  exportToCSV(
                    creators.map((c: any) => ({
                      id: c.id,
                      email: c.email,
                      slug: c.slug,
                      displayName: c.displayName,
                      isActive: c.isActive,
                      supportEnabled: c.supportEnabled,
                      onboardingComplete: c.onboardingComplete,
                      primaryCategory: c.primaryCategory ?? '',
                      lastLogin: c.lastLogin ?? '',
                      users: c._count?.users ?? 0,
                      payments: c._count?.payments ?? 0,
                      subscriptions: c._count?.subscriptions ?? 0,
                      creatorRewards: c._count?.creatorRewards ?? 0,
                      createdAt: c.createdAt,
                    })),
                    'streamers',
                  )
                }
                className="flex items-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
              <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Streamer
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Last login
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Supporters / billing
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {creators.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                          No streamer accounts found
                        </td>
                      </tr>
                    ) : (
                      creators.map((c: any) => (
                        <tr key={c.id} className="hover:bg-gray-700/30 transition">
                          <td className="px-3 sm:px-6 py-4">
                            <div className="font-medium text-white">{c.displayName}</div>
                            <div className="text-sm text-cyan-300/90">/{c.slug}</div>
                          </td>
                          <td className="px-3 sm:px-6 py-4 text-gray-300 text-sm break-all max-w-[200px]">
                            {c.email}
                          </td>
                          <td className="px-3 sm:px-6 py-4">
                            <div className="flex flex-wrap gap-1.5">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                                  c.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/15 text-red-300'
                                }`}
                              >
                                {c.isActive ? 'Active' : 'Inactive'}
                              </span>
                              <span
                                className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                                  c.supportEnabled
                                    ? 'bg-blue-500/20 text-blue-200'
                                    : 'bg-slate-600/40 text-slate-400'
                                }`}
                              >
                                Support {c.supportEnabled ? 'on' : 'off'}
                              </span>
                              <span
                                className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                                  c.onboardingComplete
                                    ? 'bg-violet-500/20 text-violet-200'
                                    : 'bg-amber-500/15 text-amber-200'
                                }`}
                              >
                                {c.onboardingComplete ? 'Onboarded' : 'Onboarding'}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-4 text-gray-400 text-sm whitespace-nowrap">
                            {c.lastLogin ? formatDate(c.lastLogin) : '—'}
                          </td>
                          <td className="px-3 sm:px-6 py-4 text-gray-300 text-sm">
                            <span className="whitespace-nowrap">
                              {c._count?.users ?? 0} users · {c._count?.payments ?? 0} pay
                            </span>
                            <br />
                            <span className="whitespace-nowrap text-gray-500 text-xs">
                              {c._count?.subscriptions ?? 0} subs · {c._count?.creatorRewards ?? 0} tiers
                            </span>
                          </td>
                          <td className="px-3 sm:px-6 py-4">
                            <div className="flex flex-wrap items-center gap-2">
                              {superAdminUser ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => void openCreatorSuperProfile(c.id)}
                                    className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-2 py-1.5 text-xs font-medium text-amber-100 hover:bg-amber-500/20"
                                  >
                                    View more
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void emailCreatorFromAdmin({
                                        id: c.id,
                                        email: c.email,
                                        displayName: c.displayName,
                                      })
                                    }
                                    className="rounded-lg border border-sky-500/35 bg-sky-500/10 px-2 py-1.5 text-xs font-medium text-sky-100 hover:bg-sky-500/20"
                                  >
                                    Email
                                  </button>
                                </>
                              ) : null}
                              <Link
                                href={`/${c.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-2 py-1.5 text-xs text-cyan-200 hover:bg-slate-700/60"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Page
                              </Link>
                              {isAdminOrSuper() ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={updatingCreatorId === c.id}
                                    onClick={() =>
                                      void patchCreatorAdmin(c.id, { isActive: !c.isActive })
                                    }
                                    className="rounded-lg bg-slate-700 px-2 py-1.5 text-xs text-white hover:bg-slate-600 disabled:opacity-50"
                                    title="Toggle account active"
                                  >
                                    {c.isActive ? 'Deactivate' : 'Activate'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={updatingCreatorId === c.id}
                                    onClick={() =>
                                      void patchCreatorAdmin(c.id, {
                                        supportEnabled: !c.supportEnabled,
                                      })
                                    }
                                    className="rounded-lg bg-slate-700 px-2 py-1.5 text-xs text-white hover:bg-slate-600 disabled:opacity-50"
                                    title="Toggle support page"
                                  >
                                    Support
                                  </button>
                                  <button
                                    type="button"
                                    disabled={updatingCreatorId === c.id}
                                    onClick={() =>
                                      void patchCreatorAdmin(c.id, {
                                        onboardingComplete: !c.onboardingComplete,
                                      })
                                    }
                                    className="rounded-lg bg-slate-700 px-2 py-1.5 text-xs text-white hover:bg-slate-600 disabled:opacity-50"
                                    title="Toggle onboarding complete"
                                  >
                                    Onboarding
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {creatorsPagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-700/50 flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    Showing {(creatorsPagination.page - 1) * creatorsPagination.limit + 1} to{' '}
                    {Math.min(
                      creatorsPagination.page * creatorsPagination.limit,
                      creatorsPagination.total,
                    )}{' '}
                    of {creatorsPagination.total} streamers
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCreatorsPagination({
                          ...creatorsPagination,
                          page: Math.max(1, creatorsPagination.page - 1),
                        })
                      }
                      disabled={creatorsPagination.page === 1}
                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-4 py-2 bg-gray-700 text-white rounded-lg">
                      {creatorsPagination.page} / {creatorsPagination.totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCreatorsPagination({
                          ...creatorsPagination,
                          page: Math.min(
                            creatorsPagination.totalPages,
                            creatorsPagination.page + 1,
                          ),
                        })
                      }
                      disabled={creatorsPagination.page >= creatorsPagination.totalPages}
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
                            {isCreatorWorkspace ? (
                              user.addedToWhatsApp ? (
                                <span className="inline-flex items-center gap-1.5 text-emerald-400 text-sm">
                                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                                  Added
                                </span>
                              ) : (
                                <span className="text-sm text-gray-500">Not added</span>
                              )
                            ) : user.addedToWhatsApp ? (
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
              <button
                type="button"
                onClick={() => {
                  setPaymentsPurpose('COACHING_BOOKING')
                  setPaymentsPagination((p) => ({ ...p, page: 1 }))
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  paymentsPurpose === 'COACHING_BOOKING'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                Coaching
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
                      : paymentsPurpose === 'COACHING_BOOKING'
                        ? 'Search user, transaction, reference...'
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
              <label className="flex items-center gap-2 px-1 py-2 text-sm text-gray-300 whitespace-nowrap cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-500 bg-gray-800 text-purple-500 focus:ring-purple-500"
                  checked={paymentsObsAlertSentOnly}
                  onChange={(e) => {
                    setPaymentsObsAlertSentOnly(e.target.checked)
                    setPaymentsPagination((p) => ({ ...p, page: 1 }))
                  }}
                />
                OBS alert sent only
              </label>
              <button
                onClick={() =>
                  exportToCSV(
                    payments,
                    paymentsPurpose === 'SUBSCRIPTION'
                      ? 'payments-subscriptions'
                      : paymentsPurpose === 'STREAM_ALERT'
                        ? 'payments-shoutouts'
                        : 'payments-coaching',
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
                      ) : paymentsPurpose === 'STREAM_ALERT' ? (
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Shoutout</th>
                      ) : (
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Coaching</th>
                      )}
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Transaction ID</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">OBS sent</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                          No payments found
                        </td>
                      </tr>
                    ) : (
                      payments.map((payment) => {
                        const sh = payment.streamShoutout
                        const shoutPlat = sh?.platform ?? payment.streamAlertPlatform
                        const shoutHandle = sh?.displayHandle ?? payment.streamAlertHandle
                        const shoutMsg = sh?.message ?? payment.streamAlertMessage
                        const cb =
                          payment.coachingBookings && payment.coachingBookings.length > 0
                            ? payment.coachingBookings[0]
                            : null
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
                          ) : paymentsPurpose === 'STREAM_ALERT' ? (
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
                          ) : (
                            <td className="px-6 py-4 text-gray-300 text-sm max-w-[220px]">
                              <div className="text-emerald-200/90 font-medium">
                                {cb ? COACHING_SERVICE_LABELS[cb.service] || cb.service : '—'}
                              </div>
                              <div className="text-white mt-0.5">{cb?.name || '—'}</div>
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
                          <td className="px-6 py-4 text-gray-400 text-sm whitespace-nowrap">
                            {payment.subscriberAlertEmittedAt
                              ? formatDate(payment.subscriberAlertEmittedAt)
                              : '—'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap items-center gap-1">
                              {payment.status?.toLowerCase() === 'completed' && (
                                <button
                                  type="button"
                                  disabled={replayingPaymentId === payment.id}
                                  onClick={() => void replayPaymentObsAlert(payment.id)}
                                  title="Replay this payment’s OBS alert (subscription, shoutout, tier, or coaching)"
                                  className="inline-flex items-center gap-1 rounded-lg border border-purple-500/40 bg-purple-500/10 px-2 py-1.5 text-xs font-semibold text-purple-200 hover:bg-purple-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  {replayingPaymentId === payment.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden />
                                  ) : (
                                    <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                  )}
                                  Replay
                                </button>
                              )}
                              {payment.status?.toLowerCase() === 'pending' && isAdminOrSuper() && (
                                <button
                                  onClick={() => handleEditPayment(payment)}
                                  className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition"
                                  title="Edit payment"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              )}
                            </div>
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

        {activeTab === 'tierPurchases' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-100/90">
              <p>
                Completed and pending checkouts for <strong className="text-amber-200">reward tiers</strong> (support
                page). Select a row for supporter message, optional clip, OBS copy snapshots, and payment reference
                fields.
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by display name, tier name, transaction, reference, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/60"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500/60"
              >
                <option value="all">All status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
              <label className="flex items-center gap-2 px-1 py-2 text-sm text-gray-300 whitespace-nowrap cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-500 bg-gray-800 text-amber-500 focus:ring-amber-500"
                  checked={tierPurchasesObsOnly}
                  onChange={(e) => {
                    setTierPurchasesObsOnly(e.target.checked)
                    setTierPurchasesPagination((p) => ({ ...p, page: 1 }))
                  }}
                />
                OBS alert sent only
              </label>
              <button
                type="button"
                onClick={() =>
                  exportToCSV(
                    tierPurchases.map((p) => {
                      const cr = p.creatorRewardPurchase
                      return {
                        paymentId: p.id,
                        tierName: cr?.rewardNameSnapshot ?? '',
                        displayName: cr?.displayName ?? '',
                        platform: cr?.platform ?? '',
                        supporterMessage: cr?.supporterMessage ?? '',
                        videoUrl: cr?.videoUrl ?? '',
                        amountKes: p.amount,
                        status: p.status,
                        transactionId: p.transactionId ?? p.reference ?? '',
                        payerName: p.user?.name ?? '',
                        payerPhone: p.user?.mpesaMobile ?? '',
                        createdAt: p.createdAt,
                        obsAlertSentAt: p.subscriberAlertEmittedAt ?? '',
                      }
                    }),
                    'tier-purchases',
                  )
                }
                className="flex items-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
              <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                <table className="w-full min-w-[720px]">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Tier
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Supporter on stream
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Account
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-3 w-12" aria-hidden />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {tierPurchases.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                          No tier purchases found
                        </td>
                      </tr>
                    ) : (
                      tierPurchases.map((payment) => {
                        const cr = payment.creatorRewardPurchase
                        return (
                          <tr
                            key={payment.id}
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                void openTierPurchaseDetail(payment.id)
                              }
                            }}
                            onClick={() => void openTierPurchaseDetail(payment.id)}
                            className="cursor-pointer hover:bg-amber-500/5 transition outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-inset"
                          >
                            <td className="px-3 sm:px-6 py-4 text-sm">
                              <div className="text-amber-200/95 font-semibold">{cr?.rewardNameSnapshot ?? '—'}</div>
                              <div className="text-gray-500 text-xs mt-0.5">{shoutoutPlatformLabel(cr?.platform)}</div>
                            </td>
                            <td className="px-3 sm:px-6 py-4 text-sm max-w-[200px]">
                              <div className="text-white font-medium truncate" title={cr?.displayName ?? ''}>
                                {cr?.displayName ?? '—'}
                              </div>
                              {cr?.supporterMessage ? (
                                <div className="text-gray-400 mt-1 line-clamp-2 text-xs" title={cr.supporterMessage}>
                                  {cr.supporterMessage}
                                </div>
                              ) : (
                                <div className="text-gray-500 mt-1 text-xs italic">No message</div>
                              )}
                            </td>
                            <td className="px-3 sm:px-6 py-4 text-sm">
                              <div className="text-white">{payment.user?.name ?? '—'}</div>
                              <div className="text-gray-500 text-xs font-mono mt-0.5">
                                {payment.user?.mpesaMobile ?? '—'}
                              </div>
                            </td>
                            <td className="px-3 sm:px-6 py-4 text-gray-200 font-semibold whitespace-nowrap">
                              {formatAmountForRole(Number(payment.amount ?? 0))}
                            </td>
                            <td className="px-3 sm:px-6 py-4">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(payment.status || '')}`}
                              >
                                {payment.status}
                              </span>
                            </td>
                            <td className="px-3 sm:px-6 py-4 text-gray-400 text-sm whitespace-nowrap">
                              {payment.createdAt ? formatDate(payment.createdAt) : '—'}
                            </td>
                            <td className="px-3 py-4 text-gray-500">
                              <ChevronRight className="w-5 h-5" aria-hidden />
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {tierPurchasesPagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-700/50 flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    Showing{' '}
                    {(tierPurchasesPagination.page - 1) * tierPurchasesPagination.limit + 1} to{' '}
                    {Math.min(
                      tierPurchasesPagination.page * tierPurchasesPagination.limit,
                      tierPurchasesPagination.total,
                    )}{' '}
                    of {tierPurchasesPagination.total} purchases
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setTierPurchasesPagination({
                          ...tierPurchasesPagination,
                          page: tierPurchasesPagination.page - 1,
                        })
                      }
                      disabled={tierPurchasesPagination.page === 1}
                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-4 py-2 bg-gray-700 text-white rounded-lg">
                      {tierPurchasesPagination.page} / {tierPurchasesPagination.totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setTierPurchasesPagination({
                          ...tierPurchasesPagination,
                          page: tierPurchasesPagination.page + 1,
                        })
                      }
                      disabled={tierPurchasesPagination.page >= tierPurchasesPagination.totalPages}
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

        {activeTab === 'rankings' && (
          <div className="space-y-6">
            {!isCreatorWorkspace ? (
              <p className="text-gray-400 text-sm">
                Supporter rankings are available in the creator workspace (sign in as a streamer).
              </p>
            ) : creatorRankingsLoading ? (
              <div className="flex items-center justify-center gap-3 py-16 text-gray-400">
                <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                Loading rankings…
              </div>
            ) : creatorRankings ? (
              <>
                <div className="rounded-xl border border-violet-500/25 bg-violet-950/20 px-4 py-3 text-sm text-violet-100/90">
                  <p>
                    <strong>Contributors</strong> are ranked by total <strong>completed</strong> spend (subscriptions,
                    shoutouts, tiers, coaching). <strong>Subscribers</strong> are ranked by completed{' '}
                    <strong>membership</strong> payments only (months column summed from those checkouts).
                  </p>
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
                    <div className="border-b border-gray-700/60 px-4 py-3 flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-amber-400" aria-hidden />
                      <h3 className="text-base font-semibold text-white">Top contributors</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[320px] text-sm">
                        <thead className="bg-gray-700/50 text-left text-xs uppercase tracking-wider text-gray-400">
                          <tr>
                            <th className="px-3 py-2">#</th>
                            <th className="px-3 py-2">Supporter</th>
                            <th className="px-3 py-2 text-right">Total</th>
                            <th className="px-3 py-2 text-right">Payments</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/50 text-gray-200">
                          {creatorRankings.contributors.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                                No completed payments yet.
                              </td>
                            </tr>
                          ) : (
                            creatorRankings.contributors.map((r) => (
                              <tr key={r.userId}>
                                <td className="px-3 py-2.5 font-mono text-gray-400">{r.rank}</td>
                                <td className="px-3 py-2.5">
                                  <div className="font-medium text-white">{r.displayName}</div>
                                  {r.tiktokUsername ? (
                                    <div className="text-xs text-gray-500">@{r.tiktokUsername}</div>
                                  ) : null}
                                  {!r.isActive ? (
                                    <span className="text-xs text-red-400">inactive</span>
                                  ) : null}
                                </td>
                                <td className="px-3 py-2.5 text-right font-semibold text-emerald-200/95 whitespace-nowrap">
                                  {formatAmountForRole(r.totalKes)}
                                </td>
                                <td className="px-3 py-2.5 text-right text-gray-400">{r.completedPaymentCount}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
                    <div className="border-b border-gray-700/60 px-4 py-3 flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-cyan-400" aria-hidden />
                      <h3 className="text-base font-semibold text-white">Top subscribers</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[360px] text-sm">
                        <thead className="bg-gray-700/50 text-left text-xs uppercase tracking-wider text-gray-400">
                          <tr>
                            <th className="px-3 py-2">#</th>
                            <th className="px-3 py-2">Supporter</th>
                            <th className="px-3 py-2 text-right">Membership KES</th>
                            <th className="px-3 py-2 text-right">Months</th>
                            <th className="px-3 py-2 text-right">Checkouts</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/50 text-gray-200">
                          {creatorRankings.subscribers.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                                No membership payments yet.
                              </td>
                            </tr>
                          ) : (
                            creatorRankings.subscribers.map((r) => (
                              <tr key={r.userId}>
                                <td className="px-3 py-2.5 font-mono text-gray-400">{r.rank}</td>
                                <td className="px-3 py-2.5">
                                  <div className="font-medium text-white">{r.displayName}</div>
                                  {r.tiktokUsername ? (
                                    <div className="text-xs text-gray-500">@{r.tiktokUsername}</div>
                                  ) : null}
                                  {!r.isActive ? (
                                    <span className="text-xs text-red-400">inactive</span>
                                  ) : null}
                                </td>
                                <td className="px-3 py-2.5 text-right font-semibold text-cyan-200/95 whitespace-nowrap">
                                  {formatAmountForRole(r.totalKes)}
                                </td>
                                <td className="px-3 py-2.5 text-right text-gray-300">{r.totalMonthsSubscribed}</td>
                                <td className="px-3 py-2.5 text-right text-gray-400">
                                  {r.completedSubscriptionPayments}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Showing top {creatorRankings.limit} per list. Refresh to update.
                </p>
              </>
            ) : (
              <p className="text-gray-400 text-sm">Could not load rankings.</p>
            )}
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
              {showShoutoutBulkDelete ? (
                <button
                  type="button"
                  disabled={selectedShoutoutIds.size === 0}
                  onClick={() => void handleDeleteSelectedShoutouts()}
                  className="flex items-center gap-2 px-4 py-3 bg-red-600/90 hover:bg-red-600 text-white rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete selected ({selectedShoutoutIds.size})
                </button>
              ) : null}
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
              <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                <table className="w-full min-w-[1080px]">
                  <thead className="bg-gray-700/50">
                    <tr>
                      {showShoutoutBulkDelete ? (
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
                      ) : null}
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
                          colSpan={showShoutoutBulkDelete ? 10 : 9}
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
                            {showShoutoutBulkDelete ? (
                              <td className="w-12 px-3 py-3 sm:py-4 align-middle">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-gray-500 bg-gray-800 text-cyan-600 focus:ring-cyan-500"
                                  checked={selectedShoutoutIds.has(row.id)}
                                  onChange={() => toggleShoutoutSelected(row.id)}
                                  aria-label={`Select shoutout @${row.displayHandle}`}
                                />
                              </td>
                            ) : null}
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
                        Game account
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
                        <td colSpan={9} className="px-6 py-12 text-center text-gray-400">
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
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-gray-300 text-sm max-w-[140px] break-all">
                              {row.accountUsername ? (
                                <span className="text-sky-200/90 font-medium">{row.accountUsername}</span>
                              ) : (
                                <span className="text-gray-500">—</span>
                              )}
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

        {activeTab === 'revenue' && (
          <div className="space-y-6">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Wallet className="w-7 h-7 text-amber-400" />
                    Revenue
                  </h2>
                  <p className="text-sm text-gray-400 mt-1 max-w-2xl">
                    Completed M-Pesa payments only.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {(
                  [
                    ['today', 'Today'],
                    ['yesterday', 'Yesterday'],
                    ['last7', 'Last 7 days'],
                    ['last30', 'Last 30 days'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    disabled={revenueLoading}
                    onClick={() => setRevenuePreset(id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 ${
                      revenuePreset === id
                        ? 'bg-amber-600 text-white ring-2 ring-amber-400/50'
                        : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={revenueLoading}
                  onClick={() => {
                    const ymd = new Intl.DateTimeFormat('en-CA', {
                      timeZone: 'Africa/Nairobi',
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                    }).format(new Date())
                    setRevenueFrom(ymd)
                    setRevenueTo(ymd)
                    setRevenuePreset('custom')
                    void fetchRevenue({ preset: 'custom', from: ymd, to: ymd })
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 ${
                    revenuePreset === 'custom'
                      ? 'bg-amber-600 text-white ring-2 ring-amber-400/50'
                      : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  }`}
                >
                  Custom range
                </button>
              </div>

              {revenuePreset === 'custom' && (
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">From</label>
                    <input
                      type="date"
                      value={revenueFrom}
                      onChange={(e) => setRevenueFrom(e.target.value)}
                      className="px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">To</label>
                    <input
                      type="date"
                      value={revenueTo}
                      onChange={(e) => setRevenueTo(e.target.value)}
                      className="px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={revenueLoading || !revenueFrom || !revenueTo}
                    onClick={() =>
                      void fetchRevenue({
                        preset: 'custom',
                        from: revenueFrom,
                        to: revenueTo,
                      })
                    }
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    Apply range
                  </button>
                </div>
              )}

              {revenueLoading && (
                <div className="mt-6 flex items-center gap-2 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading revenue…
                </div>
              )}

              {!revenueLoading && revenueData && (
                <>
                  <div className="mt-6 text-xs text-gray-500">
                    Range:{' '}
                    <span className="text-gray-300">
                      {revenueData.from} → {revenueData.to}
                    </span>{' '}
                    · {revenueData.totalCount} completed payment
                    {revenueData.totalCount === 1 ? '' : 's'}
                  </div>

                  <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-200/80">
                        Total
                      </p>
                      <p className="text-2xl font-bold text-white mt-1">
                        {formatAmountForRole(revenueData.totalKes)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">All sources</p>
                    </div>
                    <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-violet-200/80">
                        Platform fee
                      </p>
                      <p className="text-xl font-bold text-white mt-1">
                        {formatAmountForRole(revenueData.platformFeeKes)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {Number(revenueData.platformFeePercent ?? 5).toFixed(2)}% per payment in range, summed
                      </p>
                    </div>
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200/80">
                        Creator net
                      </p>
                      <p className="text-xl font-bold text-white mt-1">
                        {formatAmountForRole(revenueData.creatorNetKes)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">Total minus summed per-payment fees</p>
                    </div>
                    {revenueData.sources.map((s) => (
                      <div
                        key={s.key}
                        className="rounded-xl border border-gray-600/50 bg-gray-900/40 p-4"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          {s.label}
                        </p>
                        <p className="text-xl font-bold text-white mt-1">
                          {formatAmountForRole(s.kes)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{s.count} payment{s.count === 1 ? '' : 's'}</p>
                      </div>
                    ))}
                  </div>

                  {revenueData.paymentFeeLines != null ? (
                    <div className="mt-6">
                      <PlatformFeeBreakdownTable
                        variant="gray"
                        lines={revenueData.paymentFeeLines}
                        platformFeePercent={revenueData.platformFeePercent}
                        totalCompletedPayments={revenueData.totalCount}
                        linesLimit={revenueData.paymentFeeLinesLimit ?? 50}
                        formatAmount={formatAmountForRole}
                        formatDate={(d) => (d ? formatDate(d) : '—')}
                        summaryLabel="Per-payment fee breakdown (this date range)"
                      />
                    </div>
                  ) : null}

                  <div className="mt-8 overflow-x-auto rounded-xl border border-gray-700/50">
                    <table className="w-full min-w-[640px] text-sm">
                      <thead>
                        <tr className="bg-gray-700/40 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                          <th className="px-4 py-3">Date (Nairobi)</th>
                          <th className="px-4 py-3 text-right">Subscriptions</th>
                          <th className="px-4 py-3 text-right">Shoutouts</th>
                          <th className="px-4 py-3 text-right">Account review</th>
                          <th className="px-4 py-3 text-right">Other</th>
                          <th className="px-4 py-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/40">
                        {revenueData.daily.map((row) => (
                          <tr key={row.date} className="hover:bg-gray-700/20">
                            <td className="px-4 py-2.5 text-gray-200 whitespace-nowrap">{row.date}</td>
                            <td className="px-4 py-2.5 text-right text-gray-300">
                              {row.subscriptionKes > 0 ? formatAmountForRole(row.subscriptionKes) : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-right text-gray-300">
                              {row.shoutoutKes > 0 ? formatAmountForRole(row.shoutoutKes) : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-right text-gray-300">
                              {row.accountReviewKes > 0
                                ? formatAmountForRole(row.accountReviewKes)
                                : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-right text-gray-300">
                              {row.otherKes > 0 ? formatAmountForRole(row.otherKes) : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-right font-medium text-white">
                              {row.totalKes > 0 ? formatAmountForRole(row.totalKes) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {!revenueLoading && !revenueData && revenuePreset === 'custom' && (
                <p className="mt-6 text-sm text-gray-500">
                  Choose a start and end date, then click <strong className="text-gray-400">Apply range</strong>.
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'rewards' && (
          <AdminRewardsPanel
            rewards={creatorRewards}
            loading={creatorRewardsLoading}
            saveReward={saveCreatorReward}
            reorderRewards={reorderCreatorRewards}
            formatAmountForRole={formatAmountForRole}
            formatDate={formatDate}
            getStatusBadge={getStatusBadge}
            openTierPurchaseDetail={openTierPurchaseDetail}
            canManageRewardTiers={showRewardTiersTab}
            paymentsClient={isCreatorWorkspace ? creatorDashboardApi : api}
            paymentsPathPrefix={isCreatorWorkspace ? '/creator-portal' : '/admin'}
            panelScope={isCreatorWorkspace ? 'creator' : 'platform'}
          />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {!isCreatorWorkspace && !isAdminOrSuper() ? (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-8 text-center">
                <p className="text-amber-400">You don&apos;t have permission to access Settings. Admin or Super Admin role required.</p>
              </div>
            ) : (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
              <h2 className="text-2xl font-bold text-white mb-2">
                {isCreatorWorkspace ? 'Your support & OBS settings' : 'Platform settings'}
              </h2>
              {!isCreatorWorkspace ? (
                <p className="text-sm text-slate-400 mb-6 max-w-3xl">
                  Global defaults and fees for the entire site. Individual creators can override some values only for their
                  public page from their own workspace.
                </p>
              ) : (
                <p className="text-sm text-gray-500 mb-6 max-w-3xl">
                  Applies to your public support link and your OBS timings — not other creators.
                </p>
              )}
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Default Monthly Subscription Price (KES)
                  </label>
                  <p className="text-xs text-gray-400 mb-3">
                    {isCreatorWorkspace
                      ? 'Monthly membership price (KES) shown on your public support link and used for new subscribers tied to your page.'
                      : 'This is the default price per month used when users register for subscriptions. You can change this value and it will apply to all new registrations.'}
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

                {!isCreatorWorkspace ? (
                <div className="border-t border-gray-700 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-2">Platform billing</h3>
                  <p className="text-xs text-gray-400 mb-4 max-w-2xl">
                    Fee applies to <strong className="text-gray-300">each completed payment</strong> (amount × rate,
                    rounded to 2 decimals per transaction, then added up). Not one bulk charge on totals. Default{' '}
                    <strong className="text-gray-300">5%</strong>. Only{' '}
                    <strong className="text-gray-300">Super Admin</strong> can change this value.
                  </p>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="max-w-xs">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Platform fee <span className="text-gray-500 font-normal">%</span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={settingsForm.platformFeePercent ?? 5}
                        onChange={(e) => {
                          const v = Number(e.target.value)
                          if (!Number.isNaN(v) && v >= 0 && v <= 100) {
                            setSettingsForm({ ...settingsForm, platformFeePercent: v })
                          }
                        }}
                        disabled={adminUser?.role !== 'SUPER_ADMIN'}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div className="text-xs text-gray-500">
                      {adminUser?.role === 'SUPER_ADMIN'
                        ? 'You can edit this field.'
                        : 'Read-only for ADMIN/MODERATOR.'}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    Current platform fee:{' '}
                    <span className="text-purple-300/90 font-medium">
                      {Number(settings.platformFeePercent ?? 5).toFixed(2)}%
                    </span>
                  </p>
                </div>
                ) : null}

                <div className="border-t border-gray-700 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-2">Public support page (/support)</h3>
                  <p className="text-xs text-gray-400 mb-4 max-w-2xl">
                    {isCreatorWorkspace
                      ? 'Your support link: membership, shoutout, and your reward tiers share one ordered list. Optional titles and descriptions override platform defaults for your page only.'
                      : 'Public support page: membership, shoutout, and reward tiers share one ordered list. Reorder below. Optional titles and descriptions override API defaults.'}
                  </p>
                  <div className="grid gap-4 md:grid-cols-2 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Membership tier title <span className="text-gray-500 font-normal">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={settingsForm.supportTierMembershipTitle ?? ''}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, supportTierMembershipTitle: e.target.value })
                        }
                        placeholder="e.g. Member subscription"
                        maxLength={120}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Live shoutout title <span className="text-gray-500 font-normal">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={settingsForm.supportTierShoutoutTitle ?? ''}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, supportTierShoutoutTitle: e.target.value })
                        }
                        placeholder="e.g. Live shoutout"
                        maxLength={120}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Membership description <span className="text-gray-500 font-normal">(optional)</span>
                      </label>
                      <textarea
                        value={settingsForm.supportTierMembershipDescription ?? ''}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, supportTierMembershipDescription: e.target.value })
                        }
                        rows={2}
                        maxLength={2000}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Shoutout description <span className="text-gray-500 font-normal">(optional)</span>
                      </label>
                      <textarea
                        value={settingsForm.supportTierShoutoutDescription ?? ''}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, supportTierShoutoutDescription: e.target.value })
                        }
                        rows={2}
                        maxLength={2000}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-y"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Tier order</label>
                    <p className="text-xs text-gray-500 mb-2 max-w-xl">
                      <strong className="text-gray-400">Member subscription</strong> and{' '}
                      <strong className="text-gray-400">Live shoutout</strong> stay first on <code className="text-gray-400">/support</code>.
                      Reorder the list to set reward tier order. New rewards append until you save. Remove a row to
                      hide that reward publicly.
                    </p>
                    <ul className="rounded-lg border border-gray-600 divide-y divide-gray-700/60 max-w-xl bg-gray-900/40">
                      {(settingsForm.supportCatalogOrder ?? []).map((id: string, index: number, arr: string[]) => (
                        <li
                          key={`${id}-${index}`}
                          className="flex items-center gap-2 px-3 py-2.5 text-sm"
                        >
                          <span className="flex-1 text-gray-200 min-w-0">
                            {id === 'membership'
                              ? 'Member subscription'
                              : id === 'shoutout'
                                ? 'Live shoutout'
                                : creatorRewards.find((r: { id: string }) => r.id === id)?.name ??
                                  `Reward (${id.slice(0, 8)}…)`}
                            {id !== 'membership' &&
                            id !== 'shoutout' &&
                            creatorRewards.find((r: { id: string }) => r.id === id) &&
                            !creatorRewards.find((r: { id: string; active?: boolean }) => r.id === id)?.active ? (
                              <span className="text-gray-500 ml-1">(inactive)</span>
                            ) : null}
                          </span>
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => {
                              const next = [...(settingsForm.supportCatalogOrder ?? [])]
                              const t = next[index - 1]
                              next[index - 1] = next[index]
                              next[index] = t
                              setSettingsForm({ ...settingsForm, supportCatalogOrder: next })
                            }}
                            className="p-2 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="Move up"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={index >= arr.length - 1}
                            onClick={() => {
                              const next = [...(settingsForm.supportCatalogOrder ?? [])]
                              const t = next[index + 1]
                              next[index + 1] = next[index]
                              next[index] = t
                              setSettingsForm({ ...settingsForm, supportCatalogOrder: next })
                            }}
                            className="p-2 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="Move down"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
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
                  <h3 className="text-lg font-semibold text-white mb-2">Coaching — account review checkout</h3>
                  <p className="text-xs text-gray-400 mb-4 max-w-2xl">
                    M-Pesa amount for <strong className="text-gray-300">Account review</strong> and{' '}
                    <strong className="text-gray-300">Both</strong> on the public book page. Rank push only stays free.
                  </p>
                  <div className="max-w-xs">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Amount <span className="text-gray-500 font-normal">KES</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={settingsForm.coachingAccountReviewKes ?? 100}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10)
                        if (!Number.isNaN(v) && v >= 1) {
                          setSettingsForm({ ...settingsForm, coachingAccountReviewKes: v })
                        }
                      }}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    Current:{' '}
                    <span className="text-violet-300/90">
                      KES {settings.coachingAccountReviewKes ?? 100} per booking
                    </span>
                  </p>
                </div>

                <div className="border-t border-gray-700 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {isCreatorWorkspace ? 'What shows on your stream' : 'OBS on-screen & voice lines'}
                  </h3>
                  <p className="text-xs text-gray-400 mb-4 max-w-2xl">
                    {isCreatorWorkspace
                      ? 'When someone pays on your support page, this text appears on your OBS overlay and is read aloud. Leave a box empty to keep the default wording. Reload your OBS browser source after you save.'
                      : 'Optional lines for the OBS player. Creators can override these in their workspace. Leave empty for built-in defaults.'}
                  </p>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="rounded-xl border border-gray-600/60 bg-gray-900/35 p-4">
                      <label className="block text-sm font-medium text-white mb-1">
                        When someone subscribes
                      </label>
                      <p className="text-[11px] text-gray-500 mb-2">
                        New members and renewals both use this line (amount is added by the player when available).
                      </p>
                      <textarea
                        value={settingsForm.obsSubscriptionMessageTemplate ?? ''}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            obsSubscriptionMessageTemplate: e.target.value,
                          })
                        }
                        rows={3}
                        maxLength={500}
                        placeholder={`e.g. Thanks {{name}} for joining from {{platform}}!`}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 resize-y"
                      />
                      <div className="flex flex-wrap gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() =>
                            setSettingsForm({
                              ...settingsForm,
                              obsSubscriptionMessageTemplate:
                                'Thanks {{name}} for subscribing from {{platform}}!',
                            })
                          }
                          className="text-[11px] px-2.5 py-1 rounded-md bg-gray-700 text-gray-200 hover:bg-gray-600 border border-gray-600/80"
                        >
                          Use simple “thanks” example
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSettingsForm({
                              ...settingsForm,
                              obsSubscriptionMessageTemplate: '',
                            })
                          }
                          className="text-[11px] px-2.5 py-1 rounded-md bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700"
                        >
                          Clear — use default
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-2">
                        <span className="text-gray-400">Preview (sample names):</span>{' '}
                        <span className="text-emerald-300/95">
                          {previewObsMessageTemplate(settingsForm.obsSubscriptionMessageTemplate, {
                            name: OBS_MSG_SAMPLE.name,
                            platform: OBS_MSG_SAMPLE.platform,
                            amount: OBS_MSG_SAMPLE.subAmount,
                            message: OBS_MSG_SAMPLE.subNote,
                            kind: 'new',
                          }) || 'Built-in welcome line'}
                        </span>
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-600/60 bg-gray-900/35 p-4">
                      <label className="block text-sm font-medium text-white mb-1">
                        When someone sends a shoutout
                      </label>
                      <p className="text-[11px] text-gray-500 mb-2">
                        One-time shoutout payments from your support page (not reward-tier TTS — those are set per tier).
                      </p>
                      <textarea
                        value={settingsForm.obsShoutoutMessageTemplate ?? ''}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            obsShoutoutMessageTemplate: e.target.value,
                          })
                        }
                        rows={3}
                        maxLength={500}
                        placeholder={`e.g. Shoutout to {{name}} on {{platform}} — {{message}}`}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 resize-y"
                      />
                      <div className="flex flex-wrap gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() =>
                            setSettingsForm({
                              ...settingsForm,
                              obsShoutoutMessageTemplate:
                                '{{name}} from {{platform}} sent KES {{amount}}. {{message}}',
                            })
                          }
                          className="text-[11px] px-2.5 py-1 rounded-md bg-gray-700 text-gray-200 hover:bg-gray-600 border border-gray-600/80"
                        >
                          Use amount + message example
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSettingsForm({
                              ...settingsForm,
                              obsShoutoutMessageTemplate: '',
                            })
                          }
                          className="text-[11px] px-2.5 py-1 rounded-md bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700"
                        >
                          Clear — use default
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-2">
                        <span className="text-gray-400">Preview (sample):</span>{' '}
                        <span className="text-emerald-300/95">
                          {previewObsMessageTemplate(settingsForm.obsShoutoutMessageTemplate, {
                            name: OBS_MSG_SAMPLE.name,
                            platform: OBS_MSG_SAMPLE.platform,
                            amount: OBS_MSG_SAMPLE.shoutAmount,
                            message: OBS_MSG_SAMPLE.shoutNote,
                            kind: 'shoutout',
                          }) || 'Built-in shoutout line'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <details className="mt-4 rounded-lg border border-gray-700/70 bg-gray-900/25 px-3 py-2 text-[11px] text-gray-500">
                    <summary className="cursor-pointer text-gray-400 select-none">
                      Optional shortcuts (copy into your text)
                    </summary>
                    <ul className="mt-2 space-y-1 list-disc list-inside text-gray-500">
                      <li>
                        <code className="text-gray-400">{'{{name}}'}</code> — supporter name
                      </li>
                      <li>
                        <code className="text-gray-400">{'{{platform}}'}</code> — TikTok, YouTube, etc.
                      </li>
                      <li>
                        <code className="text-gray-400">{'{{amount}}'}</code> — KES amount when available
                      </li>
                      <li>
                        <code className="text-gray-400">{'{{message}}'}</code> — note they typed (may be empty)
                      </li>
                    </ul>
                  </details>
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

      <CreatorSuperProfileModal
        open={creatorSuperProfileOpen}
        onClose={closeCreatorSuperProfile}
        loading={creatorSuperProfileLoading}
        data={creatorSuperProfile}
        formatDate={(d) => (d ? formatDate(d) : '—')}
        formatAmount={formatAmountForRole}
        shoutoutPlatformLabel={shoutoutPlatformLabel}
      />

      <AdminDashboardModals admin={admin} />
    </div>
  )
}
