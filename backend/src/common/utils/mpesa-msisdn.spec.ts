import {
  extractKenyaMsisdn,
  kenyaMsisdnAliases,
  normalizeKenyaMsisdn,
} from './mpesa-msisdn';

describe('extractKenyaMsisdn', () => {
  it('reads a 254 number from mixed channel text', () => {
    expect(extractKenyaMsisdn('M-Pesa 254712345678')).toBe('254712345678');
  });

  it('converts local 07 numbers', () => {
    expect(extractKenyaMsisdn('M-Pesa 0712 345 678')).toBe('254712345678');
  });

  it('accepts 01xx Safaricom / Airtel home-style mobiles', () => {
    expect(extractKenyaMsisdn('0112345678')).toBe('254112345678');
  });

  it('returns null for bank/till text without a mobile', () => {
    expect(extractKenyaMsisdn('KCB 1234567890')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(extractKenyaMsisdn('')).toBeNull();
    expect(extractKenyaMsisdn(null)).toBeNull();
  });
});

describe('normalizeKenyaMsisdn', () => {
  it('rejects short junk', () => {
    expect(normalizeKenyaMsisdn('12345')).toBeNull();
  });
});

describe('kenyaMsisdnAliases', () => {
  it('returns 254, local 0, and +254 forms', () => {
    expect(kenyaMsisdnAliases('0712345678').sort()).toEqual(
      ['+254712345678', '0712345678', '254712345678'].sort(),
    );
  });

  it('returns empty for invalid input', () => {
    expect(kenyaMsisdnAliases('nope')).toEqual([]);
    expect(kenyaMsisdnAliases(null)).toEqual([]);
  });
});
