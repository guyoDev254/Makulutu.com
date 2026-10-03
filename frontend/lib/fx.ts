/** Display FX only. Catalog and ledger stay in KES. */
export const DEFAULT_KES_PER_USD = 130

export function kesPerUsd(): number {
  const raw =
    typeof process !== 'undefined'
      ? Number(process.env.NEXT_PUBLIC_KES_PER_USD)
      : NaN
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_KES_PER_USD
}

export function kesToUsd(kes: number): number {
  const n = Number(kes)
  if (!Number.isFinite(n)) return 0
  return Math.round((n / kesPerUsd()) * 100) / 100
}

export function usdToKes(usd: number): number {
  const n = Number(usd)
  if (!Number.isFinite(n)) return 0
  return Math.round(n * kesPerUsd() * 100) / 100
}

export function formatKesAmount(kes: number): string {
  const n = Number(kes)
  if (!Number.isFinite(n)) return '—'
  return `KES ${n.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`
}

export function formatUsdAmount(usd: number): string {
  const n = Number(usd)
  if (!Number.isFinite(n)) return '—'
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Kenya: KES. Other countries: USD (from KES at the display rate). */
export function formatSupportPrice(kes: number, kenya: boolean): string {
  if (kenya) return formatKesAmount(kes)
  return formatUsdAmount(kesToUsd(kes))
}

export function formatSupportPriceHint(kes: number, kenya: boolean): string {
  if (kenya) return ''
  return `Card is billed in KES (${formatKesAmount(kes)} ≈ ${formatUsdAmount(kesToUsd(kes))} at ${kesPerUsd()} KES / USD).`
}
