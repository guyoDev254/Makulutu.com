import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ObsGeminiService } from './obs-gemini.service';
import { ObsGroqService } from './obs-groq.service';

export type ObsSubscriberKind =
  | 'new'
  | 'renewal'
  | 'shoutout'
  | 'coaching_booking'
  | 'creator_reward';

export interface ObsSubscriberEvent {
  kind: ObsSubscriberKind;
  tiktokUsername: string;
  at: string;
  /** BCP-47 (e.g. en-US, sw-KE). Used by OBS player for Google TTS + browser fallback. */
  languageCode?: string;
  /** AI-generated line when no subscriber shoutout (Groq/Gemini). */
  announcementText?: string;
  /** Optional note from subscribe/renewal form; player speaks default welcome first, then this. */
  subscriberMessage?: string;
  /** e.g. tiktok, youtube — drives “New subscriber from …” in the player. */
  subscriberPlatform?: string;
  /** Subscription checkout total in KES (new / renewal only). */
  subscriptionAmountKes?: number;
  /** Stream shoutout checkout amount in KES (shoutout only). */
  shoutoutAmountKes?: number;
  /** TikTok embed iframe URL (shoutout only, optional). */
  shoutoutVideoEmbedUrl?: string;
  /** Paid account review: game / eFootball username (coaching_booking only). */
  coachingAccountUsername?: string;
  /** Admin-defined OBS card title (creator_reward only). */
  creatorRewardBanner?: string;
  /** Full line for TTS (creator_reward only). */
  creatorRewardTts?: string;
  /** Optional creator scope for unique OBS links. */
  creatorId?: string;
}

@Injectable()
export class ObsAlertsService {
  private readonly logger = new Logger(ObsAlertsService.name);
  private readonly clients = new Set<{
    send: (line: string) => void;
    creatorId: string | null;
  }>();

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly groq: ObsGroqService,
    private readonly gemini: ObsGeminiService,
  ) {}

  /**
   * Production: enabled if OBS_ALERT_SECRET is set OR at least one active ObsStreamLink exists.
   * Development: always true.
   */
  async isEnabled(): Promise<boolean> {
    if (this.config.get<string>('NODE_ENV') !== 'production') {
      return true;
    }
    const secret = this.config.get<string>('OBS_ALERT_SECRET')?.trim();
    if (secret) {
      return true;
    }
    const n = await this.prisma.obsStreamLink.count({
      where: { revokedAt: null },
    });
    return n > 0;
  }

  /**
   * Validates OBS token.
   * - If creatorId is provided (uid flow), token must be an active unique link owned by that creator.
   * - Otherwise uses legacy behavior (shared secret or unique link).
   */
  async validateToken(
    token: string | undefined,
    creatorId?: string | null,
  ): Promise<boolean> {
    const scopedCreatorId = creatorId?.trim() || null;
    if (scopedCreatorId) {
      if (token === undefined || token === '') {
        return false;
      }
      const row = await this.prisma.obsStreamLink.findFirst({
        where: { token, revokedAt: null, creatorId: scopedCreatorId },
        select: { id: true },
      });
      return !!row;
    }

    const secret = this.config.get<string>('OBS_ALERT_SECRET')?.trim();
    if (token === undefined || token === '') {
      return false;
    }
    if (secret) {
      const a = Buffer.from(token, 'utf8');
      const b = Buffer.from(secret, 'utf8');
      if (a.length === b.length && timingSafeEqual(a, b)) {
        return true;
      }
    }
    const row = await this.prisma.obsStreamLink.findFirst({
      where: { token, revokedAt: null },
      select: { id: true },
    });
    return !!row;
  }

  /**
   * Resolve token scope:
   * - shared secret token => null (receives all alerts)
   * - unique stream token => creatorId for that link
   */
  async resolveTokenCreatorScope(
    token: string | undefined,
  ): Promise<string | null> {
    const secret = this.config.get<string>('OBS_ALERT_SECRET')?.trim();
    if (token === undefined || token === '') {
      return null;
    }
    if (secret) {
      const a = Buffer.from(token, 'utf8');
      const b = Buffer.from(secret, 'utf8');
      if (a.length === b.length && timingSafeEqual(a, b)) {
        return null;
      }
    }
    const row = await this.prisma.obsStreamLink.findFirst({
      where: { token, revokedAt: null },
      select: { creatorId: true },
    });
    return row?.creatorId ?? null;
  }

  static newStreamToken(): string {
    return randomBytes(32).toString('base64url');
  }

  subscribe(send: (line: string) => void, creatorId: string | null): () => void {
    const client = { send, creatorId };
    this.clients.add(client);
    return () => this.clients.delete(client);
  }

  /** Open SSE connections (same Node process only). */
  getSseListenerCount(): number {
    return this.clients.size;
  }

  async emitSubscriberAlert(
    event: Omit<ObsSubscriberEvent, 'at'> & { skipGemini?: boolean },
    options?: { requireEnabled?: boolean },
  ): Promise<void> {
    const requireEnabled = options?.requireEnabled !== false;
    if (requireEnabled && !(await this.isEnabled())) {
      return;
    }

    const skipGemini = event.skipGemini === true;
    const shout = event.subscriberMessage?.trim();

    let announcementText = event.announcementText;
    if (
      announcementText === undefined &&
      !skipGemini &&
      !shout &&
      event.kind !== 'shoutout' &&
      event.kind !== 'coaching_booking' &&
      event.kind !== 'creator_reward'
    ) {
      try {
        if (this.groq.isConfigured()) {
          const fromGroq = await this.groq.generateSubscriberAnnouncement({
            tiktokUsername: event.tiktokUsername,
            kind: event.kind === 'renewal' ? 'renewal' : 'new',
            languageCode: event.languageCode,
          });
          if (fromGroq) {
            announcementText = fromGroq;
          }
        }
        if (announcementText === undefined && this.gemini.isConfigured()) {
          const fromGemini = await this.gemini.generateSubscriberAnnouncement({
            tiktokUsername: event.tiktokUsername,
            kind: event.kind === 'renewal' ? 'renewal' : 'new',
            languageCode: event.languageCode,
          });
          if (fromGemini) {
            announcementText = fromGemini;
          }
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.warn(`OBS AI announcement skipped: ${msg}`);
      }
    }

    const plat = event.subscriberPlatform?.trim().toLowerCase();
    const roundKes = (n: unknown): number | undefined =>
      typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : undefined;
    const subAmt = roundKes(event.subscriptionAmountKes);
    const shoutAmt = roundKes(event.shoutoutAmountKes);
    const payload: ObsSubscriberEvent = {
      kind: event.kind,
      tiktokUsername: event.tiktokUsername,
      at: new Date().toISOString(),
      ...(event.creatorId ? { creatorId: event.creatorId } : {}),
      ...(event.languageCode ? { languageCode: event.languageCode } : {}),
      ...(announcementText !== undefined && announcementText !== ''
        ? { announcementText }
        : {}),
      ...(shout ? { subscriberMessage: shout.slice(0, 500) } : {}),
      ...(plat ? { subscriberPlatform: plat.slice(0, 32) } : {}),
      ...(event.kind !== 'shoutout' &&
      event.kind !== 'coaching_booking' &&
      event.kind !== 'creator_reward' &&
      subAmt !== undefined
        ? { subscriptionAmountKes: subAmt }
        : {}),
      ...((event.kind === 'shoutout' ||
        event.kind === 'coaching_booking' ||
        event.kind === 'creator_reward') &&
      shoutAmt !== undefined
        ? { shoutoutAmountKes: shoutAmt }
        : {}),
      ...(event.coachingAccountUsername?.trim()
        ? {
            coachingAccountUsername: event.coachingAccountUsername
              .trim()
              .slice(0, 120),
          }
        : {}),
      ...((event.kind === 'shoutout' || event.kind === 'creator_reward') &&
      event.shoutoutVideoEmbedUrl?.trim()
        ? {
            shoutoutVideoEmbedUrl: event.shoutoutVideoEmbedUrl
              .trim()
              .slice(0, 512),
          }
        : {}),
      ...(event.creatorRewardBanner?.trim()
        ? {
            creatorRewardBanner: event.creatorRewardBanner.trim().slice(0, 40),
          }
        : {}),
      ...(event.creatorRewardTts?.trim()
        ? {
            creatorRewardTts: event.creatorRewardTts.trim().slice(0, 600),
          }
        : {}),
    };

    const line = JSON.stringify(payload);
    const scopedCreatorId = payload.creatorId ?? null;
    const recipients = [...this.clients].filter(
      (c) => c.creatorId === null || c.creatorId === scopedCreatorId,
    );
    const n = recipients.length;
    if (n === 0) {
      this.logger.warn(
        `OBS alert (${payload.kind}): @${payload.tiktokUsername} — no SSE subscribers (open /obs/player in OBS on this same API host; check path prefix if behind a reverse proxy).`,
      );
    }
    for (const c of recipients) {
      try {
        c.send(line);
      } catch {
        this.clients.delete(c);
      }
    }
    this.logger.log(
      `OBS alert (${payload.kind}): @${payload.tiktokUsername} → ${n} subscriber(s)`,
    );
  }
}
