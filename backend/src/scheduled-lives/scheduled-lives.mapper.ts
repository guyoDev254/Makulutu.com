import { ScheduledLive, ScheduledLiveStatus } from '@prisma/client';
import { livePlatformLabel } from './live-platforms';

const GRACE_MS = 4 * 60 * 60 * 1000;

export type PublicLiveDto = {
  id: string;
  title: string;
  description: string | null;
  platform: string;
  platformLabel: string;
  startsAt: string;
  endsAt: string | null;
  streamUrl: string | null;
  status: 'scheduled' | 'live';
};

export function effectiveLiveStatus(
  row: Pick<ScheduledLive, 'status' | 'startsAt' | 'endsAt'>,
  now = new Date(),
): ScheduledLiveStatus {
  if (
    row.status === ScheduledLiveStatus.CANCELLED ||
    row.status === ScheduledLiveStatus.ENDED
  ) {
    return row.status;
  }
  if (row.endsAt && row.endsAt.getTime() <= now.getTime()) {
    return ScheduledLiveStatus.ENDED;
  }
  if (
    row.status === ScheduledLiveStatus.LIVE ||
    row.startsAt.getTime() <= now.getTime()
  ) {
    return ScheduledLiveStatus.LIVE;
  }
  return ScheduledLiveStatus.SCHEDULED;
}

export function isPublicUpcoming(
  row: Pick<ScheduledLive, 'status' | 'startsAt' | 'endsAt'>,
  now = new Date(),
): boolean {
  const status = effectiveLiveStatus(row, now);
  return (
    status === ScheduledLiveStatus.SCHEDULED ||
    status === ScheduledLiveStatus.LIVE
  );
}

/** Window used when listing creator lives that fans should still see. */
export function publicUpcomingWhere(now = new Date()) {
  const graceStart = new Date(now.getTime() - GRACE_MS);
  return {
    status: {
      in: [ScheduledLiveStatus.SCHEDULED, ScheduledLiveStatus.LIVE],
    },
    OR: [
      { endsAt: { gt: now } },
      { endsAt: null, startsAt: { gte: graceStart } },
    ],
  };
}

export function toPublicLive(
  row: ScheduledLive,
  now = new Date(),
): PublicLiveDto | null {
  const status = effectiveLiveStatus(row, now);
  if (
    status !== ScheduledLiveStatus.SCHEDULED &&
    status !== ScheduledLiveStatus.LIVE
  ) {
    return null;
  }
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    platform: row.platform,
    platformLabel: livePlatformLabel(row.platform),
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt ? row.endsAt.toISOString() : null,
    streamUrl: row.streamUrl,
    status: status === ScheduledLiveStatus.LIVE ? 'live' : 'scheduled',
  };
}

export function toCreatorLive(row: ScheduledLive, now = new Date()) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    platform: row.platform,
    platformLabel: livePlatformLabel(row.platform),
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt ? row.endsAt.toISOString() : null,
    streamUrl: row.streamUrl,
    status: row.status,
    effectiveStatus: effectiveLiveStatus(row, now),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
