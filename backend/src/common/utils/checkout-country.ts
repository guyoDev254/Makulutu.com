export const CHECKOUT_COUNTRY_CODES = [
  'KE',
  'NG',
  'GH',
  'ZA',
  'TZ',
  'UG',
  'RW',
  'ET',
  'EG',
  'SN',
  'CM',
  'DZ',
  'US',
  'GB',
  'CA',
  'OTHER',
] as const

export type CheckoutCountryCode = (typeof CHECKOUT_COUNTRY_CODES)[number]

export function parseCheckoutCountry(
  raw?: string | null,
): CheckoutCountryCode {
  const code = (raw || '').trim().toUpperCase()
  return CHECKOUT_COUNTRY_CODES.includes(code as CheckoutCountryCode)
    ? (code as CheckoutCountryCode)
    : 'KE'
}
