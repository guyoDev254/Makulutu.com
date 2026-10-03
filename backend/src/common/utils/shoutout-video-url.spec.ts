import {
  computeShoutoutVideoEmbedUrl,
  expandCompactTikTokClipRef,
  toCompactTikTokClipRef,
} from './shoutout-video-url';

describe('compact TikTok clip refs', () => {
  it('encodes a video page without putting tiktok.com in the token', () => {
    expect(
      toCompactTikTokClipRef(
        'https://www.tiktok.com/@nairobi/video/7123456789012345678',
      ),
    ).toBe('tkv:7123456789012345678');
    expect(toCompactTikTokClipRef('tkv:7123456789012345678')).toBe(
      'tkv:7123456789012345678',
    );
  });

  it('round-trips to a player URL', () => {
    const page = expandCompactTikTokClipRef('tkv:7123456789012345678');
    expect(page).toBe('https://www.tiktok.com/video/7123456789012345678');
    expect(computeShoutoutVideoEmbedUrl(page!)).toContain(
      'tiktok.com/player/v1/7123456789012345678',
    );
  });
});
