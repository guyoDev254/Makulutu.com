/**
 * API origin only — no axios. Safe to import from any Client Component without pulling axios into SSR chunks.
 */
function resolveApiBaseUrl(): string {
  const raw =
    (process.env.NEXT_PUBLIC_API_URL || '').trim() ||
    (process.env.NODE_ENV === 'production'
      ? ''
      : 'http://localhost:2000');
  if (!raw && process.env.NODE_ENV === 'production') {
    console.warn(
      '[api-origin] NEXT_PUBLIC_API_URL is not set; API calls may fail until you configure it.',
    );
  }
  return enforceHttpsIfPageIsSecure(raw.replace(/\/+$/, ''));
}

/** HTTPS pages cannot call http:// APIs (browser mixed-content block). */
function enforceHttpsIfPageIsSecure(origin: string): string {
  if (!origin.startsWith('http://')) return origin;
  const onHttpsPage =
    typeof window !== 'undefined' && window.location.protocol === 'https:';
  if (!onHttpsPage) return origin;
  try {
    const u = new URL(origin);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return origin;
    u.protocol = 'https:';
    return u.origin;
  } catch {
    return origin;
  }
}

export const API_BASE_URL = resolveApiBaseUrl();

function looksLikeWafBlock(text: string): boolean {
  return /imunify360|bot-protection|whitelisted/i.test(text) || /<\s*html/i.test(text);
}

function extractApiMessage(body: unknown): string | null {
  if (typeof body === 'string') {
    const t = body.trim();
    if (!t) return null;
    const imunify = t.match(/Access denied by Imunify360[^.]*\./i);
    if (imunify) return imunify[0];
    if (t.startsWith('{')) {
      try {
        return extractApiMessage(JSON.parse(t));
      } catch {
        return t.slice(0, 280);
      }
    }
    return t.slice(0, 280);
  }
  if (!body || typeof body !== 'object') return null;
  const m = (body as { message?: unknown }).message;
  if (typeof m === 'string' && m.trim()) return m.trim();
  if (Array.isArray(m) && m.length) return m.map(String).join(' ');
  const details = (body as { details?: { message?: unknown } }).details;
  if (details && typeof details === 'object' && details !== null) {
    const dm = details.message;
    if (typeof dm === 'string' && dm.trim()) return dm.trim();
    if (Array.isArray(dm) && dm.length) return dm.map(String).join(' ');
  }
  return null;
}

/** Nest `message` is often a string; validation errors may return a string array. */
export function formatApiErrorMessage(
  body: unknown,
  fallback = 'Please try again in a moment.',
): string {
  const raw = extractApiMessage(body);
  if (!raw) return fallback;
  if (looksLikeWafBlock(raw)) {
    return 'The payment request was blocked. Paste the TikTok clip again and retry — if it still fails, try without the clip URL.';
  }
  return raw;
}

export function apiNetworkErrorHint(): string {
  if (!API_BASE_URL) {
    return 'NEXT_PUBLIC_API_URL is not set. Add it to frontend/.env (see .env.production for production).';
  }
  const local =
    API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1');
  if (local) {
    return `Cannot reach ${API_BASE_URL}. Start the API (e.g. backend on port 2000) and check NEXT_PUBLIC_API_URL in frontend/.env.`;
  }
  return `Cannot reach ${API_BASE_URL}. On Vercel, set NEXT_PUBLIC_API_URL to your API origin. On the API, add this site's origin to CORS_ORIGINS (comma-separated).`;
}

/** `fetch` failures (offline, CORS, wrong host) — not HTTP 4xx/5xx. */
export function isFetchNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  if (!(error instanceof TypeError)) return false;
  const msg = String((error as Error).message ?? '');
  return (
    msg === 'Failed to fetch' ||
    msg === 'Load failed' ||
    msg.includes('NetworkError when attempting to fetch')
  );
}
