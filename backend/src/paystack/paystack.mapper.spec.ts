import {
  isPaystackChargePendingSuccess,
  mapChargeToStkResponse,
  mapVerifyToStatus,
  mapWebhookToPayload,
  toKesSubunits,
  toPaystackMpesaPhone,
  toPaystackMpesaAccountNumber,
  payoutTransferReference,
  payoutIdFromTransferReference,
  mapPaystackPayoutError,
  verifyPaystackSignature,
} from './paystack.mapper';

describe('paystack mapper', () => {
  it('converts KES to subunits', () => {
    expect(toKesSubunits(100)).toBe(10000);
    expect(toKesSubunits(1.5)).toBe(150);
  });

  it('formats Kenyan M-Pesa numbers for Paystack', () => {
    expect(toPaystackMpesaPhone('0712345678')).toBe('+254712345678');
    expect(toPaystackMpesaPhone('254712345678')).toBe('+254712345678');
    expect(toPaystackMpesaPhone('+254112345678')).toBe('+254112345678');
    expect(toPaystackMpesaAccountNumber('254712345678')).toBe('0712345678');
  });

  it('round-trips payout transfer references', () => {
    const id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const ref = payoutTransferReference(id);
    expect(ref).toBe('wda1b2c3d4e5f67890abcdef1234567890');
    expect(payoutIdFromTransferReference(ref)).toBe(id);
  });

  it('rewrites Paystack insufficient-balance errors for streamers', () => {
    expect(
      mapPaystackPayoutError('Your balance is not enough to fulfil this request'),
    ).toContain('platform Paystack balance');
  });

  it('treats Charge attempted as a successful STK start', () => {
    expect(
      isPaystackChargePendingSuccess({
        status: true,
        message: 'Charge attempted',
        data: { status: 'pay_offline', reference: 'r1' },
      }),
    ).toBe(true);
    expect(
      isPaystackChargePendingSuccess({
        status: false,
        message: 'Charge attempted',
        data: { status: 'pay_offline', reference: 'r1' },
      }),
    ).toBe(true);
    expect(
      isPaystackChargePendingSuccess({
        status: false,
        message: 'Charge attempted',
      }),
    ).toBe(true);
    expect(
      isPaystackChargePendingSuccess({
        status: false,
        message: 'Insufficient funds',
        data: { status: 'failed' },
      }),
    ).toBe(false);
  });

  it('maps a pay_offline charge to the STK response shape', () => {
    const mapped = mapChargeToStkResponse(
      { reference: 'pay_1', status: 'pay_offline', display_text: 'Check your phone' },
      'fallback',
    );
    expect(mapped.success).toBe('200');
    expect(mapped.transaction_request_id).toBe('pay_1');
    expect(mapped.massage).toContain('Check');
  });

  it('maps verify success/pending/failed without treating pending as failed', () => {
    expect(mapVerifyToStatus({ status: 'success', id: 9, reference: 'r', amount: 50000 }).TransactionCode).toBe('0');
    expect(mapVerifyToStatus({ status: 'pay_offline', reference: 'r' }).TransactionStatus).toBe('Pending');
    expect(mapVerifyToStatus({ status: 'ongoing', reference: 'r' }).TransactionCode).toBe('');
    expect(mapVerifyToStatus({ status: 'failed', reference: 'r' }).TransactionStatus).toBe('Failed');
  });

  it('maps charge.success webhooks onto the existing payment payload', () => {
    const payload = mapWebhookToPayload({
      event: 'charge.success',
      data: {
        id: 55,
        status: 'success',
        reference: 'abc',
        amount: 20000,
        gateway_response: 'Successful',
        metadata: { paymentId: 'payment-uuid', msisdn: '+254700000000' },
        authorization: { authorization_code: 'AUTH_1' },
      },
    });
    expect(payload?.ResponseCode).toBe(0);
    expect(payload?.TransactionReference).toBe('payment-uuid');
    expect(payload?.TransactionAmount).toBe(200);
    expect(payload?.TransactionReceipt).toBe('AUTH_1');
  });

  it('verifies Paystack SHA-512 signatures', () => {
    const body = '{"event":"charge.success"}';
    const secret = 'sk_test_example';
    const crypto = require('crypto') as typeof import('crypto');
    const sig = crypto.createHmac('sha512', secret).update(body).digest('hex');
    expect(verifyPaystackSignature(body, sig, secret)).toBe(true);
    expect(verifyPaystackSignature(body, 'deadbeef', secret)).toBe(false);
  });
});
