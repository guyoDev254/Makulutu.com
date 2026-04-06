/**
 * API origin only — no axios. Safe to import from any Client Component without pulling axios into SSR chunks.
 */
function resolveApiBaseUrl(): string {
  const raw =
    (process.env.NEXT_PUBLIC_API_URL || '').trim() ||
    (process.env.NODE_ENV === 'production'
      ? 'https://mohagamer.northernbox.org'
      : 'http://localhost:2000');
  return raw.replace(/\/+$/, '');
}

export const API_BASE_URL = resolveApiBaseUrl();

/** Nest `message` is often a string; validation errors may return a string array. */
export function formatApiErrorMessage(
  body: unknown,
  fallback = 'Please try again in a moment.',
): string {
  if (!body || typeof body !== 'object') return fallback;
  const m = (body as { message?: unknown }).message;
  if (typeof m === 'string' && m.trim()) return m;
  if (Array.isArray(m) && m.length) return m.map(String).join(' ');
  return fallback;
}

export function apiNetworkErrorHint(): string {
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
