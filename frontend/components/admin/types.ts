export interface DashboardStats {
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
    /** Completed revenue split by payment purpose (for dashboard share UI). */
    revenueBySource?: {
      subscriptionsKes: number
      shoutoutsKes: number
      coachingKes: number
      tiersKes: number
      otherKes: number
      totalKes: number
    }
  }
  /** Platform admin only: registered streamer accounts */
  streamers?: {
    total: number
    active: number
  }
  /** Platform admin only: payout requests awaiting review */
  pendingPayoutRequests?: number
  /** Platform admin: weekly super-admin payout rhythm + next reminder time (server) */
  payoutProcessingSchedule?: {
    weekday: string
    hourLocal: number
    summary: string
    nextReminderAt: string
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

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

/** Creator portal GET /creator-portal/rankings */
export type CreatorSupporterRankings = {
  limit: number
  contributors: Array<{
    rank: number
    userId: string
    displayName: string
    tiktokUsername: string | null
    isActive: boolean
    totalKes: number
    completedPaymentCount: number
  }>
  subscribers: Array<{
    rank: number
    userId: string
    displayName: string
    tiktokUsername: string | null
    isActive: boolean
    totalKes: number
    totalMonthsSubscribed: number
    completedSubscriptionPayments: number
  }>
}

export type AdminTabId =
  | 'overview'
  | 'creators'
  | 'users'
  | 'subscriptions'
  | 'payments'
  | 'tierPurchases'
  | 'rankings'
  | 'shoutouts'
  | 'bookings'
  | 'payouts'
  | 'revenue'
  | 'rewards'
  | 'settings'

export interface RevenueSourceRow {
  key: string
  label: string
  kes: number
  count: number
}

export interface RevenueDailyRow {
  date: string
  subscriptionKes: number
  shoutoutKes: number
  accountReviewKes: number
  otherKes: number
  totalKes: number
}

/** One completed payment: amount, fee (rounded per tx), net — for audit UI. */
export interface PaymentFeeLine {
  id: string
  completedAt: string | null
  amountKes: number
  feeKes: number
  netKes: number
  purpose: string | null
}

export interface RevenueBreakdownResponse {
  preset: string
  timezone: string
  from: string
  to: string
  rangeStartUtc: string
  rangeEndUtc: string
  totalKes: number
  platformFeePercent: number
  platformFeeKes: number
  creatorNetKes: number
  totalCount: number
  sources: RevenueSourceRow[]
  daily: RevenueDailyRow[]
  paymentFeeLines?: PaymentFeeLine[]
  paymentFeeLinesLimit?: number
}

export interface CreatorWalletSummary {
  completedPayments: number
  platformFeePercent: number
  totals: {
    grossKes: number
    feeKes: number
    netKes: number
  }
  byPurpose: {
    subscriptionKes: number
    shoutoutKes: number
    coachingKes: number
    creatorRewardKes: number
    otherKes: number
  }
  recentFeeLines?: PaymentFeeLine[]
  recentFeeLinesLimit?: number
}
