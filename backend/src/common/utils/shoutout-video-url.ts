import { BadRequestException } from '@nestjs/common';

export const SHOUTOUT_VIDEO_URL_MAX = 500;

/** Compact refs avoid putting https://…tiktok.com in JSON (Imunify360/ModSecurity often blocks those POSTs). */
const COMPACT_VIDEO = /^tkv:(\d{5,32})$/i;
const COMPACT_PHOTO = /^tkp:(\d{5,32})$/i;
const COMPACT_SHORT = /^tks:([A-Za-z0-9_-]{4,32})$/i;

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

export function expandCompactTikTokClipRef(raw: string): string | null {
  const trimmed = raw.trim();
  const video = COMPACT_VIDEO.exec(trimmed);
  if (video) return `https://www.tiktok.com/video/${video[1]}`;
  const photo = COMPACT_PHOTO.exec(trimmed);
  if (photo) return `https://www.tiktok.com/photo/${photo[1]}`;
  const short = COMPACT_SHORT.exec(trimmed);
  if (short) return `https://vm.tiktok.com/${short[1]}`;
  return null;
}

/** Encode a pasted TikTok URL for API JSON bodies. */
export function toCompactTikTokClipRef(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const already = expandCompactTikTokClipRef(trimmed);
  if (already) {
    const v = already.match(/\/video\/(\d+)/);
    if (v) return `tkv:${v[1]}`;
    const p = already.match(/\/photo\/(\d+)/);
    if (p) return `tkp:${p[1]}`;
    const s = already.match(/vm\.tiktok\.com\/([A-Za-z0-9_-]+)/i);
    if (s) return `tks:${s[1]}`;
  }
  let u: URL;
  try {
    u = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:') return null;
  if (!isAllowedShoutoutVideoHost(u.hostname)) return null;
  const video = u.pathname.match(/\/video\/(\d+)/);
  if (video) return `tkv:${video[1]}`;
  const photo = u.pathname.match(/\/photo\/(\d+)/);
  if (photo) return `tkp:${photo[1]}`;
  const host = u.hostname.toLowerCase();
  if (host === 'vm.tiktok.com' || host === 'vt.tiktok.com') {
    const code = u.pathname.replace(/\//g, '').trim();
    if (/^[A-Za-z0-9_-]{4,32}$/.test(code)) return `tks:${code}`;
  }
  return null;
}

/**
 * TikTok embed iframe `src` from a canonical page URL (https).
 * Returns null if the path does not look like a video/photo post.
 */
export function computeShoutoutVideoEmbedUrl(pageUrl: string): string | null {
  const expanded = expandCompactTikTokClipRef(pageUrl) || pageUrl;
  let u: URL;
  try {
    u = new URL(expanded);
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
  const fromCompact = expandCompactTikTokClipRef(trimmed);
  let pageUrl = fromCompact || trimmed;
  let u: URL;
  try {
    u = new URL(pageUrl.includes('://') ? pageUrl : `https://${pageUrl}`);
  } catch {
    throw new BadRequestException('Invalid video URL');
  }
  if (u.protocol !== 'https:') {
    throw new BadRequestException('Video URL must use HTTPS');
  }
  if (!isAllowedShoutoutVideoHost(u.hostname)) {
    throw new BadRequestException('Video link must be from TikTok only');
  }

  pageUrl = u.toString();
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
