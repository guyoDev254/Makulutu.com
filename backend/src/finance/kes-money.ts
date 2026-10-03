/**
 * Integer-cent KES arithmetic. Do not use IEEE floats for fee splits.
 * 1 KES = 100 cents.
 */

export class MoneyParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyParseError';
  }
}

const CENTS_PER_KES = 100n;

export function parseKesToCents(
  value: { toString(): string } | string | null | undefined,
): bigint {
  if (value == null) return 0n;
  const raw = String(value).trim();
  if (!raw) return 0n;
  if (!/^-?\d+(\.\d{1,2})?$/.test(raw)) {
    throw new MoneyParseError(`Invalid KES amount: ${raw}`);
  }
  const negative = raw.startsWith('-');
  const unsigned = negative ? raw.slice(1) : raw;
  const [wholeRaw, fracRaw = ''] = unsigned.split('.');
  const whole = BigInt(wholeRaw || '0');
  const frac = BigInt((fracRaw + '00').slice(0, 2));
  const cents = whole * CENTS_PER_KES + frac;
  return negative ? -cents : cents;
}

export function centsToKesString(cents: bigint): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const whole = abs / CENTS_PER_KES;
  const frac = abs % CENTS_PER_KES;
  const body = `${whole.toString()}.${frac.toString().padStart(2, '0')}`;
  return negative ? `-${body}` : body;
}

/** JSON display only — derived from integer cents, not used for further money math. */
export function centsToKesNumber(cents: bigint): number {
  return Number(centsToKesString(cents));
}

/**
 * Platform fee percent with up to 2 decimal places, as hundredths of a percent.
 * 5 → 500, 5.5 → 550, 10.25 → 1025.
 */
export function parsePercentToHundredths(value: string | null | undefined): bigint {
  const raw = String(value ?? '').trim();
  if (!raw) return 0n;
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) {
    throw new MoneyParseError(`Invalid percent: ${raw}`);
  }
  const [wholeRaw, fracRaw = ''] = raw.split('.');
  const whole = BigInt(wholeRaw || '0');
  const frac = BigInt((fracRaw + '00').slice(0, 2));
  return whole * 100n + frac;
}

/** fee = gross × percent / 100, rounded half-up to the nearest cent. */
export function splitGrossCents(
  grossCents: bigint,
  feePercentHundredths: bigint,
): { feeCents: bigint; creatorCents: bigint } {
  if (grossCents < 0n) {
    throw new MoneyParseError('Gross amount cannot be negative');
  }
  if (feePercentHundredths < 0n || feePercentHundredths > 10000n) {
    throw new MoneyParseError('Fee percent must be between 0 and 100');
  }
  const numerator = grossCents * feePercentHundredths;
  const feeCents = (numerator + 5000n) / 10000n;
  const creatorCents = grossCents - feeCents;
  return { feeCents, creatorCents };
}

export function addCents(...parts: bigint[]): bigint {
  return parts.reduce((sum, n) => sum + n, 0n);
}
