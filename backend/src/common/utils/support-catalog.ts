import { PrismaService } from '../../prisma/prisma.service';
import { resolveShoutoutLimits } from './stream-alert-limits';
import {
  fetchCreatorWorkspacePatch,
  mergeWorkspaceMonthlyPrice,
} from './creator-workspace-settings';
import {
  SUPPORT_CATALOG_ORDER_KEY,
  SUPPORT_TIER_MEMBERSHIP_DESC_KEY,
  SUPPORT_TIER_MEMBERSHIP_TITLE_KEY,
  SUPPORT_TIER_SHOUTOUT_DESC_KEY,
  SUPPORT_TIER_SHOUTOUT_TITLE_KEY,
} from '../constants/support-catalog';

export const DEFAULT_SUPPORT_TIER_MEMBERSHIP_TITLE = 'Member subscription';
export const DEFAULT_SUPPORT_TIER_MEMBERSHIP_DESC =
  'Member streams and replays, tutorials, plus WhatsApp access (invite after payment).';
export const DEFAULT_SUPPORT_TIER_SHOUTOUT_TITLE = 'Live shoutout';
export const DEFAULT_SUPPORT_TIER_SHOUTOUT_DESC =
  'One-time payment (not a subscription). A TikTok clip URL requires the higher minimum amount shown at checkout.';

export type SupportCatalogMembershipItem = {
  kind: 'membership';
  id: 'membership';
  title: string;
  description: string | null;
  monthlyPriceKes: number;
};

export type SupportCatalogShoutoutItem = {
  kind: 'shoutout';
  id: 'shoutout';
  title: string;
  description: string | null;
  limits: { minKes: number; minKesWithVideo: number; maxKes: number };
};

export type SupportCatalogRewardItem = {
  kind: 'reward';
  id: string;
  name: string;
  description: string | null;
  amountKes: number;
  alertBannerLabel: string;
  allowSupporterMessage: boolean;
  allowVideoClip: boolean;
  maxMessageLength: number;
  /** #rrggbb or null — subscribe page card accent */
  accentColor: string | null;
};

export type SupportCatalogItem =
  | SupportCatalogMembershipItem
  | SupportCatalogShoutoutItem
  | SupportCatalogRewardItem;

export async function getSettingsString(
  prisma: PrismaService,
  key: string,
): Promise<string | null> {
  const r = await prisma.settings.findUnique({ where: { key } });
  const v = r?.value?.trim();
  return v && v.length > 0 ? v : null;
}

export function parseSupportCatalogOrderJson(
  raw: string | null | undefined,
): string[] | null {
  if (raw == null || !String(raw).trim()) return null;
  try {
    const j = JSON.parse(String(raw)) as unknown;
    if (!Array.isArray(j)) return null;
    const out = j
      .filter((x): x is string => typeof x === 'string')
      .map((x) => x.trim())
      .filter(Boolean);
    return out.length ? out : null;
  } catch {
    return null;
  }
}

function isUuidToken(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    s,
  );
}

/**
 * Membership and live shoutout are always first (in that order), then admin order
 * (excluding those tokens) plus any active reward ids not listed yet.
 */
export function mergeSupportCatalogOrder(
  saved: string[] | null,
  rewardIdsSorted: string[],
): string[] {
  const core = ['membership', 'shoutout'] as const;
  const tail = (saved ?? []).filter(
    (t) => t !== 'membership' && t !== 'shoutout',
  );
  const seen = new Set<string>();
  const base: string[] = [];
  for (const t of tail) {
    if (seen.has(t)) continue;
    seen.add(t);
    base.push(t);
  }
  for (const id of rewardIdsSorted) {
    if (!seen.has(id)) {
      base.push(id);
      seen.add(id);
    }
  }
  return [...core, ...base];
}

export async function buildPublicSupportCatalog(
  prisma: PrismaService,
  scopedCreatorId?: string | null,
): Promise<{ items: SupportCatalogItem[] }> {
  const rewardScope =
    scopedCreatorId && scopedCreatorId.length > 0
      ? { creatorId: scopedCreatorId }
      : {};
  const scopedId =
    scopedCreatorId && scopedCreatorId.length > 0 ? scopedCreatorId : null;

  const [
    priceRow,
    shoutLimits,
    rewards,
    orderRaw,
    tMem,
    dMem,
    tSh,
    dSh,
    workspacePatch,
  ] = await Promise.all([
    prisma.settings.findUnique({ where: { key: 'default_monthly_price' } }),
    resolveShoutoutLimits(prisma, scopedId),
    prisma.creatorReward.findMany({
      where: { active: true, ...rewardScope },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        description: true,
        amountKes: true,
        alertBannerLabel: true,
        allowSupporterMessage: true,
        allowVideoClip: true,
        maxMessageLength: true,
        accentColor: true,
      },
    }),
    prisma.settings.findUnique({ where: { key: SUPPORT_CATALOG_ORDER_KEY } }),
    getSettingsString(prisma, SUPPORT_TIER_MEMBERSHIP_TITLE_KEY),
    getSettingsString(prisma, SUPPORT_TIER_MEMBERSHIP_DESC_KEY),
    getSettingsString(prisma, SUPPORT_TIER_SHOUTOUT_TITLE_KEY),
    getSettingsString(prisma, SUPPORT_TIER_SHOUTOUT_DESC_KEY),
    scopedId
      ? fetchCreatorWorkspacePatch(prisma, scopedId)
      : Promise.resolve({} as Awaited<
        ReturnType<typeof fetchCreatorWorkspacePatch>
      >),
  ]);

  const parsed = parseFloat(priceRow?.value ?? '1');
  let monthlyPriceKes =
    Number.isFinite(parsed) && parsed >= 1 ? Math.round(parsed) : 1;
  if (scopedId) {
    monthlyPriceKes = mergeWorkspaceMonthlyPrice(
      monthlyPriceKes,
      workspacePatch,
    );
  }

  const rewardIdsSorted = rewards.map((r) => r.id);
  const allowedTokens = new Set<string>([
    'membership',
    'shoutout',
    ...rewardIdsSorted,
  ]);

  let savedOrder = parseSupportCatalogOrderJson(orderRaw?.value ?? null);
  if (scopedId) {
    savedOrder =
      savedOrder?.filter((t) => allowedTokens.has(t)) ?? null;
    const po = workspacePatch.supportCatalogOrder;
    if (po?.length) {
      const cleaned = po.filter((t) => allowedTokens.has(t));
      if (cleaned.length) savedOrder = cleaned;
    }
  }

  const order = mergeSupportCatalogOrder(savedOrder, rewardIdsSorted);

  const titleMem =
    scopedId && workspacePatch.supportTierMembershipTitle?.trim()
      ? workspacePatch.supportTierMembershipTitle.trim()
      : tMem;
  const descMem =
    scopedId && workspacePatch.supportTierMembershipDescription?.trim()
      ? workspacePatch.supportTierMembershipDescription.trim()
      : dMem;
  const titleSh =
    scopedId && workspacePatch.supportTierShoutoutTitle?.trim()
      ? workspacePatch.supportTierShoutoutTitle.trim()
      : tSh;
  const descSh =
    scopedId && workspacePatch.supportTierShoutoutDescription?.trim()
      ? workspacePatch.supportTierShoutoutDescription.trim()
      : dSh;

  const rewardById = new Map(rewards.map((r) => [r.id, r]));

  const items: SupportCatalogItem[] = [];
  for (const token of order) {
    if (token === 'membership') {
      items.push({
        kind: 'membership',
        id: 'membership',
        title: titleMem || DEFAULT_SUPPORT_TIER_MEMBERSHIP_TITLE,
        description: descMem || DEFAULT_SUPPORT_TIER_MEMBERSHIP_DESC,
        monthlyPriceKes,
      });
      continue;
    }
    if (token === 'shoutout') {
      items.push({
        kind: 'shoutout',
        id: 'shoutout',
        title: titleSh || DEFAULT_SUPPORT_TIER_SHOUTOUT_TITLE,
        description: descSh || DEFAULT_SUPPORT_TIER_SHOUTOUT_DESC,
        limits: {
          minKes: shoutLimits.minKes,
          minKesWithVideo: shoutLimits.minKesWithVideo,
          maxKes: shoutLimits.maxKes,
        },
      });
      continue;
    }
    if (isUuidToken(token)) {
      const r = rewardById.get(token);
      if (!r) continue;
      items.push({
        kind: 'reward',
        id: r.id,
        name: r.name,
        description: r.description,
        amountKes: Number(r.amountKes),
        alertBannerLabel: r.alertBannerLabel,
        allowSupporterMessage: r.allowSupporterMessage,
        allowVideoClip: r.allowVideoClip,
        maxMessageLength: r.maxMessageLength,
        accentColor: r.accentColor,
      });
    }
  }

  if (items.length === 0) {
    items.push({
      kind: 'membership',
      id: 'membership',
      title: titleMem || DEFAULT_SUPPORT_TIER_MEMBERSHIP_TITLE,
      description: descMem || DEFAULT_SUPPORT_TIER_MEMBERSHIP_DESC,
      monthlyPriceKes,
    });
    items.push({
      kind: 'shoutout',
      id: 'shoutout',
      title: titleSh || DEFAULT_SUPPORT_TIER_SHOUTOUT_TITLE,
      description: descSh || DEFAULT_SUPPORT_TIER_SHOUTOUT_DESC,
      limits: {
        minKes: shoutLimits.minKes,
        minKesWithVideo: shoutLimits.minKesWithVideo,
        maxKes: shoutLimits.maxKes,
      },
    });
  }

  return { items };
}
