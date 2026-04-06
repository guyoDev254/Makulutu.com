import type { DashboardStats } from './types'

export function formatCurrency(amount: number): string {
  return `KES ${parseFloat(amount.toString()).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatAmountForRole(role: string | undefined, amount: number): string {
  return role === 'MODERATOR' ? '—' : formatCurrency(amount)
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function shoutoutPlatformLabel(code: string | null | undefined): string {
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

export function getStatusBadge(status: string): string {
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
