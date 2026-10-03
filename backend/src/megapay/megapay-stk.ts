/** MegaPay STK initiate helpers. Official fields: api_key, email, amount, msisdn, reference. */

export type MegaPayStkBody = {
  success?: unknown;
  massage?: unknown;
  message?: unknown;
  error?: unknown;
  transaction_request_id?: unknown;
  ResponseDescription?: unknown;
  ResultDesc?: unknown;
};

export function isMegaPayStkAccepted(data: MegaPayStkBody | null | undefined): boolean {
  if (!data || typeof data !== 'object') return false;
  const success = data.success;
  if (success === 200 || success === '200' || success === true) return true;
  const id = String(data.transaction_request_id ?? '').trim();
  return id.length > 0 && String(success ?? '') !== '400';
}

export function megaPayStkErrorMessage(
  data: MegaPayStkBody | null | undefined,
  fallback = 'Failed to initiate STK Push',
): string {
  if (!data || typeof data !== 'object') return fallback;
  const candidates = [
    data.massage,
    data.message,
    data.error,
    data.ResponseDescription,
    data.ResultDesc,
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      const text = value.trim();
      if (isHostWafBlockMessage(text)) {
        return MEGAPAY_WAF_USER_MESSAGE;
      }
      return text;
    }
  }
  if (typeof data.success === 'string' && data.success !== '200') {
    return `MegaPay rejected STK (${data.success})`;
  }
  return fallback;
}

export const MEGAPAY_WAF_USER_MESSAGE =
  'M-Pesa is briefly unavailable. Please try again in a moment.';

export function isHostWafBlockMessage(text: string): boolean {
  return /imunify360|bot-protection|IPs used for automation/i.test(text);
}

/** MegaPay samples use short alphanumeric refs; hyphens in UUIDs are often rejected. */
export function megaPayReferenceFromPaymentId(paymentId: string): string {
  return paymentId.replace(/-/g, '');
}

export function paymentIdFromMegaPayReference(value: string): string | null {
  const raw = value.trim();
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)
  ) {
    return raw.toLowerCase();
  }
  const hex = raw.replace(/-/g, '');
  if (!/^[0-9a-f]{32}$/i.test(hex)) return null;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`.toLowerCase();
}
