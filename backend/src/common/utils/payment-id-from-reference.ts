/** Restore a payment UUID from a provider reference (with or without hyphens). */
export function paymentIdFromProviderReference(value: string): string | null {
  const raw = value.trim();
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)
  ) {
    return raw.toLowerCase();
  }
  const hex = raw.replace(/-/g, '');
  if (!/^[0-9a-f]{32}$/i.test(hex)) return null;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`.toLowerCase();
}
