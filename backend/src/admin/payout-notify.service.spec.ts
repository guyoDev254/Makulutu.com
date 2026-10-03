import { buildPayoutNotifyCopy } from './payout-notify.service';

const payload = {
  amountKes: 1500,
  payoutChannel: 'M-Pesa 254712345678',
  payoutReference: 'ABC123',
  notes: 'Please resubmit with a mobile number',
  creator: {
    email: 'a@b.com',
    displayName: 'Ada',
    slug: 'ada',
  },
};

describe('buildPayoutNotifyCopy', () => {
  it('includes amount and workspace link for a requested payout', () => {
    const copy = buildPayoutNotifyCopy(
      'REQUESTED',
      payload,
      'https://makulutu.com/creator/workspace',
    );
    expect(copy.subject).toContain('KES 1500.00');
    expect(copy.text).toContain('https://makulutu.com/creator/workspace');
    expect(copy.whatsapp).toContain('254712345678');
    expect(copy.text).toContain('Paystack is sending');
  });

  it('includes the payout reference when marked paid', () => {
    const copy = buildPayoutNotifyCopy(
      'PAID',
      payload,
      'https://makulutu.com/creator/workspace',
    );
    expect(copy.text).toContain('ABC123');
    expect(copy.whatsapp).toContain('has been sent');
  });

  it('includes reviewer notes on rejection', () => {
    const copy = buildPayoutNotifyCopy(
      'REJECTED',
      payload,
      'https://makulutu.com/creator/workspace',
    );
    expect(copy.text).toContain('Please resubmit with a mobile number');
  });
});
