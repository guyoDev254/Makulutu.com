import { ScheduledLiveStatus } from '@prisma/client';
import {
  effectiveLiveStatus,
  isPublicUpcoming,
  toPublicLive,
} from './scheduled-lives.mapper';

function live(partial: {
  status?: ScheduledLiveStatus;
  startsAt: Date;
  endsAt?: Date | null;
}) {
  const now = new Date('2026-09-17T12:00:00.000Z');
  const row = {
    id: '1',
    creatorId: 'c',
    title: 'Ranked grind',
    description: 'eFootball live',
    platform: 'tiktok',
    startsAt: partial.startsAt,
    endsAt: partial.endsAt ?? null,
    streamUrl: 'https://tiktok.com/@demo/live',
    status: partial.status ?? ScheduledLiveStatus.SCHEDULED,
    cancelledAt: null,
    createdAt: now,
    updatedAt: now,
  };
  return { row, now };
}

describe('scheduled live mapper', () => {
  it('treats a started session as live for fans', () => {
    const { row, now } = live({
      startsAt: new Date('2026-09-17T11:00:00.000Z'),
    });
    expect(effectiveLiveStatus(row, now)).toBe(ScheduledLiveStatus.LIVE);
    expect(toPublicLive(row, now)?.status).toBe('live');
  });

  it('hides cancelled and ended sessions', () => {
    const { row, now } = live({
      startsAt: new Date('2026-09-17T13:00:00.000Z'),
      status: ScheduledLiveStatus.CANCELLED,
    });
    expect(isPublicUpcoming(row, now)).toBe(false);
    expect(toPublicLive(row, now)).toBeNull();
  });

  it('keeps future scheduled sessions public', () => {
    const { row, now } = live({
      startsAt: new Date('2026-09-17T18:00:00.000Z'),
    });
    expect(toPublicLive(row, now)?.platformLabel).toBe('TikTok');
    expect(toPublicLive(row, now)?.status).toBe('scheduled');
  });
});
