export interface AdminUser {
  id: string
  username: string
  email: string
  role: string
  lastLogin?: string
}

export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('adminToken')
}

export const getAdminUser = (): AdminUser | null => {
  if (typeof window === 'undefined') return null
  const userStr = localStorage.getItem('adminUser')
  if (!userStr) return null
  try {
    return JSON.parse(userStr)
  } catch {
    return null
  }
}

export const setAuthToken = (token: string, user: AdminUser): void => {
  if (typeof window === 'undefined') return
  localStorage.setItem('adminToken', token)
  localStorage.setItem('adminUser', JSON.stringify(user))
}

export const clearAuth = (): void => {
  if (typeof window === 'undefined') return
  localStorage.removeItem('adminToken')
  localStorage.removeItem('adminUser')
}

export const isAuthenticated = (): boolean => {
  return !!getAuthToken()
}
