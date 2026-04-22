/**
 * Public marketing copy — override per deployment with NEXT_PUBLIC_SITE_NAME / NEXT_PUBLIC_SITE_DESCRIPTION.
 */
export const SITE_NAME =
  process.env.NEXT_PUBLIC_SITE_NAME?.trim() || 'Makulutu'

export const SITE_DESCRIPTION =
  process.env.NEXT_PUBLIC_SITE_DESCRIPTION?.trim() ||
  'Subscriptions, shoutouts, coaching requests, and M-Pesa checkout for many creators — each with their own public page.'

/** Short line for nav/footer wordmark subtitle */
export const SITE_TAGLINE =
  process.env.NEXT_PUBLIC_SITE_TAGLINE?.trim() ||
  'Multi-creator subscriptions, shoutouts & M-Pesa'

export const SITE_BRAND_ALT = `${SITE_NAME} logo`

/** Tailwind classes for the product name (Bungee via layout + tailwind.config.js) */
export const SITE_NAME_CLASS = 'font-bungee font-normal tracking-wide'
