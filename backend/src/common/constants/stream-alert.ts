export const STREAM_ALERT_PLATFORMS = [
  'tiktok',
  'youtube',
  'facebook',
  'x',
  'twitch',
  'other',
] as const;

export type StreamAlertPlatform = (typeof STREAM_ALERT_PLATFORMS)[number];

export const STREAM_ALERT_PLATFORM_SET = new Set<string>(STREAM_ALERT_PLATFORMS);

export const MIN_STREAM_ALERT_KES = 10;

export const MAX_STREAM_ALERT_MESSAGE_LENGTH = 100;
