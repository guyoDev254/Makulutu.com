import { API_BASE_URL } from './api-origin'

function apiOrigin(): string {
  return API_BASE_URL.replace(/\/+$/, '')
}

const OBJECT_KEY_PREFIXES = [
  'creators/',
  'users/',
  'posts/',
  'shoutouts/',
  'documents/',
  'temp/',
] as const

function s3ObjectKey(trimmed: string): string | null {
  try {
    const url = new URL(trimmed)
    if (!url.hostname.toLowerCase().includes('amazonaws.com')) return null
    const path = url.pathname.replace(/^\/+/, '')
    if (OBJECT_KEY_PREFIXES.some((p) => path.startsWith(p))) return path
    const slash = path.indexOf('/')
    if (slash > 0) {
      const rest = path.slice(slash + 1)
      if (OBJECT_KEY_PREFIXES.some((p) => rest.startsWith(p))) return rest
    }
  } catch {
    return null
  }
  return null
}

/** Point uploaded files at the same host the website uses for the API. */
export function mediaUrl(path?: string | null): string | null {
  if (!path) return null
  const trimmed = path.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) return trimmed
  const base = apiOrigin()
  const s3Key = s3ObjectKey(trimmed)
  if (s3Key && base) {
    return `${base}/media?key=${encodeURIComponent(s3Key)}`
  }
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed)
      const localHost =
        url.hostname === 'localhost' ||
        url.hostname === '127.0.0.1' ||
        url.hostname === '0.0.0.0' ||
        url.hostname === '::1'
      if (localHost && base) {
        const api = new URL(base)
        url.protocol = api.protocol
        url.host = api.host
        return url.toString()
      }
    } catch {
      return trimmed
    }
    return trimmed
  }
  if (!base) return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return `${base}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`
}

/** Shown when a creator or fan has no uploaded photo. */
export const DEFAULT_PUBLIC_AVATAR = '/makulutu-logo.png'

export function publicImageSrc(
  path?: string | null,
  fallback = DEFAULT_PUBLIC_AVATAR,
): string {
  return mediaUrl(path) || fallback
}

export function publicImageFitClass(path?: string | null): string {
  return mediaUrl(path)
    ? 'object-cover object-top'
    : 'object-contain bg-black p-3 sm:p-5'
}

/** Listing cards and public pages use the profile photo only. */
export function creatorCardImage(creator: {
  avatarUrl?: string | null
}): string | null {
  return creator.avatarUrl || null
}
