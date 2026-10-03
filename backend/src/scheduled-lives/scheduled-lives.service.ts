import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ScheduledLiveStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FanNotifyService } from '../fan-portal/fan-notify.service';
import { CreateScheduledLiveDto } from './dto/create-scheduled-live.dto';
import { UpdateScheduledLiveDto } from './dto/update-scheduled-live.dto';
import {
  isPublicUpcoming,
  publicUpcomingWhere,
  toCreatorLive,
  toPublicLive,
} from './scheduled-lives.mapper';

const MAX_UPCOMING = 20;
const PAST_LOOKBACK_MS = 14 * 24 * 60 * 60 * 1000;

@Injectable()
export class ScheduledLivesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fanNotify: FanNotifyService,
  ) {}

  async listForCreator(creatorId: string) {
    const now = new Date();
    const since = new Date(now.getTime() - PAST_LOOKBACK_MS);
    const rows = await this.prisma.scheduledLive.findMany({
      where: {
        creatorId,
        OR: [
          { startsAt: { gte: since } },
          { status: { in: [ScheduledLiveStatus.SCHEDULED, ScheduledLiveStatus.LIVE] } },
        ],
      },
      orderBy: [{ startsAt: 'asc' }],
      take: 50,
    });
    return rows.map((row) => toCreatorLive(row, now));
  }

  async create(creatorId: string, dto: CreateScheduledLiveDto) {
    const startsAt = this.parseStart(dto.startsAt, true);
    const endsAt = this.parseEnd(dto.endsAt, startsAt);
    const streamUrl = this.parseUrl(dto.streamUrl);

    const upcoming = await this.prisma.scheduledLive.count({
      where: {
        creatorId,
        status: { in: [ScheduledLiveStatus.SCHEDULED, ScheduledLiveStatus.LIVE] },
        OR: [
          { endsAt: { gt: new Date() } },
          { endsAt: null, startsAt: { gte: new Date(Date.now() - 4 * 60 * 60 * 1000) } },
        ],
      },
    });
    if (upcoming >= MAX_UPCOMING) {
      throw new BadRequestException(
        `You can have at most ${MAX_UPCOMING} upcoming lives. End or cancel one first.`,
      );
    }

    const row = await this.prisma.scheduledLive.create({
      data: {
        creatorId,
        title: dto.title,
        description: dto.description || null,
        platform: dto.platform,
        startsAt,
        endsAt,
        streamUrl,
      },
    });
    void this.fanNotify.liveScheduled(creatorId, row.id);
    return toCreatorLive(row);
  }

  async update(creatorId: string, id: string, dto: UpdateScheduledLiveDto) {
    const existing = await this.requireOwn(creatorId, id);
    if (
      existing.status === ScheduledLiveStatus.CANCELLED ||
      existing.status === ScheduledLiveStatus.ENDED
    ) {
      throw new BadRequestException('This live can no longer be edited');
    }
    const startsAt = dto.startsAt
      ? this.parseStart(dto.startsAt, false)
      : existing.startsAt;
    const endsAt =
      dto.endsAt === undefined
        ? existing.endsAt
        : dto.endsAt === null || dto.endsAt === ''
          ? null
          : this.parseEnd(dto.endsAt, startsAt);
    const streamUrl =
      dto.streamUrl === undefined
        ? existing.streamUrl
        : this.parseUrl(dto.streamUrl);

    const row = await this.prisma.scheduledLive.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.platform !== undefined ? { platform: dto.platform } : {}),
        startsAt,
        endsAt,
        streamUrl,
      },
    });
    return toCreatorLive(row);
  }

  async goLive(creatorId: string, id: string) {
    const existing = await this.requireOwn(creatorId, id);
    if (
      existing.status === ScheduledLiveStatus.CANCELLED ||
      existing.status === ScheduledLiveStatus.ENDED
    ) {
      throw new BadRequestException('This live cannot be marked live');
    }
    const row = await this.prisma.scheduledLive.update({
      where: { id },
      data: { status: ScheduledLiveStatus.LIVE },
    });
    return toCreatorLive(row);
  }

  async end(creatorId: string, id: string) {
    await this.requireOwn(creatorId, id);
    const row = await this.prisma.scheduledLive.update({
      where: { id },
      data: {
        status: ScheduledLiveStatus.ENDED,
        endsAt: new Date(),
      },
    });
    return toCreatorLive(row);
  }

  async cancel(creatorId: string, id: string) {
    const existing = await this.requireOwn(creatorId, id);
    if (existing.status === ScheduledLiveStatus.ENDED) {
      throw new BadRequestException('This live has already ended');
    }
    const row = await this.prisma.scheduledLive.update({
      where: { id },
      data: {
        status: ScheduledLiveStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });
    return toCreatorLive(row);
  }

  async publicUpcomingForCreator(creatorId: string) {
    const now = new Date();
    const rows = await this.prisma.scheduledLive.findMany({
      where: { creatorId, ...publicUpcomingWhere(now) },
      orderBy: { startsAt: 'asc' },
      take: 8,
    });
    return rows
      .map((row) => toPublicLive(row, now))
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
  }

  async nextLiveByCreatorIds(creatorIds: string[]) {
    const now = new Date();
    if (creatorIds.length === 0) return new Map<string, ReturnType<typeof toPublicLive>>();
    const rows = await this.prisma.scheduledLive.findMany({
      where: { creatorId: { in: creatorIds }, ...publicUpcomingWhere(now) },
      orderBy: { startsAt: 'asc' },
    });
    const map = new Map<string, ReturnType<typeof toPublicLive>>();
    for (const row of rows) {
      if (map.has(row.creatorId)) continue;
      if (!isPublicUpcoming(row, now)) continue;
      map.set(row.creatorId, toPublicLive(row, now));
    }
    return map;
  }

  private async requireOwn(creatorId: string, id: string) {
    const row = await this.prisma.scheduledLive.findUnique({ where: { id } });
    if (!row || row.creatorId !== creatorId) {
      throw new NotFoundException('Live not found');
    }
    return row;
  }

  private parseStart(raw: string, mustBeSoon: boolean): Date {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException('Enter a valid start time');
    }
    if (mustBeSoon && d.getTime() < Date.now() - 5 * 60 * 1000) {
      throw new BadRequestException('Start time must be in the future');
    }
    return d;
  }

  private parseEnd(raw: string | undefined, startsAt: Date): Date | null {
    if (!raw) return null;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException('Enter a valid end time');
    }
    if (d.getTime() <= startsAt.getTime()) {
      throw new BadRequestException('End time must be after the start time');
    }
    return d;
  }

  private parseUrl(raw?: string | null): string | null {
    if (raw === undefined || raw === null) return null;
    const t = String(raw).trim();
    if (!t) return null;
    try {
      const u = new URL(t);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        throw new Error('bad protocol');
      }
    } catch {
      throw new BadRequestException('Stream link must be an http(s) URL');
    }
    return t.slice(0, 500);
  }
}
