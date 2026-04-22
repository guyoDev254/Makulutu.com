import type { PrismaClient } from '@prisma/client';

/** Stored on `Creator.workspaceSettings` — only defined keys override global platform settings. */
export type CreatorWorkspaceSettingsStored = {
  defaultMonthlyPrice?: number;
  shoutoutMinKes?: number;
  shoutoutMinKesWithVideo?: number;
  shoutoutMaxKes?: number;
  coachingAccountReviewKes?: number;
  obsAlertSecsNew?: number;
  obsAlertSecsRenewal?: number;
  obsAlertSecsShoutout?: number;
  obsAlertSecsShoutoutVideo?: number;
  supportCatalogOrder?: string[];
  supportTierMembershipTitle?: string;
  supportTierMembershipDescription?: string;
  supportTierShoutoutTitle?: string;
  supportTierShoutoutDescription?: string;
  obsSubscriptionMessageTemplate?: string;
  obsShoutoutMessageTemplate?: string;
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function readFiniteInt(
  raw: Record<string, unknown>,
  key: string,
): number | undefined {
  const v = raw[key];
  if (v == null || v === '') return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return Math.round(n);
}

export function parseCreatorWorkspaceSettings(
  raw: unknown,
): CreatorWorkspaceSettingsStored {
  if (raw == null) return {};
  if (!isRecord(raw)) return {};
  const out: CreatorWorkspaceSettingsStored = {};

  const n = readFiniteInt(raw, 'defaultMonthlyPrice');
  if (n !== undefined && n >= 1) out.defaultMonthlyPrice = n;

  for (const key of [
    'shoutoutMinKes',
    'shoutoutMinKesWithVideo',
    'shoutoutMaxKes',
    'coachingAccountReviewKes',
    'obsAlertSecsNew',
    'obsAlertSecsRenewal',
    'obsAlertSecsShoutout',
    'obsAlertSecsShoutoutVideo',
  ] as const) {
    const v = readFiniteInt(raw, key);
    if (v !== undefined) out[key] = v;
  }

  if (Array.isArray(raw.supportCatalogOrder)) {
    const arr = raw.supportCatalogOrder.filter(
      (x): x is string => typeof x === 'string',
    );
    if (arr.length) out.supportCatalogOrder = arr;
  }

  for (const key of [
    'supportTierMembershipTitle',
    'supportTierMembershipDescription',
    'supportTierShoutoutTitle',
    'supportTierShoutoutDescription',
    'obsSubscriptionMessageTemplate',
    'obsShoutoutMessageTemplate',
  ] as const) {
    if (typeof raw[key] === 'string') out[key] = raw[key];
  }

  return out;
}

export async function fetchCreatorWorkspacePatch(
  prisma: PrismaClient,
  creatorId: string,
): Promise<CreatorWorkspaceSettingsStored> {
  const row = await prisma.creator.findUnique({
    where: { id: creatorId },
    select: { workspaceSettings: true },
  });
  return parseCreatorWorkspaceSettings(row?.workspaceSettings ?? null);
}

export function mergeWorkspaceShoutout(
  base: { minKes: number; minKesWithVideo: number; maxKes: number },
  patch: CreatorWorkspaceSettingsStored,
): { minKes: number; minKesWithVideo: number; maxKes: number } {
  let minKes = base.minKes;
  let minKesWithVideo = base.minKesWithVideo;
  let maxKes = base.maxKes;

  if (patch.shoutoutMinKes != null && Number.isFinite(patch.shoutoutMinKes)) {
    const v = Math.round(Number(patch.shoutoutMinKes));
    if (v >= 1) minKes = v;
  }
  if (
    patch.shoutoutMinKesWithVideo != null &&
    Number.isFinite(patch.shoutoutMinKesWithVideo)
  ) {
    const v = Math.round(Number(patch.shoutoutMinKesWithVideo));
    if (v >= 1) minKesWithVideo = v;
  }
  if (patch.shoutoutMaxKes != null && Number.isFinite(patch.shoutoutMaxKes)) {
    const v = Math.round(Number(patch.shoutoutMaxKes));
    if (v >= 1) maxKes = v;
  }

  if (minKesWithVideo < minKes) minKesWithVideo = minKes;
  if (maxKes < minKesWithVideo) maxKes = minKesWithVideo;

  return { minKes, minKesWithVideo, maxKes };
}

export function mergeWorkspaceObsSecs(
  base: {
    newSecs: number;
    renewalSecs: number;
    shoutoutSecs: number;
    shoutoutVideoSecs: number;
  },
  patch: CreatorWorkspaceSettingsStored,
  minSec: number,
  maxSec: number,
): {
  newSecs: number;
  renewalSecs: number;
  shoutoutSecs: number;
  shoutoutVideoSecs: number;
} {
  const clamp = (n: number | undefined, fb: number) => {
    if (n == null || !Number.isFinite(n)) return fb;
    const r = Math.round(Number(n));
    if (r < minSec) return minSec;
    if (r > maxSec) return maxSec;
    return r;
  };

  return {
    newSecs: clamp(patch.obsAlertSecsNew, base.newSecs),
    renewalSecs: clamp(patch.obsAlertSecsRenewal, base.renewalSecs),
    shoutoutSecs: clamp(patch.obsAlertSecsShoutout, base.shoutoutSecs),
    shoutoutVideoSecs: clamp(
      patch.obsAlertSecsShoutoutVideo,
      base.shoutoutVideoSecs,
    ),
  };
}

export function mergeWorkspaceMonthlyPrice(
  globalPrice: number,
  patch: CreatorWorkspaceSettingsStored,
): number {
  if (
    patch.defaultMonthlyPrice == null ||
    !Number.isFinite(patch.defaultMonthlyPrice)
  ) {
    return globalPrice;
  }
  const v = Math.round(Number(patch.defaultMonthlyPrice));
  if (v < 1) return globalPrice;
  return v;
}

const MAX_COACHING_KES = 10_000_000;

export function mergeWorkspaceCoachingKes(
  globalKes: number,
  patch: CreatorWorkspaceSettingsStored,
): number {
  if (
    patch.coachingAccountReviewKes == null ||
    !Number.isFinite(patch.coachingAccountReviewKes)
  ) {
    return globalKes;
  }
  const v = Math.round(Number(patch.coachingAccountReviewKes));
  if (v < 1 || v > MAX_COACHING_KES) return globalKes;
  return v;
}
