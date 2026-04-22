/** Revenue date ranges use Africa/Nairobi calendar days (EAT, UTC+3). */

const NAIROBI_TZ = 'Africa/Nairobi';
const YMD_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: NAIROBI_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function nairobiYmd(d: Date): string {
  return YMD_FMT.format(d);
}

/** Inclusive calendar day bounds in Nairobi, as UTC `Date` for DB filtering. */
export function nairobiDayBoundsUtc(ymd: string): { start: Date; end: Date } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    throw new Error('Invalid YYYY-MM-DD');
  }
  const start = new Date(`${ymd}T00:00:00.000+03:00`);
  const end = new Date(`${ymd}T23:59:59.999+03:00`);
  return { start, end };
}

function addDaysYmd(ymd: string, deltaDays: number): string {
  const { start } = nairobiDayBoundsUtc(ymd);
  const t = start.getTime() + deltaDays * 86400000;
  return nairobiYmd(new Date(t));
}

export type RevenuePreset = 'today' | 'yesterday' | 'last7' | 'last30' | 'custom';

export function resolveRevenueRangeNairobi(
  preset: RevenuePreset,
  customFrom?: string,
  customTo?: string,
): { fromYmd: string; toYmd: string } {
  const today = nairobiYmd(new Date());
  switch (preset) {
    case 'yesterday':
      return { fromYmd: addDaysYmd(today, -1), toYmd: addDaysYmd(today, -1) };
    case 'last7':
      return { fromYmd: addDaysYmd(today, -6), toYmd: today };
    case 'last30':
      return { fromYmd: addDaysYmd(today, -29), toYmd: today };
    case 'custom': {
      const f = customFrom?.trim();
      const t = customTo?.trim();
      if (!f || !t || !/^\d{4}-\d{2}-\d{2}$/.test(f) || !/^\d{4}-\d{2}-\d{2}$/.test(t)) {
        throw new Error('Custom range requires from and to as YYYY-MM-DD');
      }
      if (f > t) {
        throw new Error('from must be on or before to');
      }
      return { fromYmd: f, toYmd: t };
    }
    case 'today':
    default:
      return { fromYmd: today, toYmd: today };
  }
}

export function nairobiRangeToUtcBounds(fromYmd: string, toYmd: string): {
  startUtc: Date;
  endUtc: Date;
} {
  const { start } = nairobiDayBoundsUtc(fromYmd);
  const { end } = nairobiDayBoundsUtc(toYmd);
  return { startUtc: start, endUtc: end };
}

/** Each calendar day in range (Nairobi), inclusive. */
export function enumerateNairobiDays(fromYmd: string, toYmd: string): string[] {
  const out: string[] = [];
  let cur = fromYmd;
  const guard = 400;
  let i = 0;
  while (cur <= toYmd && i++ < guard) {
    out.push(cur);
    cur = addDaysYmd(cur, 1);
  }
  return out;
}
