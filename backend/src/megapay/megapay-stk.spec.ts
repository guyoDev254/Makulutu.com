import {
  isMegaPayStkAccepted,
  megaPayReferenceFromPaymentId,
  megaPayStkErrorMessage,
  MEGAPAY_WAF_USER_MESSAGE,
  paymentIdFromMegaPayReference,
} from './megapay-stk';

describe('isMegaPayStkAccepted', () => {
  it('accepts documented string success', () => {
    expect(
      isMegaPayStkAccepted({
        success: '200',
        transaction_request_id: 'SOFTPID1',
      }),
    ).toBe(true);
  });

  it('accepts numeric success', () => {
    expect(
      isMegaPayStkAccepted({
        success: 200,
        transaction_request_id: 'SOFTPID1',
      }),
    ).toBe(true);
  });

  it('rejects empty failure bodies', () => {
    expect(isMegaPayStkAccepted({})).toBe(false);
    expect(isMegaPayStkAccepted({ success: '400' })).toBe(false);
  });
});

describe('megaPayStkErrorMessage', () => {
  it('prefers MegaPay massage typo field', () => {
    expect(
      megaPayStkErrorMessage({ massage: 'Invalid API Key or email' }),
    ).toBe('Invalid API Key or email');
  });

  it('does not surface Imunify360 WAF text to fans', () => {
    expect(
      megaPayStkErrorMessage({
        message:
          'Access denied by Imunify360 bot-protection. IPs used for automation should be whitelisted',
      }),
    ).toBe(MEGAPAY_WAF_USER_MESSAGE);
  });
});

describe('megaPay reference', () => {
  const id = '309a49d9-4b42-43a8-9eda-c5e223d8d5c6';

  it('strips hyphens for MegaPay and restores the payment id', () => {
    const ref = megaPayReferenceFromPaymentId(id);
    expect(ref).toBe('309a49d94b4243a89edac5e223d8d5c6');
    expect(paymentIdFromMegaPayReference(ref)).toBe(id);
    expect(paymentIdFromMegaPayReference(id)).toBe(id);
    expect(
      paymentIdFromMegaPayReference('b356d7879e04420b8a8e3a47c47daeef'),
    ).toBe('b356d787-9e04-420b-8a8e-3a47c47daeef');
  });
});
