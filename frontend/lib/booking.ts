/** Digits only, with country code (e.g. 254712345678). Set NEXT_PUBLIC_BOOKING_WHATSAPP in .env */
export function getBookingWhatsAppDigits(): string {
  const raw = process.env.NEXT_PUBLIC_BOOKING_WHATSAPP?.trim() ?? ''
  return raw.replace(/\D/g, '')
}

export function buildBookingWhatsAppUrl(message: string): string | null {
  const digits = getBookingWhatsAppDigits()
  if (!digits) return null
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

export const SERVICE_LABELS: Record<string, string> = {
  account_review: 'Account review',
  rank_push: 'Rank push',
  both: 'Account review + rank push',
}
