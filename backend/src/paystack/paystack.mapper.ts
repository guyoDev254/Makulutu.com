import * as crypto from 'crypto';
import {
  PaystackChargeData,
  PaystackTransactionData,
  PaystackWebhookBody,
  STKPushResponse,
  TransactionStatusResponse,
  WebhookPayload,
} from './paystack.types';

/** KES is charged in subunits (cents). */
export function toKesSubunits(amountKes: number): number {
  const kes = Number(amountKes);
  if (!Number.isFinite(kes) || kes <= 0) {
    throw new Error('Amount must be a positive number of KES');
  }
  return Math.round(kes * 100);
}

/** Paystack Kenya M-Pesa expects E.164, e.g. +2547xxxxxxxx. */
export function toPaystackMpesaPhone(msisdn: string): string {
  let cleaned = msisdn.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = `254${cleaned.slice(1)}`;
  } else if (!cleaned.startsWith('254')) {
    cleaned = `254${cleaned}`;
  }
  if (!/^254[17]\d{8}$/.test(cleaned)) {
    throw new Error('Enter a valid Kenyan M-Pesa number');
  }
  return `+${cleaned}`;
}

/** Paystack Kenya M-Pesa recipient `account_number` uses local 07xxxxxxxx. */
export function toPaystackMpesaAccountNumber(msisdn: string): string {
  const e164 = toPaystackMpesaPhone(msisdn);
  return `0${e164.replace(/\D/g, '').slice(3)}`;
}

export function payoutTransferReference(payoutId: string): string {
  return `wd${payoutId.replace(/-/g, '')}`;
}

export function payoutIdFromTransferReference(reference?: string | null): string | null {
  const raw = String(reference || '').trim();
  const m = /^wd([0-9a-f]{32})$/i.exec(raw);
  if (!m) return null;
  const h = m[1].toLowerCase();
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Maps Paystack transfer API errors to copy a streamer can understand. */
export function mapPaystackPayoutError(raw: string): string {
  const msg = String(raw || '').toLowerCase();
  if (
    msg.includes('balance is not enough') ||
    msg.includes('insufficient balance') ||
    msg.includes('not enough to fulfil')
  ) {
    return 'Payout could not be sent because the platform Paystack balance is too low. Try again after the balance is topped up.';
  }
  if (msg.includes('otp')) {
    return 'Paystack transfer OTP is enabled. Disable transfer OTP in the Paystack dashboard so streamer payouts can send automatically.';
  }
  return raw?.trim() || 'Failed to send payout via Paystack';
}

export function chargeEmailForMsisdn(msisdn: string): string {
  const digits = msisdn.replace(/\D/g, '');
  return `fan.${digits}@pay.makulutu.com`;
}

export function isPaystackChargePendingSuccess(body: {
  status?: boolean | string;
  message?: string;
  data?: PaystackChargeData | null;
} | null | undefined): boolean {
  if (!body) return false;
  const dataStatus = String(body.data?.status || '').toLowerCase();
  if (dataStatus === 'failed') return false;
  if (
    dataStatus === 'pay_offline' ||
    dataStatus === 'pending' ||
    dataStatus === 'send_otp' ||
    dataStatus === 'ongoing' ||
    dataStatus === 'open_url'
  ) {
    return true;
  }
  const msg = String(body.message || '').toLowerCase();
  if (msg.includes('charge attempted')) return true;
  return body.status === true;
}

export function mapChargeToStkResponse(
  data: PaystackChargeData | undefined,
  fallbackReference: string,
): STKPushResponse {
  const reference = data?.reference || fallbackReference;
  if (!reference) {
    throw new Error('Paystack did not return a transaction reference');
  }
  const status = (data?.status || '').toLowerCase();
  if (status === 'failed') {
    throw new Error(data?.display_text || data?.message || 'M-Pesa charge failed');
  }
  return {
    success: '200',
    massage: data?.display_text || 'Please complete the prompt on your phone',
    transaction_request_id: reference,
  };
}

export function mapVerifyToStatus(
  data: PaystackTransactionData | undefined,
): TransactionStatusResponse {
  const status = (data?.status || '').toLowerCase();
  const reference = data?.reference || '';
  const amountKes = typeof data?.amount === 'number' ? data.amount / 100 : 0;
  const receipt =
    data?.receipt_number ||
    data?.authorization?.authorization_code ||
    '';
  const msisdn =
    (typeof data?.metadata?.msisdn === 'string' && data.metadata.msisdn) ||
    data?.customer?.phone ||
    '';

  const base: TransactionStatusResponse = {
    ResultCode: status,
    ResultDesc: data?.gateway_response || status || 'Unknown',
    TransactionID: data?.id != null ? String(data.id) : reference,
    TransactionStatus: 'Pending',
    TransactionCode: '',
    TransactionReceipt: receipt,
    TransactionAmount: String(amountKes),
    Msisdn: msisdn,
    TransactionDate: data?.paid_at || data?.created_at || '',
    TransactionReference: paymentIdFromTransaction(data) || reference,
  };

  if (status === 'success') {
    return {
      ...base,
      TransactionStatus: 'Completed',
      TransactionCode: '0',
      ResultCode: '0',
    };
  }

  if (status === 'failed' || status === 'abandoned' || status === 'reversed') {
    return {
      ...base,
      TransactionStatus: 'Failed',
      TransactionCode: '1',
    };
  }

  return base;
}

export function paymentIdFromTransaction(
  data: PaystackTransactionData | undefined,
): string | undefined {
  const metaId = data?.metadata?.paymentId;
  if (typeof metaId === 'string' && metaId.length > 0) {
    return metaId;
  }
  return data?.reference;
}

export function mapWebhookToPayload(body: PaystackWebhookBody): WebhookPayload | null {
  const data = body.data;
  if (!data) return null;
  const mapped = mapVerifyToStatus(data);
  const event = (body.event || '').toLowerCase();
  const failed =
    event === 'charge.failed' || mapped.TransactionStatus === 'Failed';
  const success =
    event === 'charge.success' || mapped.TransactionStatus === 'Completed';

  if (!success && !failed) {
    return null;
  }

  return {
    ResponseCode: success && !failed ? 0 : 1,
    ResponseDescription: mapped.ResultDesc,
    TransactionID: mapped.TransactionID,
    TransactionAmount: Number(mapped.TransactionAmount) || 0,
    TransactionReceipt: mapped.TransactionReceipt || undefined,
    TransactionDate: mapped.TransactionDate || undefined,
    TransactionReference: mapped.TransactionReference || undefined,
    Msisdn: mapped.Msisdn || undefined,
  };
}

export function verifyPaystackSignature(
  rawBody: Buffer | string,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature || !secret) return false;
  const payload = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf8');
  const hash = crypto.createHmac('sha512', secret).update(payload).digest('hex');
  const expected = Buffer.from(hash, 'utf8');
  const received = Buffer.from(signature, 'utf8');
  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
}
