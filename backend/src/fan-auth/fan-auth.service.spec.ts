import { normalizeKenyaMsisdn } from '../common/utils/mpesa-msisdn';

describe('fan phone normalization', () => {
  it('stores OTP fans as 254 numbers', () => {
    expect(normalizeKenyaMsisdn('0712345678')).toBe('254712345678');
    expect(normalizeKenyaMsisdn('254712345678')).toBe('254712345678');
  });
});
