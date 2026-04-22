/** Normalize optional API value to `#rrggbb` or null. */
export function normalizeRewardAccentHex(
  raw: string | null | undefined,
): string | null {
  if (raw == null || typeof raw !== 'string') return null
  const s = raw.trim()
  if (!s) return null
  const h = s.startsWith('#') ? s : `#${s}`
  return /^#[0-9a-fA-F]{6}$/.test(h) ? h.toLowerCase() : null
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = normalizeRewardAccentHex(hex)
  if (!h) return null
  const n = parseInt(h.slice(1), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function rgbaHex(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return `rgba(245, 158, 11, ${alpha})`
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`
}

/** Darken RGB hex for gradient end (factor 0–1, lower = darker). */
export function darkenHex(hex: string, factor: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return '#c2410c'
  const d = (c: number) =>
    Math.max(0, Math.min(255, Math.round(c * factor)))
  const to = (n: number) => n.toString(16).padStart(2, '0')
  return `#${to(d(rgb.r))}${to(d(rgb.g))}${to(d(rgb.b))}`
}

/** Blend hex toward white (t=0 → original, t=1 → white). */
export function mixHexWithWhite(hex: string, t: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return '#fde68a'
  const mix = (c: number) => Math.round(c + (255 - c) * Math.min(1, Math.max(0, t)))
  const to = (n: number) => n.toString(16).padStart(2, '0')
  return `#${to(mix(rgb.r))}${to(mix(rgb.g))}${to(mix(rgb.b))}`
}
