import {
  centsToKesString,
  parseKesToCents,
  parsePercentToHundredths,
  splitGrossCents,
} from './kes-money';

describe('kes-money', () => {
  it('parses KES to cents without floats', () => {
    expect(parseKesToCents('1000')).toBe(100000n);
    expect(parseKesToCents('1000.50')).toBe(100050n);
    expect(parseKesToCents('0.01')).toBe(1n);
    expect(centsToKesString(95000n)).toBe('950.00');
  });

  it('splits 1000 at 5% into 50 fee and 950 creator', () => {
    const { feeCents, creatorCents } = splitGrossCents(
      parseKesToCents('1000'),
      parsePercentToHundredths('5'),
    );
    expect(centsToKesString(feeCents)).toBe('50.00');
    expect(centsToKesString(creatorCents)).toBe('950.00');
  });

  it('rounds half-up on fractional cents', () => {
    const { feeCents, creatorCents } = splitGrossCents(
      parseKesToCents('1.00'),
      parsePercentToHundredths('5'),
    );
    expect(feeCents + creatorCents).toBe(100n);
    expect(feeCents).toBe(5n);
  });

  it('keeps 0% and 100% splits exact', () => {
    expect(splitGrossCents(10000n, 0n)).toEqual({
      feeCents: 0n,
      creatorCents: 10000n,
    });
    expect(splitGrossCents(10000n, 10000n)).toEqual({
      feeCents: 10000n,
      creatorCents: 0n,
    });
  });
});
