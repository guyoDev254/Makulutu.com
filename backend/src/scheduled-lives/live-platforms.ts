export const LIVE_PLATFORMS = [
  'tiktok',
  'youtube',
  'instagram',
  'facebook',
  'twitch',
  'kick',
  'x',
  'other',
] as const;

export type LivePlatform = (typeof LIVE_PLATFORMS)[number];

const LABELS: Record<LivePlatform, string> = {
  tiktok: 'TikTok',
  youtube: 'YouTube',
  instagram: 'Instagram',
  facebook: 'Facebook',
  twitch: 'Twitch',
  kick: 'Kick',
  x: 'X',
  other: 'Other',
};

export function isLivePlatform(value: string): value is LivePlatform {
  return (LIVE_PLATFORMS as readonly string[]).includes(value);
}

export function livePlatformLabel(platform: string): string {
  return isLivePlatform(platform) ? LABELS[platform] : platform;
}
