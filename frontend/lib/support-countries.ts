export const SUPPORT_COUNTRIES = [
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼' },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'SN', name: 'Senegal', flag: '🇸🇳' },
  { code: 'CM', name: 'Cameroon', flag: '🇨🇲' },
  { code: 'DZ', name: 'Algeria', flag: '🇩🇿' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'OTHER', name: 'Other country', flag: '🌍' },
] as const

export type SupportCountryCode = (typeof SUPPORT_COUNTRIES)[number]['code']

export const CHECKOUT_COUNTRY_STORAGE_KEY = 'makulutu.checkoutCountry'

export function isKenyaCheckout(code: string): boolean {
  return code === 'KE'
}

export function parseSupportCountryCode(raw: string | null | undefined): SupportCountryCode {
  const code = (raw || '').trim().toUpperCase()
  return SUPPORT_COUNTRIES.some((c) => c.code === code)
    ? (code as SupportCountryCode)
    : 'KE'
}

export function supportCountryLabel(code: string | null | undefined): string {
  const parsed = parseSupportCountryCode(code)
  const row = SUPPORT_COUNTRIES.find((c) => c.code === parsed)
  return row ? `${row.flag} ${row.name}` : parsed
}

export function readStoredCheckoutCountry(scope?: string): SupportCountryCode {
  try {
    if (scope) {
      const scoped = window.localStorage.getItem(`${CHECKOUT_COUNTRY_STORAGE_KEY}.${scope}`)
      if (scoped) return parseSupportCountryCode(scoped)
    }
    return parseSupportCountryCode(window.localStorage.getItem(CHECKOUT_COUNTRY_STORAGE_KEY))
  } catch {
    return 'KE'
  }
}

export function writeStoredCheckoutCountry(code: SupportCountryCode, scope?: string) {
  try {
    if (scope) {
      window.localStorage.setItem(`${CHECKOUT_COUNTRY_STORAGE_KEY}.${scope}`, code)
    }
    window.localStorage.setItem(CHECKOUT_COUNTRY_STORAGE_KEY, code)
  } catch {
    /* ignore */
  }
}
