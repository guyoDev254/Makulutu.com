/**
 * Pull a Kenyan mobile MSISDN (2547xxxxxxxx / 2541xxxxxxxx) out of free-text
 * payout channels like "M-Pesa 0712 345 678" or "254700000999".
 */
export function extractKenyaMsisdn(raw?: string | null): string | null {
  if (!raw) return null;
  const digitsOnlyRuns = raw.match(/(\+?254|0)?[\d\s-]{8,}/g);
  if (!digitsOnlyRuns) return null;

  for (const run of digitsOnlyRuns) {
    const normalized = normalizeKenyaMsisdn(run);
    if (normalized) return normalized;
  }
  return normalizeKenyaMsisdn(raw);
}

export function normalizeKenyaMsisdn(raw: string): string | null {
  let cleaned = raw.replace(/\D/g, '');
  if (!cleaned) return null;

  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = `254${cleaned.slice(1)}`;
  } else if (cleaned.startsWith('254') === false && cleaned.length === 9) {
    cleaned = `254${cleaned}`;
  }

  if (/^254[17]\d{8}$/.test(cleaned)) {
    return cleaned;
  }
  return null;
}

/** All common Kenyan mobile spellings for the same number (DB lookup). */
export function kenyaMsisdnAliases(raw?: string | null): string[] {
  const normalized = raw ? normalizeKenyaMsisdn(raw) : null;
  if (!normalized) return [];
  const local = `0${normalized.slice(3)}`;
  return [...new Set([normalized, local, `+${normalized}`])];
}
