import { API_BASE_URL, formatApiErrorMessage } from './api-origin'

const CREATOR_TOKEN_KEY = 'creatorToken'
const CREATOR_USER_KEY = 'creatorUser'

export type CreatorProfile = {
  id: string
  email: string
  slug: string
  displayName: string
  bio: string | null
  whatIDo: string | null
  packagesSummary: string | null
  avatarUrl: string | null
  primaryCategory: string | null
  tiktokUrl: string | null
  instagramUrl: string | null
  youtubeUrl: string | null
  onboardingComplete: boolean
  isActive: boolean
  supportEnabled: boolean
  emailVerifiedAt?: string | null
}

type CreatorAuthResponse = {
  accessToken: string
  creator: CreatorProfile
}

type CreatorSignupResponse = {
  ok: boolean
  requiresEmailVerification: boolean
  message: string
}

export function getCreatorToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(CREATOR_TOKEN_KEY)
}

export function getCreatorUser(): CreatorProfile | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(CREATOR_USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as CreatorProfile
  } catch {
    return null
  }
}

export function setCreatorSession(payload: CreatorAuthResponse) {
  if (typeof window === 'undefined') return
  localStorage.setItem(CREATOR_TOKEN_KEY, payload.accessToken)
  localStorage.setItem(CREATOR_USER_KEY, JSON.stringify(payload.creator))
}

/** After PATCH /profile — keep JWT and refresh stored creator (onboarding flag, slug, etc.). */
export function setCreatorUserProfile(profile: CreatorProfile) {
  if (typeof window === 'undefined') return
  localStorage.setItem(CREATOR_USER_KEY, JSON.stringify(profile))
}

export function clearCreatorSession() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CREATOR_TOKEN_KEY)
  localStorage.removeItem(CREATOR_USER_KEY)
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getCreatorToken()
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

export const creatorAuthApi = {
  signup: (data: {
    email: string
    password: string
    displayName: string
    slug: string
    bio?: string
  }) =>
    request<CreatorSignupResponse>('/creator-auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { identifier: string; password: string }) =>
    request<CreatorAuthResponse>('/creator-auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  verifyEmail: (token: string) =>
    request<{ ok: boolean; message: string }>('/creator-auth/verify-email?token=' + encodeURIComponent(token)),

  resendVerification: (email: string) =>
    request<{ ok: boolean; message: string }>('/creator-auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  forgotPassword: (email: string) =>
    request<{ ok: boolean; message: string }>('/creator-auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (data: { token: string; password: string }) =>
    request<{ ok: boolean; message: string }>('/creator-auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  me: () => request<CreatorProfile>('/creator-auth/me'),

  updateProfile: (data: {
    displayName?: string
    slug?: string
    bio?: string | null
    whatIDo?: string | null
    packagesSummary?: string | null
    primaryCategory?: string | null
    avatarUrl?: string | null
    tiktokUrl?: string | null
    instagramUrl?: string | null
    youtubeUrl?: string | null
    onboardingComplete?: boolean
  }) =>
    request<CreatorProfile>('/creator-auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
}
