/** JS weekday: 0 = Sunday, 3 = Wednesday */
export const PAYOUT_REMINDER_WEEKDAY = 3;

/** Hour (0–23) for the weekly reminder cron, UTC unless server TZ is set. */
export const PAYOUT_REMINDER_HOUR = 9;

/**
 * Next occurrence of Wednesday at `PAYOUT_REMINDER_HOUR` in the server's local timezone * (set `TZ` in production for a fixed zone). Used for dashboard copy only.
 */
export function nextWeeklyPayoutReminderDate(from: Date = new Date()): Date {
  const targetDow = PAYOUT_REMINDER_WEEKDAY;
  const hour = PAYOUT_REMINDER_HOUR;
  const candidate = new Date(from);
  candidate.setHours(hour, 0, 0, 0);
  const dow = candidate.getDay();
  let addDays = (targetDow - dow + 7) % 7;
  candidate.setDate(candidate.getDate() + addDays);
  if (candidate <= from) {
    candidate.setDate(candidate.getDate() + 7);
  }
  return candidate;
}

export function payoutProcessingScheduleMeta() {
  return {
    weekday: 'Wednesday',
    hourLocal: PAYOUT_REMINDER_HOUR,
    summary:
      'Creator payouts are reviewed on a weekly rhythm: super admins process bank/M-Pesa payouts every Wednesday after approving requests in the Payouts tab.',
  };
}
