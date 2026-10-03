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
  /** Platform admin only: payouts currently sending via Paystack */
  pendingPayoutRequests?: number
  /** Platform admin: leftover weekly reminder metadata (payouts are automatic) */
  payoutProcessingSchedule?: {
    weekday: string
    hourLocal: number
    summary: string
    nextReminderAt: string
  }
  trends?: {
    days: number
    fromYmd?: string
    toYmd?: string
    series: Array<{
      date: string
      label: string
      completedPayments: number
      revenueKes: number
      newSubscriptions: number
    }>
  }
  /** Completed support in the selected Nairobi calendar range. */
  period?: {
    preset: string
    fromYmd: string
    toYmd: string
    label: string
    completedPayments: number
    newSubscriptions: number
    newFans?: number
    pendingPayments?: number
    failedPayments?: number
    revenueKes: number
    revenueBySource?: {
      subscriptionsKes: number
      shoutoutsKes: number
      coachingKes: number
      tiersKes: number
      otherKes: number
      totalKes: number
    }
    previous?: {
      fromYmd: string
      toYmd: string
      completedPayments: number
      newSubscriptions: number
      newFans?: number
      revenueKes: number
    }
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
  platformRevenueKes?: number
  grossKes?: number
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
  grossPaymentsKes?: number
  platformFeePercent: number
  platformFeeKes: number
  creatorNetKes: number
  creatorEarningsKes?: number
  refundsKes?: number
  netPlatformRevenueKes?: number
  totalCount: number
  sources: RevenueSourceRow[]
  daily: RevenueDailyRow[]
  paymentFeeLines?: PaymentFeeLine[]
  paymentFeeLinesLimit?: number
}

export interface CreatorWalletSummary {
  completedPayments: number
  platformFeePercent: number
  minWithdrawalKes?: number
  withdrawalFeeKes?: number
  availableKes?: number
  pendingKes?: number
  reservedKes?: number
  lifetimeEarningsKes?: number
  totalWithdrawnKes?: number
  outstandingDebtKes?: number
  withdrawableKes?: number
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
