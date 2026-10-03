import { createHash, randomInt } from 'crypto';

export const EMAIL_OTP_TTL_MS = 10 * 60 * 1000;
export const EMAIL_OTP_RESEND_MS = 45 * 1000;

export function newEmailOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function hashEmailOtp(email: string, code: string): string {
  const normalized = `${email.trim().toLowerCase()}:email-otp:${code.trim()}`;
  return createHash('sha256').update(normalized).digest('hex');
}

export function emailOtpTooSoon(sentAt: Date | null | undefined, now = new Date()): boolean {
  if (!sentAt) return false;
  return now.getTime() - sentAt.getTime() < EMAIL_OTP_RESEND_MS;
}

export function emailOtpMail(params: {
  toEmail: string;
  toName: string;
  code: string;
  role: 'fan' | 'creator';
}) {
  const roleLabel = params.role === 'creator' ? 'streamer' : 'fan';
  const subject = `Your Makulutu ${roleLabel} verification code`;
  const text = `Hi ${params.toName},\n\nYour verification code is ${params.code}.\n\nIt expires in 10 minutes. If you did not create this account, you can ignore this email.\n`;
  const html = `<p>Hi ${params.toName},</p><p>Your verification code is:</p><p style="font-size:28px;letter-spacing:6px;font-weight:700">${params.code}</p><p>It expires in 10 minutes.</p><p>If you did not create this account, you can ignore this email.</p>`;
  return {
    toEmail: params.toEmail.trim().toLowerCase(),
    toName: params.toName,
    subject,
    text,
    html,
    devLog: {
      label: `${roleLabel} email OTP`,
      detail: `${params.toEmail}: ${params.code}`,
    },
  };
}
