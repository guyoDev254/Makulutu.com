import type { PrismaClient } from '@prisma/client';
import {
  fetchCreatorWorkspacePatch,
  mergeWorkspaceCoachingKes,
} from './creator-workspace-settings';

/** Settings key — Admin → Settings; used for paid account review / bundle checkout. */
export const COACHING_ACCOUNT_REVIEW_KES_KEY = 'coaching_account_review_kes';

export const COACHING_ACCOUNT_REVIEW_KES_DEFAULT = 100;

const MAX_KES = 10_000_000;

function parsePositiveInt(raw: string | null | undefined, fallback: number): number {
  if (raw == null || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  const r = Math.round(n);
  if (r < 1) return fallback;
  return Math.min(r, MAX_KES);
}

/** M-Pesa amount (KES) for account review + “both” coaching checkout. */
export async function resolveCoachingAccountReviewKes(
  prisma: PrismaClient,
  creatorId?: string | null,
): Promise<number> {
  const row = await prisma.settings.findUnique({
    where: { key: COACHING_ACCOUNT_REVIEW_KES_KEY },
  });
  const base = parsePositiveInt(
    row?.value ?? null,
    COACHING_ACCOUNT_REVIEW_KES_DEFAULT,
  );
  const cid = creatorId?.trim();
  if (!cid) return base;
  const patch = await fetchCreatorWorkspacePatch(prisma, cid);
  return mergeWorkspaceCoachingKes(base, patch);
}
