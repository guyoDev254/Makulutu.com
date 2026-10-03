/** Compact clip tokens for API bodies — full tiktok.com URLs are often blocked by Imunify360. */

export function toCompactTikTokClipRef(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const compact = /^(tkv|tkp|tks):/i.test(trimmed) ? trimmed : null
  if (compact) {
    if (/^tkv:\d{5,32}$/i.test(trimmed)) return `tkv:${trimmed.slice(4)}`
    if (/^tkp:\d{5,32}$/i.test(trimmed)) return `tkp:${trimmed.slice(4)}`
    if (/^tks:[A-Za-z0-9_-]{4,32}$/i.test(trimmed)) return `tks:${trimmed.slice(4)}`
  }
  let u: URL
  try {
    u = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`)
  } catch {
    return null
  }
  if (u.protocol !== 'https:') return null
  const h = u.hostname.toLowerCase()
  const allowed =
    h === 'tiktok.com' ||
    h === 'www.tiktok.com' ||
    h === 'm.tiktok.com' ||
    h === 'vm.tiktok.com' ||
    h === 'vt.tiktok.com' ||
    h.endsWith('.tiktok.com')
  if (!allowed) return null
  const video = u.pathname.match(/\/video\/(\d+)/)
  if (video) return `tkv:${video[1]}`
  const photo = u.pathname.match(/\/photo\/(\d+)/)
  if (photo) return `tkp:${photo[1]}`
  if (h === 'vm.tiktok.com' || h === 'vt.tiktok.com') {
    const code = u.pathname.replace(/\//g, '').trim()
    if (/^[A-Za-z0-9_-]{4,32}$/.test(code)) return `tks:${code}`
  }
  return null
}
