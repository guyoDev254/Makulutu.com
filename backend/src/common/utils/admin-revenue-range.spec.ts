import {
  enumerateNairobiDays,
  nairobiMondayOfWeek,
  nairobiYmd,
  previousInclusiveRange,
  resolveRevenueRangeNairobi,
} from './admin-revenue-range';

describe('nairobiMondayOfWeek', () => {
  it('returns the same day when the date is Monday', () => {
    expect(nairobiMondayOfWeek('2026-09-21')).toBe('2026-09-21');
  });

  it('walks back Friday to Monday', () => {
    expect(nairobiMondayOfWeek('2026-09-25')).toBe('2026-09-21');
  });
});

describe('resolveRevenueRangeNairobi thisWeek', () => {
  it('spans Monday through today', () => {
    const today = nairobiYmd(new Date());
    const range = resolveRevenueRangeNairobi('thisWeek');
    expect(range.toYmd).toBe(today);
    expect(range.fromYmd).toBe(nairobiMondayOfWeek(today));
    expect(range.fromYmd <= range.toYmd).toBe(true);
  });
});

describe('previousInclusiveRange', () => {
  it('returns the same number of days before the range', () => {
    const prev = previousInclusiveRange('2026-09-21', '2026-09-25');
    expect(prev).toEqual({ fromYmd: '2026-09-16', toYmd: '2026-09-20' });
    expect(enumerateNairobiDays(prev.fromYmd, prev.toYmd)).toHaveLength(5);
  });
});
