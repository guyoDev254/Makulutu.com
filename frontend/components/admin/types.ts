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

export type AdminTabId =
  | 'overview'
  | 'users'
  | 'subscriptions'
  | 'payments'
  | 'shoutouts'
  | 'bookings'
  | 'revenue'
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

export interface RevenueBreakdownResponse {
  preset: string
  timezone: string
  from: string
  to: string
  rangeStartUtc: string
  rangeEndUtc: string
  totalKes: number
  totalCount: number
  sources: RevenueSourceRow[]
  daily: RevenueDailyRow[]
}
