import {
  hasRequiredStreamingChannel,
  streamingChannelFingerprint,
  streamVerificationStatus,
} from './streaming-channel-urls';

describe('streaming channel urls', () => {
  it('requires TikTok or YouTube', () => {
    expect(hasRequiredStreamingChannel({ tiktok: null, youtube: null })).toBe(
      false,
    );
    expect(
      hasRequiredStreamingChannel({ tiktok: 'https://tiktok.com/@a', youtube: null }),
    ).toBe(true);
    expect(
      hasRequiredStreamingChannel({ tiktok: '', youtube: 'https://youtube.com/@a' }),
    ).toBe(true);
  });

  it('treats trailing slashes as the same channel', () => {
    expect(
      streamingChannelFingerprint({ tiktok: 'https://TikTok.com/@a/', youtube: null }),
    ).toBe(
      streamingChannelFingerprint({ tiktok: 'https://tiktok.com/@a', youtube: null }),
    );
  });

  it('maps verification status', () => {
    expect(streamVerificationStatus({})).toBe('none');
    expect(
      streamVerificationStatus({ streamLinksSubmittedAt: new Date() }),
    ).toBe('pending');
    expect(
      streamVerificationStatus({
        streamLinksSubmittedAt: new Date(),
        streamReviewNote: 'Could not confirm this channel.',
      }),
    ).toBe('rejected');
    expect(streamVerificationStatus({ streamVerifiedAt: new Date() })).toBe(
      'verified',
    );
  });
});
