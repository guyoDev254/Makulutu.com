import { emailOtpTooSoon, hashEmailOtp, newEmailOtp } from './email-otp';

describe('email OTP', () => {
  it('generates a 6-digit code', () => {
    expect(newEmailOtp()).toMatch(/^\d{6}$/);
  });

  it('hashes email + code together', () => {
    const a = hashEmailOtp('Fan@Makulutu.com', '123456');
    const b = hashEmailOtp('fan@makulutu.com', '123456');
    const c = hashEmailOtp('fan@makulutu.com', '000000');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it('blocks resend inside the cooldown window', () => {
    expect(emailOtpTooSoon(new Date())).toBe(true);
    expect(emailOtpTooSoon(new Date(Date.now() - 60_000))).toBe(false);
  });
});
