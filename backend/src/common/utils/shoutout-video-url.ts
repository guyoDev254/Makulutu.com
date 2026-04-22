import { BadRequestException } from '@nestjs/common';

export const SHOUTOUT_VIDEO_URL_MAX = 500;

export function isAllowedShoutoutVideoHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (
    h === 'tiktok.com' ||
    h === 'www.tiktok.com' ||
    h === 'm.tiktok.com' ||
    h === 'vm.tiktok.com' ||
    h === 'vt.tiktok.com'
  )
    return true;
  if (h.endsWith('.tiktok.com')) return true;
  return false;
}

/**
 * TikTok embed iframe `src` from a canonical page URL (https).
 * Returns null if the path does not look like a video/photo post.
 */
export function computeShoutoutVideoEmbedUrl(pageUrl: string): string | null {
  let u: URL;
  try {
    u = new URL(pageUrl);
  } catch {
    return null;
  }
  const h = u.hostname.toLowerCase();
  if (!isAllowedShoutoutVideoHost(h)) return null;

  const video = u.pathname.match(/\/video\/(\d+)/);
  if (video) {
    const tik = new URL(`https://www.tiktok.com/player/v1/${video[1]}`);
    tik.searchParams.set('autoplay', '1');
    tik.searchParams.set('muted', '0');
    return tik.toString();
  }
  const photo = u.pathname.match(/\/photo\/(\d+)/);
  if (photo) {
    const tik = new URL(`https://www.tiktok.com/player/v1/${photo[1]}`);
    tik.searchParams.set('autoplay', '1');
    tik.searchParams.set('muted', '0');
    return tik.toString();
  }
  return null;
}

async function expandTikTokShortUrl(shortUrl: string): Promise<string> {
  try {
    const res = await fetch(shortUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    const final = (res.url || shortUrl).trim();
    if (!/^https:\/\//i.test(final)) {
      throw new Error('not https');
    }
    return final;
  } catch {
    throw new BadRequestException(
      'Could not open this TikTok short link. Paste the full tiktok.com/…/video/… link instead.',
    );
  }
}

/**
 * Validates HTTPS TikTok only, resolves vm/vt short links when possible,
 * and ensures we can build an embed URL. Returns stored page URL (max length capped).
 */
export async function normalizeShoutoutVideoPageUrl(raw: string): Promise<string> {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new BadRequestException('Video URL is empty');
  }
  if (trimmed.length > SHOUTOUT_VIDEO_URL_MAX) {
    throw new BadRequestException('Video URL is too long');
  }
  let u: URL;
  try {
    u = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
  } catch {
    throw new BadRequestException('Invalid video URL');
  }
  if (u.protocol !== 'https:') {
    throw new BadRequestException('Video URL must use HTTPS');
  }
  if (!isAllowedShoutoutVideoHost(u.hostname)) {
    throw new BadRequestException('Video link must be from TikTok only');
  }

  let pageUrl = u.toString();
  const h = u.hostname.toLowerCase();
  if (h === 'vm.tiktok.com' || h === 'vt.tiktok.com') {
    pageUrl = await expandTikTokShortUrl(pageUrl);
  }

  if (computeShoutoutVideoEmbedUrl(pageUrl) === null) {
    throw new BadRequestException(
      'Use a TikTok video link (…/video/…) or photo post (…/photo/…).',
    );
  }

  return pageUrl.slice(0, SHOUTOUT_VIDEO_URL_MAX);
}

/**
 * TikTok player URL for OBS from a stored clip URL (canonical or short link).
 * Same pipeline as checkout and admin test: expand vm/vt when needed, then build embed.
 */
export async function resolveShoutoutVideoEmbedUrlForObs(
  raw: string | null | undefined,
): Promise<string | null> {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  const direct = computeShoutoutVideoEmbedUrl(trimmed);
  if (direct) return direct;

  try {
    const page = await normalizeShoutoutVideoPageUrl(trimmed);
    return computeShoutoutVideoEmbedUrl(page);
  } catch {
    return null;
  }
}
