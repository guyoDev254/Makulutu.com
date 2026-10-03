const YMD = /^(\d{4})-(\d{2})-(\d{2})$/

export const MIN_ACCOUNT_AGE_YEARS = 18

export function formatYmd(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Latest birthday that is still 18 today. */
export function maxAdultDateOfBirth(now = new Date()): string {
  return formatYmd(
    new Date(now.getFullYear() - MIN_ACCOUNT_AGE_YEARS, now.getMonth(), now.getDate()),
  )
}

export function isAdultDateOfBirth(value: string, now = new Date()): boolean {
  const match = YMD.exec((value || '').trim())
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const utc = new Date(Date.UTC(year, month - 1, day))
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return false
  }
  let age = now.getFullYear() - year
  const m = now.getMonth() + 1
  const d = now.getDate()
  if (m < month || (m === month && d < day)) age -= 1
  return age >= MIN_ACCOUNT_AGE_YEARS
}

export const UNDERAGE_SIGNUP_MESSAGE = 'You must be 18 or older to register.'
