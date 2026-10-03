import { API_BASE_URL, formatApiErrorMessage } from './api-origin'

const FAN_TOKEN_KEY = 'fanToken'
const FAN_USER_KEY = 'fanUser'

export type FanProfile = {
  id: string
  phone: string | null
  email: string | null
  name: string | null
  tiktokUsername: string | null
  avatarUrl: string | null
  locale: string
  showOnLeaderboard: boolean
  hasPassword: boolean
  hasGoogle: boolean
  emailVerifiedAt?: string | null
}

type FanAuthResponse = {
  accessToken: string
  fan: FanProfile
}

type FanSignupResponse = {
  ok: boolean
  requiresEmailVerification: boolean
  email?: string
  message: string
  debugOtp?: string
}

export function getFanToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(FAN_TOKEN_KEY)
}

export function getFanUser(): FanProfile | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(FAN_USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as FanProfile
  } catch {
    return null
  }
}

export function setFanSession(payload: FanAuthResponse) {
  if (typeof window === 'undefined') return
  localStorage.setItem(FAN_TOKEN_KEY, payload.accessToken)
  localStorage.setItem(FAN_USER_KEY, JSON.stringify(payload.fan))
}

export function setFanUserProfile(profile: FanProfile) {
  if (typeof window === 'undefined') return
  localStorage.setItem(FAN_USER_KEY, JSON.stringify(profile))
}

export function clearFanSession() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(FAN_TOKEN_KEY)
  localStorage.removeItem(FAN_USER_KEY)
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getFanToken()
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(formatApiErrorMessage(body, 'Request failed'))
  }
  return body as T
}

export const fanAuthApi = {
  signup: (data: { email: string; password: string; name?: string; dateOfBirth: string }) =>
    request<FanSignupResponse>('/fan-auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { identifier: string; password: string }) =>
    request<FanAuthResponse>('/fan-auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  verifyEmailOtp: (email: string, code: string) =>
    request<FanAuthResponse>('/fan-auth/verify-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),

  resendVerification: (email: string) =>
    request<{ ok: boolean; message: string }>('/fan-auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  me: () => request<FanProfile>('/fan-auth/me'),
}

export const fanPortalApi = {
  memberships: () => request<unknown[]>('/fan-portal/memberships'),
  payments: () => request<unknown[]>('/fan-portal/payments'),
  follows: () => request<unknown[]>('/fan-portal/follows'),
  notifications: () => request<unknown[]>('/fan-portal/notifications'),
  markNotificationsRead: () =>
    request<{ ok: boolean }>('/fan-portal/notifications/read', { method: 'PATCH' }),
  markNotificationRead: (id: string) =>
    request<{ ok: boolean }>(`/fan-portal/notifications/${id}/read`, { method: 'PATCH' }),

  subscribe: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>('/fan-portal/subscribe', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  shoutout: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>('/fan-portal/shoutout', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  checkoutReward: (id: string, body: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/fan-portal/rewards/${id}/checkout`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  checkoutCoaching: (body: Record<string, unknown>) =>
    request<Record<string, unknown>>('/fan-portal/coaching', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}
