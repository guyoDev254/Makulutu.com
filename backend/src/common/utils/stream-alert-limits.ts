import type { PrismaClient } from '@prisma/client';
import {
  fetchCreatorWorkspacePatch,
  mergeWorkspaceShoutout,
} from './creator-workspace-settings';

/** Settings row keys (see Admin → Settings). */
export const SHOUTOUT_MIN_KES_KEY = 'shoutout_min_kes';
export const SHOUTOUT_MIN_KES_WITH_VIDEO_KEY = 'shoutout_min_kes_with_video';
export const SHOUTOUT_MAX_KES_KEY = 'shoutout_max_kes';

export const SHOUTOUT_LIMIT_DEFAULTS = {
  minKes: 10,
  minKesWithVideo: 50,
  maxKes: 500_000,
} as const;

function parsePositiveInt(raw: string | null | undefined, fallback: number): number {
  if (raw == null || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  const r = Math.round(n);
  if (r < 1) return fallback;
  return r;
}

/**
 * Resolved shoutout checkout limits (M-Pesa amounts in KES).
 * Enforces ordering: minKes ≤ minKesWithVideo ≤ maxKes.
 */
export async function resolveShoutoutLimits(
  prisma: PrismaClient,
  creatorId?: string | null,
): Promise<{
  minKes: number;
  minKesWithVideo: number;
  maxKes: number;
}> {
  const keys = [
    SHOUTOUT_MIN_KES_KEY,
    SHOUTOUT_MIN_KES_WITH_VIDEO_KEY,
    SHOUTOUT_MAX_KES_KEY,
  ] as const;
  const rows = await prisma.settings.findMany({
    where: { key: { in: [...keys] } },
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));

  let minKes = parsePositiveInt(
    map.get(SHOUTOUT_MIN_KES_KEY) ?? null,
    SHOUTOUT_LIMIT_DEFAULTS.minKes,
  );
  let minKesWithVideo = parsePositiveInt(
    map.get(SHOUTOUT_MIN_KES_WITH_VIDEO_KEY) ?? null,
    SHOUTOUT_LIMIT_DEFAULTS.minKesWithVideo,
  );
  let maxKes = parsePositiveInt(
    map.get(SHOUTOUT_MAX_KES_KEY) ?? null,
    SHOUTOUT_LIMIT_DEFAULTS.maxKes,
  );

  if (minKesWithVideo < minKes) {
    minKesWithVideo = minKes;
  }
  if (maxKes < minKesWithVideo) {
    maxKes = minKesWithVideo;
  }

  const base = { minKes, minKesWithVideo, maxKes };
  const cid = creatorId?.trim();
  if (!cid) return base;

  const patch = await fetchCreatorWorkspacePatch(prisma, cid);
  return mergeWorkspaceShoutout(base, patch);
}
