export type SocialLinkUrls = {
  tiktok: string | null;
  instagram: string | null;
  youtube: string | null;
};

export function parseSocialLinksJson(raw: string | null | undefined): SocialLinkUrls {
  if (!raw) return { tiktok: null, instagram: null, youtube: null };
  try {
    const parsed = JSON.parse(raw) as {
      tiktok?: unknown;
      instagram?: unknown;
      youtube?: unknown;
    };
    return {
      tiktok: typeof parsed.tiktok === 'string' ? parsed.tiktok : null,
      instagram: typeof parsed.instagram === 'string' ? parsed.instagram : null,
      youtube: typeof parsed.youtube === 'string' ? parsed.youtube : null,
    };
  } catch {
    return { tiktok: null, instagram: null, youtube: null };
  }
}

export function normalizeStreamingUrl(raw: string | null | undefined): string | null {
  const t = (raw || '').trim().replace(/\/+$/, '');
  return t ? t.toLowerCase() : null;
}

/** TikTok or YouTube is required for admin stream verification. Instagram is optional. */
export function hasRequiredStreamingChannel(links: {
  tiktok?: string | null;
  youtube?: string | null;
}): boolean {
  return Boolean(
    normalizeStreamingUrl(links.tiktok) || normalizeStreamingUrl(links.youtube),
  );
}

export function streamingChannelFingerprint(links: {
  tiktok?: string | null;
  youtube?: string | null;
}): string {
  return `${normalizeStreamingUrl(links.tiktok) || ''}|${normalizeStreamingUrl(links.youtube) || ''}`;
}

export function streamVerificationStatus(row: {
  streamVerifiedAt?: Date | string | null;
  streamLinksSubmittedAt?: Date | string | null;
  streamReviewNote?: string | null;
}): 'verified' | 'pending' | 'rejected' | 'none' {
  if (row.streamVerifiedAt) return 'verified';
  if (typeof row.streamReviewNote === 'string' && row.streamReviewNote.trim()) {
    return 'rejected';
  }
  if (row.streamLinksSubmittedAt) return 'pending';
  return 'none';
}
