import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { PaymentService } from '../payment/payment.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import {
  CoachingBookingStatus,
  PaymentPurpose,
  PaymentStatus,
  PayoutRequestStatus,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';
import {
  fetchCreatorWorkspacePatch,
  mergeWorkspaceMonthlyPrice,
  parseCreatorWorkspaceSettings,
} from '../common/utils/creator-workspace-settings';
import { ObsAlertsService } from '../obs-alerts/obs-alerts.service';
import { CreateObsStreamLinkDto } from './dto/create-obs-stream-link.dto';
import { UpdateCoachingBookingAdminDto } from './dto/update-coaching-booking-admin.dto';
import { ObsTtsService } from '../obs-alerts/obs-tts.service';
import { ObsGeminiService } from '../obs-alerts/obs-gemini.service';
import { ObsGroqService } from '../obs-alerts/obs-groq.service';
import { ConfigService } from '@nestjs/config';
import { resolveShoutoutVideoEmbedUrlForObs } from '../common/utils/shoutout-video-url';
import {
  MAX_STREAM_ALERT_MESSAGE_LENGTH,
  STREAM_ALERT_PLATFORM_SET,
} from '../common/constants/stream-alert';
import {
  resolveShoutoutLimits,
  SHOUTOUT_MAX_KES_KEY,
  SHOUTOUT_MIN_KES_KEY,
  SHOUTOUT_MIN_KES_WITH_VIDEO_KEY,
} from '../common/utils/stream-alert-limits';
import { renderCreatorRewardTts } from '../common/utils/creator-reward-tts';
import {
  COACHING_ACCOUNT_REVIEW_KES_KEY,
  resolveCoachingAccountReviewKes,
} from '../common/utils/coaching-booking-price';
import { CreateCreatorRewardDto } from '../creator-reward/dto/create-creator-reward.dto';
import { UpdateCreatorRewardDto } from '../creator-reward/dto/update-creator-reward.dto';
import { UpdateCreatorAdminDto } from './dto/update-creator-admin.dto';
import {
  enumerateNairobiDays,
  nairobiRangeToUtcBounds,
  nairobiYmd,
  resolveRevenueRangeNairobi,
  type RevenuePreset,
} from '../common/utils/admin-revenue-range';
import {
  OBS_ALERT_SECS_NEW_KEY,
  OBS_ALERT_SECS_RENEWAL_KEY,
  OBS_ALERT_SECS_SHOUTOUT_KEY,
  OBS_ALERT_SECS_SHOUTOUT_VIDEO_KEY,
  OBS_ALERT_TIMER_MAX_SEC,
  OBS_ALERT_TIMER_MIN_SEC,
  resolveObsAlertHideTimers,
} from '../common/utils/obs-alert-timers';
import {
  SUPPORT_CATALOG_ORDER_KEY,
  SUPPORT_TIER_MEMBERSHIP_DESC_KEY,
  SUPPORT_TIER_MEMBERSHIP_TITLE_KEY,
  SUPPORT_TIER_SHOUTOUT_DESC_KEY,
  SUPPORT_TIER_SHOUTOUT_TITLE_KEY,
} from '../common/constants/support-catalog';
import {
  getSettingsString,
  mergeSupportCatalogOrder,
  parseSupportCatalogOrderJson,
} from '../common/utils/support-catalog';
import { resolveDefaultCreatorId } from '../common/utils/default-creator';
import { OutboundMailService } from '../mail/outbound-mail.service';
import { NotifyCreatorEmailDto } from './dto/notify-creator-email.dto';
import {
  nextWeeklyPayoutReminderDate,
  payoutProcessingScheduleMeta,
} from '../common/utils/payout-weekly-schedule';

const PLATFORM_FEE_PERCENT_KEY = 'platform_fee_percent';
const OBS_SUBSCRIPTION_MESSAGE_TEMPLATE_KEY = 'obs_subscription_message_template';
const OBS_SHOUTOUT_MESSAGE_TEMPLATE_KEY = 'obs_shoutout_message_template';
const DEFAULT_PLATFORM_FEE_PERCENT = 5;
const MIN_PAYOUT_REQUEST_KES = 100;

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private userService: UserService,
    private subscriptionService: SubscriptionService,
    private paymentService: PaymentService,
    private obsAlerts: ObsAlertsService,
    private obsTts: ObsTtsService,
    private obsGemini: ObsGeminiService,
    private obsGroq: ObsGroqService,
    private config: ConfigService,
    private outboundMail: OutboundMailService,
  ) {}

  async testObsAlert(
    tiktokUsername?: string,
    kind:
      | 'new'
      | 'renewal'
      | 'shoutout'
      | 'account_review'
      | 'creator_reward' = 'new',
    languageCode?: string,
    skipGemini?: boolean,
    announcementText?: string,
    subscriberPlatform?: string,
    subscriptionAmountKes?: number,
    shoutoutAmountKes?: number,
    shoutoutVideoPageUrl?: string,
    coachingAccountUsername?: string,
    creatorRewardId?: string,
    forcedCreatorId?: string,
  ) {
    const raw = (tiktokUsername ?? 'TestCreator').trim().replace(/^@+/, '');
    const name = raw.length > 0 ? raw.slice(0, 64) : 'TestCreator';
    const lang =
      languageCode?.trim().slice(0, 20) ||
      this.config.get<string>('DEFAULT_OBS_TTS_LANGUAGE')?.trim().slice(0, 20);
    const line = announcementText?.trim().slice(0, 500) || undefined;
    const plat = subscriberPlatform?.trim().toLowerCase() || undefined;
    const sseListenersBefore = this.obsAlerts.getSseListenerCount();
    // Admin test: emit even if OBS_ALERT_SECRET is unset (player/stream still need the secret in prod).
    const subAmt =
      typeof subscriptionAmountKes === 'number' &&
      Number.isFinite(subscriptionAmountKes)
        ? Math.round(subscriptionAmountKes)
        : undefined;
    const shoutAmt =
      typeof shoutoutAmountKes === 'number' && Number.isFinite(shoutoutAmountKes)
        ? Math.round(shoutoutAmountKes)
        : undefined;
    const obsKind =
      kind === 'account_review' ? 'coaching_booking' : kind;
    const skipAi =
      skipGemini === true ||
      kind === 'shoutout' ||
      kind === 'account_review' ||
      kind === 'creator_reward';
    const coachingAcct = coachingAccountUsername?.trim().slice(0, 120);
    let shoutoutVideoEmbedUrl: string | undefined;
    if (
      (kind === 'shoutout' || kind === 'creator_reward') &&
      shoutoutVideoPageUrl?.trim()
    ) {
      const embed = await resolveShoutoutVideoEmbedUrlForObs(
        shoutoutVideoPageUrl,
      );
      if (embed) shoutoutVideoEmbedUrl = embed;
    }

    let shoutoutKesForEmit = shoutAmt;
    let creatorRewardBanner: string | undefined;
    let creatorRewardTts: string | undefined;
    let creatorRewardCreatorId: string | undefined;
    if (kind === 'creator_reward') {
      let rewardName = 'Test tier';
      let banner = 'REWARD!';
      let ttsTemplate: string | null = null;
      const idTrim = creatorRewardId?.trim();
      if (idTrim) {
        const r = await this.prisma.creatorReward.findUnique({
          where: { id: idTrim },
        });
        if (!r) {
          throw new BadRequestException('Reward tier not found');
        }
        rewardName = r.name;
        creatorRewardCreatorId = r.creatorId ?? undefined;
        banner = r.alertBannerLabel.slice(0, 40);
        ttsTemplate = r.ttsScript ?? null;
        const tierAmt = Math.round(Number(r.amountKes));
        shoutoutKesForEmit = Number.isFinite(tierAmt)
          ? shoutAmt ?? tierAmt
          : shoutAmt ?? 100;
      } else {
        shoutoutKesForEmit = shoutAmt ?? 100;
      }
      creatorRewardBanner = banner;
      creatorRewardTts = renderCreatorRewardTts(ttsTemplate, {
        displayName: name,
        rewardName,
        amount: shoutoutKesForEmit ?? 100,
        message: line || '',
      });
    }

    await this.obsAlerts.emitSubscriberAlert(
      {
        kind: obsKind,
        tiktokUsername: name,
        ...(forcedCreatorId
          ? { creatorId: forcedCreatorId }
          : creatorRewardCreatorId
            ? { creatorId: creatorRewardCreatorId }
            : {}),
        ...(lang ? { languageCode: lang } : {}),
        ...(skipAi ? { skipGemini: true } : {}),
        ...(line ? { subscriberMessage: line } : {}),
        ...(plat && obsKind !== 'coaching_booking'
          ? { subscriberPlatform: plat }
          : {}),
        ...(obsKind !== 'shoutout' &&
        obsKind !== 'coaching_booking' &&
        obsKind !== 'creator_reward' &&
        subAmt !== undefined
          ? { subscriptionAmountKes: subAmt }
          : {}),
        ...((obsKind === 'shoutout' ||
          obsKind === 'coaching_booking' ||
          obsKind === 'creator_reward') &&
        shoutoutKesForEmit !== undefined
          ? { shoutoutAmountKes: shoutoutKesForEmit }
          : {}),
        ...(obsKind === 'coaching_booking' && coachingAcct
          ? { coachingAccountUsername: coachingAcct }
          : {}),
        ...((obsKind === 'shoutout' || obsKind === 'creator_reward') &&
        shoutoutVideoEmbedUrl
          ? { shoutoutVideoEmbedUrl }
          : {}),
        ...(obsKind === 'creator_reward' && creatorRewardBanner
          ? { creatorRewardBanner }
          : {}),
        ...(obsKind === 'creator_reward' && creatorRewardTts
          ? { creatorRewardTts }
          : {}),
      },
      { requireEnabled: false },
    );
    return {
      ok: true,
      tiktokUsername: name,
      kind,
      languageCode: lang || null,
      obsEnabled: await this.obsAlerts.isEnabled(),
      sseListeners: sseListenersBefore,
    };
  }

  private resolveObsBaseUrl(): string {
    return (
      this.config.get<string>('OBS_PLAYER_BASE_URL') ||
      this.config.get<string>('WEBHOOK_BASE_URL') ||
      this.config.get<string>('BASE_URL') ||
      ''
    )
      .trim()
      .replace(/\/$/, '');
  }

  /**
   * Browser Source URLs for OBS. Shared secret (if set) plus optional unique per-source links.
   */
  async getObsPlayerLink() {
    const enabled = await this.obsAlerts.isEnabled();
    if (!enabled) {
      return {
        enabled: false,
        playerUrl: null as string | null,
        copyUrl: null as string | null,
        uniqueLinks: [] as Array<{
          id: string;
          label: string | null;
          tokenSuffix: string;
          createdAt: string;
        }>,
        legacyUsesSharedSecret: false,
        cloudTts: this.obsTts.isConfigured(),
        groq: this.obsGroq.isConfigured(),
        gemini: this.obsGemini.isConfigured(),
        message:
          'OBS alerts are disabled. In production set OBS_ALERT_SECRET or create at least one unique stream link below.',
      };
    }

    const base = this.resolveObsBaseUrl();

    const activeLinks = await this.prisma.obsStreamLink.findMany({
      where: { revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    const primaryToken = activeLinks[0]?.token ?? null;
    const pathSecret = primaryToken
      ? `/obs/player?token=${encodeURIComponent(primaryToken)}`
      : null;
    let playerUrl: string | null = null;
    let copyUrl: string | null = null;
    if (pathSecret && base) {
      playerUrl = `${base}${pathSecret}`;
      copyUrl = playerUrl;
    } else if (pathSecret && !base) {
      copyUrl = pathSecret;
    }

    let message: string | null = null;
    if (!base) {
      message =
        'Set OBS_PLAYER_BASE_URL (or WEBHOOK_BASE_URL / BASE_URL) on the API for a full https URL, or prepend your API host to the path.';
    }
    if (activeLinks.length === 0) {
      message =
        (message ? `${message} ` : '') +
        'Generate at least one unique OBS link for this creator. Shared OBS_ALERT_SECRET is not used in creator workspace links.';
    }

    return {
      enabled: true,
      playerUrl,
      copyUrl,
      uniqueLinks: activeLinks.map((l) => ({
        id: l.id,
        label: l.label,
        tokenSuffix: l.token.slice(-6),
        createdAt: l.createdAt.toISOString(),
      })),
      legacyUsesSharedSecret: false,
      cloudTts: this.obsTts.isConfigured(),
      groq: this.obsGroq.isConfigured(),
      gemini: this.obsGemini.isConfigured(),
      message,
    };
  }

  /** Same as getObsPlayerLink but only stream links owned by this creator. */
  async getObsPlayerLinkForCreator(creatorId: string) {
    const enabled = await this.obsAlerts.isEnabled();
    if (!enabled) {
      return {
        enabled: false,
        playerUrl: null as string | null,
        copyUrl: null as string | null,
        uniqueLinks: [] as Array<{
          id: string;
          label: string | null;
          tokenSuffix: string;
          createdAt: string;
        }>,
        legacyUsesSharedSecret: false,
        cloudTts: this.obsTts.isConfigured(),
        groq: this.obsGroq.isConfigured(),
        gemini: this.obsGemini.isConfigured(),
        message:
          'OBS alerts are disabled. In production set OBS_ALERT_SECRET or create at least one unique stream link below.',
      };
    }

    const base = this.resolveObsBaseUrl();

    const activeLinks = await this.prisma.obsStreamLink.findMany({
      where: { revokedAt: null, creatorId },
      orderBy: { createdAt: 'desc' },
    });

    const primaryToken = activeLinks[0]?.token ?? null;
    const pathSecret = primaryToken
      ? `/obs/player?token=${encodeURIComponent(primaryToken)}&uid=${encodeURIComponent(
          creatorId,
        )}`
      : null;
    let playerUrl: string | null = null;
    let copyUrl: string | null = null;
    if (pathSecret && base) {
      playerUrl = `${base}${pathSecret}`;
      copyUrl = playerUrl;
    } else if (pathSecret && !base) {
      copyUrl = pathSecret;
    }

    let message: string | null = null;
    if (!base) {
      message =
        'Set OBS_PLAYER_BASE_URL (or WEBHOOK_BASE_URL / BASE_URL) on the API for a full https URL, or prepend your API host to the path.';
    }
    if (activeLinks.length === 0) {
      message =
        (message ? `${message} ` : '') +
        'Generate at least one unique OBS link for this creator. Shared OBS_ALERT_SECRET is not used in creator workspace links.';
    }

    return {
      enabled: true,
      playerUrl,
      copyUrl,
      uniqueLinks: activeLinks.map((l) => ({
        id: l.id,
        label: l.label,
        tokenSuffix: (l.token ?? '').slice(-6),
        createdAt: (l.createdAt ?? new Date()).toISOString(),
      })),
      legacyUsesSharedSecret: false,
      cloudTts: this.obsTts.isConfigured(),
      groq: this.obsGroq.isConfigured(),
      gemini: this.obsGemini.isConfigured(),
      message,
    };
  }

  async createObsStreamLink(
    dto?: CreateObsStreamLinkDto,
    forcedCreatorId?: string | null,
  ) {
    const label = dto?.label;
    const token = ObsAlertsService.newStreamToken();
    const creatorId =
      forcedCreatorId?.trim() ||
      (await resolveDefaultCreatorId(this.prisma)) ||
      undefined;
    const row = await this.prisma.obsStreamLink.create({
      data: {
        token,
        label: label?.trim().slice(0, 128) || null,
        ...(creatorId ? { creatorId } : {}),
      },
    });
    const base = this.resolveObsBaseUrl();
    const path = creatorId
      ? `/obs/player?token=${encodeURIComponent(token)}&uid=${encodeURIComponent(creatorId)}`
      : `/obs/player?token=${encodeURIComponent(token)}`;
    const full = base ? `${base}${path}` : null;
    return {
      id: row.id,
      label: row.label,
      token,
      playerUrl: full,
      copyUrl: full ?? path,
    };
  }

  async revokeObsStreamLink(id: string, scopedCreatorId?: string | null) {
    if (scopedCreatorId) {
      const link = await this.prisma.obsStreamLink.findUnique({
        where: { id },
      });
      if (!link || link.creatorId !== scopedCreatorId) {
        throw new NotFoundException('Stream link not found or already revoked');
      }
    }
    const r = await this.prisma.obsStreamLink.updateMany({
      where: {
        id,
        revokedAt: null,
        ...(scopedCreatorId ? { creatorId: scopedCreatorId } : {}),
      },
      data: { revokedAt: new Date() },
    });
    if (r.count === 0) {
      throw new NotFoundException('Stream link not found or already revoked');
    }
    return { ok: true };
  }

  /** Admin "users" = people with a completed subscription checkout, not shoutout-only M-Pesa rows. */
  private subscriberBackedUserWhere(
    scopedCreatorId?: string | null,
  ): Prisma.UserWhereInput {
    return {
      payments: {
        some: {
          status: PaymentStatus.COMPLETED,
          OR: [
            { purpose: PaymentPurpose.SUBSCRIPTION },
            { purpose: null },
          ],
          ...(scopedCreatorId ? { creatorId: scopedCreatorId } : {}),
        },
      },
    };
  }

  private async computeDashboardTrends(
    dayCount: number,
    scopedCreatorId?: string | null,
  ) {
    const now = new Date();
    const todayUtc = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const startUtc = new Date(todayUtc);
    startUtc.setUTCDate(startUtc.getUTCDate() - (dayCount - 1));

    const scope =
      scopedCreatorId && scopedCreatorId.length > 0
        ? { creatorId: scopedCreatorId }
        : {};

    const [paymentsAgg, subsAgg] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          status: PaymentStatus.COMPLETED,
          createdAt: { gte: startUtc },
          ...scope,
        },
        select: { createdAt: true, amount: true },
      }),
      this.prisma.subscription.findMany({
        where: { createdAt: { gte: startUtc }, ...scope },
        select: { createdAt: true },
      }),
    ]);

    const payByDay = new Map<string, { count: number; revenue: number }>();
    for (const p of paymentsAgg) {
      const key = p.createdAt!.toISOString().slice(0, 10);
      const cur = payByDay.get(key) || { count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += Number(p.amount ?? 0);
      payByDay.set(key, cur);
    }
    const subByDay = new Map<string, number>();
    for (const s of subsAgg) {
      const key = s.createdAt!.toISOString().slice(0, 10);
      subByDay.set(key, (subByDay.get(key) || 0) + 1);
    }

    const series: Array<{
      date: string;
      label: string;
      completedPayments: number;
      revenueKes: number;
      newSubscriptions: number;
    }> = [];
    for (let i = 0; i < dayCount; i++) {
      const d = new Date(startUtc);
      d.setUTCDate(startUtc.getUTCDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-KE', {
        month: 'short',
        day: 'numeric',
      });
      const p = payByDay.get(dateStr) || { count: 0, revenue: 0 };
      series.push({
        date: dateStr,
        label,
        completedPayments: p.count,
        revenueKes: Math.round(p.revenue * 100) / 100,
        newSubscriptions: subByDay.get(dateStr) || 0,
      });
    }

    return { days: dayCount, series };
  }

  async getDashboardStats(scopedCreatorId?: string | null) {
    try {
      const baseUserWhere = this.subscriberBackedUserWhere(scopedCreatorId);
      const [
        totalUsers,
        activeUsers,
        subscriptionStats,
        paymentStats,
        trends,
        platformOps,
      ] = await Promise.all([
        this.prisma.user.count({ where: baseUserWhere }),
        this.prisma.user.count({
          where: { ...baseUserWhere, isActive: true },
        }),
        this.subscriptionService.getStats(scopedCreatorId),
        this.paymentService.getStats(scopedCreatorId),
        this.computeDashboardTrends(14, scopedCreatorId),
        scopedCreatorId
          ? Promise.resolve(null)
          : Promise.all([
              this.prisma.creator.count(),
              this.prisma.creator.count({ where: { isActive: true } }),
              this.prisma.payoutRequest.count({
                where: { status: PayoutRequestStatus.PENDING },
              }),
            ]).then(([streamersTotal, streamersActive, payoutsPending]) => ({
              streamersTotal,
              streamersActive,
              payoutsPending,
            })),
      ]);

      return {
        users: {
          total: totalUsers,
          active: activeUsers,
        },
        subscriptions: subscriptionStats,
        payments: paymentStats,
        trends,
        ...(platformOps
          ? {
              streamers: {
                total: platformOps.streamersTotal,
                active: platformOps.streamersActive,
              },
              pendingPayoutRequests: platformOps.payoutsPending,
              payoutProcessingSchedule: {
                ...payoutProcessingScheduleMeta(),
                nextReminderAt: nextWeeklyPayoutReminderDate().toISOString(),
              },
            }
          : {}),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`getDashboardStats failed: ${message}`, stack);
      throw new InternalServerErrorException(
        'Failed to load dashboard. Check server logs and database connection.',
      );
    }
  }

  async getAllCreators(pagination: PaginationDto, search?: string) {
    const where: Prisma.CreatorWhereInput = {};
    const q = search?.trim();
    if (q) {
      where.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { displayName: { contains: q, mode: 'insensitive' } },
      ];
    }

    const creatorSelect = {
      id: true,
      email: true,
      slug: true,
      displayName: true,
      supportEnabled: true,
      onboardingComplete: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
      primaryCategory: true,
      _count: {
        select: {
          users: true,
          payments: true,
          subscriptions: true,
          creatorRewards: true,
        },
      },
    } as const;

    const [data, total] = await Promise.all([
      this.prisma.creator.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: 'desc' },
        select: creatorSelect,
      }),
      this.prisma.creator.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        total,
        totalPages: Math.ceil(total / (pagination.limit || 10)),
      },
    };
  }

  async updateCreatorAdmin(id: string, dto: UpdateCreatorAdminDto) {
    const existing = await this.prisma.creator.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Creator not found');
    }
    const data: Prisma.CreatorUpdateInput = {};
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }
    if (dto.supportEnabled !== undefined) {
      data.supportEnabled = dto.supportEnabled;
    }
    if (dto.onboardingComplete !== undefined) {
      data.onboardingComplete = dto.onboardingComplete;
    }
    if (Object.keys(data).length === 0) {
      return this.prisma.creator.findUniqueOrThrow({
        where: { id },
        select: {
          id: true,
          email: true,
          slug: true,
          displayName: true,
          supportEnabled: true,
          onboardingComplete: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          primaryCategory: true,
          _count: {
            select: {
              users: true,
              payments: true,
              subscriptions: true,
              creatorRewards: true,
            },
          },
        },
      });
    }
    return this.prisma.creator.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        slug: true,
        displayName: true,
        supportEnabled: true,
        onboardingComplete: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        primaryCategory: true,
        _count: {
          select: {
            users: true,
            payments: true,
            subscriptions: true,
            creatorRewards: true,
          },
        },
      },
    });
  }

  /**
   * Super admin → creator transactional email (e.g. suspension notice). Uses SendGrid/SMTP like other mail.
   */
  async notifyCreatorByEmail(
    creatorId: string,
    dto: NotifyCreatorEmailDto,
    senderLabel: string,
  ) {
    const creator = await this.prisma.creator.findUnique({
      where: { id: creatorId },
      select: { id: true, email: true, displayName: true },
    });
    if (!creator) {
      throw new NotFoundException('Creator not found');
    }
    const subject = dto.subject.trim().slice(0, 200);
    const message = dto.message.trim().slice(0, 4000);
    if (!subject || !message) {
      throw new BadRequestException('Subject and message are required');
    }
    const name = creator.displayName?.trim() || 'Creator';
    const esc = (s: string) =>
      s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    const sender = (senderLabel || 'Makulutu').trim().slice(0, 120);
    const htmlBody = message
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((line) => `<p style="margin:0 0 8px 0;">${esc(line) || '&nbsp;'}</p>`)
      .join('');
    const html = `<p>Hello ${esc(name)},</p>${htmlBody}<p style="margin-top:20px;color:#666;font-size:13px;">— ${esc(sender)}</p>`;
    const text = `Hello ${name},\n\n${message}\n\n— ${sender}`;
    await this.outboundMail.sendTransactional({
      toEmail: creator.email,
      toName: name,
      subject,
      text,
      html,
      devLog: {
        label: 'super admin → creator email',
        detail: `${creator.email}: ${subject}`,
      },
    });
    this.logger.log(`Creator notify email sent to ${creator.email} (creator ${creatorId})`);
    return { ok: true, message: 'Email sent to the creator.' };
  }

  /**
   * Super-admin-only aggregate for support / audits. Caps list sizes to keep responses bounded.
   */
  async getCreatorSuperAdminProfile(creatorId: string) {
    const creator = await this.prisma.creator.findUnique({
      where: { id: creatorId },
      select: {
        id: true,
        email: true,
        slug: true,
        displayName: true,
        bio: true,
        whatIDo: true,
        packagesSummary: true,
        socialLinks: true,
        avatarUrl: true,
        primaryCategory: true,
        supportEnabled: true,
        onboardingComplete: true,
        isActive: true,
        lastLogin: true,
        workspaceSettings: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users: true,
            payments: true,
            subscriptions: true,
            creatorRewards: true,
            obsStreamLinks: true,
            payoutRequests: true,
          },
        },
      },
    });
    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    const listCap = 100;
    const shoutCap = 75;
    const payoutCap = 50;
    const bookingCap = 50;

    const [
      walletSummary,
      mergedSettings,
      supporters,
      payments,
      subscriptions,
      creatorRewards,
      obsStreamLinks,
      payoutRequests,
      streamShoutouts,
      coachingBookings,
    ] = await Promise.all([
      this.getCreatorWalletSummary(creatorId),
      this.getSettings(creatorId),
      this.prisma.user.findMany({
        where: { creatorId },
        orderBy: { createdAt: 'desc' },
        take: listCap,
        select: {
          id: true,
          name: true,
          tiktokUsername: true,
          mpesaMobile: true,
          whatsappNumber: true,
          isActive: true,
          addedToWhatsApp: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { subscriptions: true, payments: true },
          },
        },
      }),
      this.prisma.payment.findMany({
        where: { creatorId },
        orderBy: { createdAt: 'desc' },
        take: listCap,
        select: {
          id: true,
          userId: true,
          amount: true,
          months: true,
          purpose: true,
          status: true,
          reference: true,
          completedAt: true,
          failedAt: true,
          failureReason: true,
          subscriberAlertEmittedAt: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              tiktokUsername: true,
            },
          },
          streamShoutout: {
            select: {
              id: true,
              displayHandle: true,
              platform: true,
              message: true,
              videoUrl: true,
              amountKes: true,
            },
          },
          creatorRewardPurchase: {
            select: {
              rewardNameSnapshot: true,
              bannerLabelSnapshot: true,
              displayName: true,
              platform: true,
              supporterMessage: true,
              videoUrl: true,
            },
          },
        },
      }),
      this.prisma.subscription.findMany({
        where: { creatorId },
        orderBy: { createdAt: 'desc' },
        take: listCap,
        select: {
          id: true,
          userId: true,
          months: true,
          startDate: true,
          endDate: true,
          status: true,
          amount: true,
          paymentId: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              tiktokUsername: true,
            },
          },
        },
      }),
      this.prisma.creatorReward.findMany({
        where: { creatorId },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          name: true,
          description: true,
          amountKes: true,
          alertBannerLabel: true,
          active: true,
          sortOrder: true,
          allowSupporterMessage: true,
          allowVideoClip: true,
          createdAt: true,
        },
      }),
      this.prisma.obsStreamLink.findMany({
        where: { creatorId },
        orderBy: { createdAt: 'desc' },
        take: listCap,
        select: {
          id: true,
          label: true,
          token: true,
          revokedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.payoutRequest.findMany({
        where: { creatorId },
        orderBy: { createdAt: 'desc' },
        take: payoutCap,
      }),
      this.prisma.streamShoutout.findMany({
        where: { payment: { creatorId } },
        orderBy: { createdAt: 'desc' },
        take: shoutCap,
        include: {
          payment: {
            select: {
              id: true,
              status: true,
              amount: true,
              completedAt: true,
              createdAt: true,
              user: {
                select: { name: true, tiktokUsername: true },
              },
            },
          },
        },
      }),
      this.prisma.coachingBooking.findMany({
        where: { payment: { creatorId } },
        orderBy: { createdAt: 'desc' },
        take: bookingCap,
        include: {
          payment: {
            select: {
              id: true,
              status: true,
              amount: true,
              completedAt: true,
            },
          },
        },
      }),
    ]);

    return {
      creator,
      listLimits: {
        supporters: listCap,
        payments: listCap,
        subscriptions: listCap,
        obsStreamLinks: listCap,
        payoutRequests: payoutCap,
        streamShoutouts: shoutCap,
        coachingBookings: bookingCap,
      },
      walletSummary,
      mergedSettings,
      supporters,
      payments,
      subscriptions,
      creatorRewards,
      obsStreamLinks,
      payoutRequests: payoutRequests.map((r) => ({
        ...r,
        amountKes: Number(r.amountKes),
      })),
      streamShoutouts,
      coachingBookings,
    };
  }

  async getAllUsers(
    pagination: PaginationDto,
    search?: string,
    scopedCreatorId?: string | null,
  ) {
    const where: Prisma.UserWhereInput = {
      ...this.subscriberBackedUserWhere(scopedCreatorId),
    };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { tiktokUsername: { contains: search, mode: 'insensitive' } },
        { mpesaMobile: { contains: search } },
        { whatsappNumber: { contains: search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              subscriptions: true,
              payments: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        total,
        totalPages: Math.ceil(total / (pagination.limit || 10)),
      },
    };
  }

  async getAllSubscriptions(
    pagination: PaginationDto,
    status?: string,
    search?: string,
    scopedCreatorId?: string | null,
  ) {
    const where: Prisma.SubscriptionWhereInput = {};

    if (scopedCreatorId) {
      where.creatorId = scopedCreatorId;
    }

    if (status) {
      where.status = status.toUpperCase() as SubscriptionStatus;
    }

    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' as const } } },
        { user: { tiktokUsername: { contains: search, mode: 'insensitive' as const } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: 'desc' },
        include: { user: true },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        total,
        totalPages: Math.ceil(total / (pagination.limit || 10)),
      },
    };
  }

  async getAllPayments(
    pagination: PaginationDto,
    status?: string,
    search?: string,
    purpose?: string,
    alertEmittedOnly?: boolean,
    rewardId?: string,
    scopedCreatorId?: string | null,
  ) {
    const andClauses: Prisma.PaymentWhereInput[] = [];

    if (scopedCreatorId) {
      andClauses.push({ creatorId: scopedCreatorId });
    }

    const p = purpose?.trim().toUpperCase();
    const rewardIdTrim = rewardId?.trim();
    if (rewardIdTrim) {
      andClauses.push({
        creatorRewardPurchase: { rewardId: rewardIdTrim },
      });
    }
    if (p === 'SUBSCRIPTION') {
      andClauses.push({
        OR: [{ purpose: 'SUBSCRIPTION' }, { purpose: null }],
      });
    } else if (p === 'STREAM_ALERT') {
      andClauses.push({ purpose: 'STREAM_ALERT' });
    } else if (p === 'CREATOR_REWARD') {
      andClauses.push({ purpose: 'CREATOR_REWARD' });
    } else if (p === 'COACHING_BOOKING') {
      andClauses.push({ purpose: 'COACHING_BOOKING' });
    }

    if (alertEmittedOnly) {
      andClauses.push({ subscriberAlertEmittedAt: { not: null } });
    }

    if (status) {
      andClauses.push({ status: status.toUpperCase() as PaymentStatus });
    }

    if (search) {
      const or: Prisma.PaymentWhereInput[] = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { tiktokUsername: { contains: search, mode: 'insensitive' } } },
        { transactionId: { contains: search } },
        { reference: { contains: search } },
      ];
      if (p === 'STREAM_ALERT') {
        or.push(
          { streamAlertHandle: { contains: search, mode: 'insensitive' } },
          { streamAlertMessage: { contains: search, mode: 'insensitive' } },
          {
            streamShoutout: {
              OR: [
                {
                  displayHandle: {
                    contains: search,
                    mode: 'insensitive',
                  },
                },
                {
                  message: { contains: search, mode: 'insensitive' },
                },
                {
                  platform: { contains: search, mode: 'insensitive' },
                },
                {
                  videoUrl: { contains: search, mode: 'insensitive' },
                },
              ],
            },
          },
        );
      }
      if (p === 'CREATOR_REWARD') {
        or.push({
          creatorRewardPurchase: {
            OR: [
              {
                displayName: { contains: search, mode: 'insensitive' },
              },
              {
                rewardNameSnapshot: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ],
          },
        });
      }
      andClauses.push({ OR: or });
    }

    const where: Prisma.PaymentWhereInput =
      andClauses.length > 0 ? { AND: andClauses } : {};

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
          streamShoutout: true,
          creatorRewardPurchase: { include: { reward: true } },
          coachingBookings: true,
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        total,
        totalPages: Math.ceil(total / (pagination.limit || 10)),
      },
    };
  }

  /** Paginated rows from `stream_shoutouts` (shoutout copy: handle, platform, message, amount). */
  async getStreamShoutouts(
    pagination: PaginationDto,
    search?: string,
    status?: string,
    scopedCreatorId?: string | null,
  ) {
    const andClauses: Prisma.StreamShoutoutWhereInput[] = [];

    if (scopedCreatorId) {
      andClauses.push({ payment: { creatorId: scopedCreatorId } });
    }

    if (status?.trim() && status.toLowerCase() !== 'all') {
      andClauses.push({
        payment: {
          status: status.toUpperCase() as PaymentStatus,
        },
      });
    }

    if (search?.trim()) {
      const s = search.trim();
      andClauses.push({
        OR: [
          { displayHandle: { contains: s, mode: 'insensitive' } },
          { message: { contains: s, mode: 'insensitive' } },
          { platform: { contains: s, mode: 'insensitive' } },
          { videoUrl: { contains: s, mode: 'insensitive' } },
          { payment: { id: { contains: s } } },
          { payment: { reference: { contains: s } } },
          { payment: { transactionId: { contains: s } } },
          {
            payment: {
              user: { name: { contains: s, mode: 'insensitive' } },
            },
          },
          {
            payment: {
              user: { tiktokUsername: { contains: s, mode: 'insensitive' } },
            },
          },
        ],
      });
    }

    const where: Prisma.StreamShoutoutWhereInput =
      andClauses.length > 0 ? { AND: andClauses } : {};

    const [data, total] = await Promise.all([
      this.prisma.streamShoutout.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: 'desc' },
        include: {
          payment: { include: { user: true } },
        },
      }),
      this.prisma.streamShoutout.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        total,
        totalPages: Math.ceil(total / (pagination.limit || 10)),
      },
    };
  }

  /**
   * Re-fire the OBS browser-source shoutout for a completed checkout (same payload as live completion).
   */
  async replayStreamShoutoutObsAlert(streamShoutoutId: string) {
    const row = await this.prisma.streamShoutout.findUnique({
      where: { id: streamShoutoutId },
      include: { payment: { include: { user: true } } },
    });
    if (!row) {
      throw new NotFoundException('Shoutout not found');
    }
    const pay = row.payment;
    if (!pay || pay.purpose !== PaymentPurpose.STREAM_ALERT) {
      throw new BadRequestException('Invalid shoutout payment');
    }
    if (pay.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException(
        'Only completed shoutouts can be replayed to OBS',
      );
    }

    const displayHandle =
      row.displayHandle?.trim() ||
      pay.streamAlertHandle?.trim() ||
      pay.user?.tiktokUsername?.trim() ||
      'Anonymous';
    const plat = (row.platform || pay.streamAlertPlatform || '')
      .trim()
      .toLowerCase();
    const shout = (row.message ?? pay.streamAlertMessage)?.trim();
    const amtSrc = row.amountKes ?? pay.amount;
    const amountNum = amtSrc != null ? Number(amtSrc) : Number.NaN;
    const shoutoutAmountKes = Number.isFinite(amountNum)
      ? Math.round(amountNum)
      : undefined;
    const shoutoutVideoEmbedUrl = await resolveShoutoutVideoEmbedUrlForObs(
      row.videoUrl,
    );

    const lang = this.config.get<string>('DEFAULT_OBS_TTS_LANGUAGE')?.trim();
    const langPayload = lang ? { languageCode: lang.slice(0, 20) } : {};

    await this.obsAlerts.emitSubscriberAlert(
      {
        kind: 'shoutout',
        tiktokUsername: displayHandle,
        ...(pay.creatorId ? { creatorId: pay.creatorId } : {}),
        ...langPayload,
        ...(plat && STREAM_ALERT_PLATFORM_SET.has(plat)
          ? { subscriberPlatform: plat }
          : {}),
        ...(shout
          ? {
              subscriberMessage: shout.slice(
                0,
                MAX_STREAM_ALERT_MESSAGE_LENGTH,
              ),
            }
          : {}),
        ...(shoutoutAmountKes !== undefined ? { shoutoutAmountKes } : {}),
        ...(shoutoutVideoEmbedUrl
          ? { shoutoutVideoEmbedUrl }
          : {}),
        skipGemini: true,
      },
      { requireEnabled: false },
    );

    return {
      ok: true,
      streamShoutoutId: row.id,
      displayHandle,
    };
  }

  async replayPaymentObsAlert(paymentId: string) {
    return this.paymentService.replayCompletedObsAlertByPaymentId(paymentId);
  }

  /**
   * Remove selected shoutout rows by deleting their STREAM_ALERT payments (cascades to `stream_shoutouts`).
   */
  async deleteStreamShoutouts(streamShoutoutIds: string[]): Promise<{ deleted: number }> {
    const uniqueRowIds = [...new Set(streamShoutoutIds)];
    const rows = await this.prisma.streamShoutout.findMany({
      where: { id: { in: uniqueRowIds } },
      select: { paymentId: true },
    });
    const paymentIds = [...new Set(rows.map((r) => r.paymentId))];
    if (paymentIds.length === 0) {
      return { deleted: 0 };
    }
    const result = await this.prisma.payment.deleteMany({
      where: {
        id: { in: paymentIds },
        purpose: PaymentPurpose.STREAM_ALERT,
      },
    });
    return { deleted: result.count };
  }

  async getPaymentById(
    paymentId: string,
    scopedCreatorId?: string | null,
  ) {
    const row = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: true,
        streamShoutout: true,
        creatorRewardPurchase: { include: { reward: true } },
        coachingBookings: true,
      },
    });
    if (
      scopedCreatorId &&
      row &&
      row.creatorId !== scopedCreatorId
    ) {
      return null;
    }
    return row;
  }

  async updateUser(userId: string, updateData: any) {
    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return await this.userService.update(userId, updateData);
  }

  async confirmWhatsAppAdded(userId: string) {
    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return await this.userService.update(userId, { addedToWhatsApp: true });
  }

  async markWhatsAppRemoved(userId: string) {
    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return await this.userService.update(userId, { addedToWhatsApp: false });
  }

  async updateSubscription(subscriptionId: string, updateData: any) {
    const subscription = await this.subscriptionService.findOne(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Admin can set amount directly - calculate discount if provided
    let baseAmount = updateData.amount !== undefined 
      ? parseFloat(updateData.amount.toString())
      : parseFloat(subscription.amount.toString());
    
    let finalAmount = baseAmount;
    
    // Apply discount if provided
    if (updateData.discountAmount && parseFloat(updateData.discountAmount) > 0) {
      finalAmount = Math.max(0, baseAmount - parseFloat(updateData.discountAmount));
    } else if (updateData.discountPercentage && parseFloat(updateData.discountPercentage) > 0) {
      const discount = (baseAmount * parseFloat(updateData.discountPercentage)) / 100;
      finalAmount = Math.max(0, baseAmount - discount);
    }

    // Prepare update data
    const updatePayload: any = {};

    if (updateData.months !== undefined) {
      updatePayload.months = parseInt(updateData.months);
      
      // If months changed and endDate not explicitly set, recalculate endDate
      if (!updateData.endDate && updateData.startDate) {
        const startDate = new Date(updateData.startDate);
        const newEndDate = new Date(startDate);
        newEndDate.setMonth(newEndDate.getMonth() + parseInt(updateData.months));
        updatePayload.endDate = newEndDate;
      }
    }

    // Update amount (admin sets amount directly, discount is applied if provided)
    if (finalAmount !== parseFloat(subscription.amount.toString())) {
      updatePayload.amount = finalAmount;
    } else if (updateData.amount !== undefined) {
      updatePayload.amount = parseFloat(updateData.amount);
    }

    if (updateData.startDate) {
      updatePayload.startDate = new Date(updateData.startDate);
      
      // Recalculate end date if months is set
      if (updateData.months && !updateData.endDate) {
        const startDate = new Date(updateData.startDate);
        const newEndDate = new Date(startDate);
        newEndDate.setMonth(newEndDate.getMonth() + parseInt(updateData.months));
        updatePayload.endDate = newEndDate;
      }
    }

    if (updateData.endDate) {
      updatePayload.endDate = new Date(updateData.endDate);
    }

    if (updateData.status) {
      updatePayload.status = updateData.status.toUpperCase();
    }

    const updated = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: updatePayload,
      include: { user: true },
    });

    return updated;
  }

  async createSubscription(createData: any) {
    const user = await this.userService.findOne(createData.userId);
    if (!user) {
      throw new Error('User not found');
    }

    const startDate = createData.startDate ? new Date(createData.startDate) : new Date();
    let endDate: Date;
    
    if (createData.endDate) {
      endDate = new Date(createData.endDate);
    } else {
      // Calculate end date from start date + months
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + parseInt(createData.months));
    }

    const created = await this.prisma.subscription.create({
      data: {
        userId: createData.userId,
        months: parseInt(createData.months),
        amount: parseFloat(createData.amount), // Admin sets amount directly
        startDate,
        endDate,
        status: (createData.status || 'ACTIVE').toUpperCase(),
        paymentId: createData.paymentId,
        ...(user.creatorId ? { creatorId: user.creatorId } : {}),
      },
      include: { user: true },
    });

    if (created.user) {
      const lang = this.config
        .get<string>('DEFAULT_OBS_TTS_LANGUAGE')
        ?.trim()
        .slice(0, 20);
      const subKes = Number(created.amount);
      await this.obsAlerts.emitSubscriberAlert({
        kind: 'new',
        tiktokUsername: created.user.tiktokUsername,
        ...(created.creatorId ? { creatorId: created.creatorId } : {}),
        ...(lang ? { languageCode: lang } : {}),
        ...(Number.isFinite(subKes) ? { subscriptionAmountKes: Math.round(subKes) } : {}),
      });
    }

    return created;
  }

  async updatePayment(paymentId: string, updateData: any) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    // Only allow updates if payment is pending
    if (payment.status !== 'PENDING') {
      throw new Error('Can only update pending payments');
    }

    const updatePayload: any = {};

    if (updateData.amount !== undefined) {
      updatePayload.amount = parseFloat(updateData.amount);
    }

    if (updateData.months !== undefined) {
      updatePayload.months = parseInt(updateData.months);
    }

    if (updateData.status) {
      updatePayload.status = updateData.status.toUpperCase();
    }

    return await this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id: paymentId },
        data: updatePayload,
        include: { user: true, streamShoutout: true },
      });
      if (
        payment.purpose === PaymentPurpose.STREAM_ALERT &&
        updatePayload.amount !== undefined
      ) {
        await tx.streamShoutout.updateMany({
          where: { paymentId },
          data: { amountKes: updatePayload.amount },
        });
      }
      return updated;
    });
  }

  async getSettings(scopedCreatorId?: string | null) {
    const cid = scopedCreatorId?.trim() || null;
    const patch = cid
      ? await fetchCreatorWorkspacePatch(this.prisma, cid)
      : {};

    const defaultPrice = await this.prisma.settings.findUnique({
      where: { key: 'default_monthly_price' },
    });
    const globalParsed = defaultPrice ? parseFloat(defaultPrice.value) : 1;
    const globalMonthlyRounded =
      Number.isFinite(globalParsed) && globalParsed >= 1
        ? Math.round(globalParsed)
        : 1;

    const shout = await resolveShoutoutLimits(this.prisma, cid);
    const obsTimers = await resolveObsAlertHideTimers(this.prisma, cid);
    const coachingAccountReviewKes = await resolveCoachingAccountReviewKes(
      this.prisma,
      cid,
    );

    const allRewards = await this.prisma.creatorReward.findMany({
      where: cid ? { creatorId: cid } : {},
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { id: true },
    });
    const rewardIds = allRewards.map((r) => r.id);
    const orderRow = await this.prisma.settings.findUnique({
      where: { key: SUPPORT_CATALOG_ORDER_KEY },
    });
    let parsedOrder = parseSupportCatalogOrderJson(orderRow?.value ?? null);
    if (cid) {
      const allowed = new Set(['membership', 'shoutout', ...rewardIds]);
      parsedOrder = parsedOrder?.filter((t) => allowed.has(t)) ?? null;
      const po = patch.supportCatalogOrder;
      if (po?.length) {
        const cleaned = po.filter((t) => allowed.has(t));
        if (cleaned.length) parsedOrder = cleaned;
      }
    }
    const supportCatalogOrder = mergeSupportCatalogOrder(parsedOrder, rewardIds);

    const [memTitle, memDesc, shoTitle, shoDesc, subTpl, shoutTpl] =
      await Promise.all([
      getSettingsString(this.prisma, SUPPORT_TIER_MEMBERSHIP_TITLE_KEY),
      getSettingsString(this.prisma, SUPPORT_TIER_MEMBERSHIP_DESC_KEY),
      getSettingsString(this.prisma, SUPPORT_TIER_SHOUTOUT_TITLE_KEY),
      getSettingsString(this.prisma, SUPPORT_TIER_SHOUTOUT_DESC_KEY),
      getSettingsString(this.prisma, OBS_SUBSCRIPTION_MESSAGE_TEMPLATE_KEY),
      getSettingsString(this.prisma, OBS_SHOUTOUT_MESSAGE_TEMPLATE_KEY),
    ]);
    const platformFeeRow = await this.prisma.settings.findUnique({
      where: { key: PLATFORM_FEE_PERCENT_KEY },
    });
    const platformFeeParsed = parseFloat(platformFeeRow?.value ?? '');
    const platformFeePercent =
      Number.isFinite(platformFeeParsed) &&
      platformFeeParsed >= 0 &&
      platformFeeParsed <= 100
        ? platformFeeParsed
        : DEFAULT_PLATFORM_FEE_PERCENT;

    const pickTier = (global: string | null, override?: string) => {
      if (cid && override?.trim()) return override.trim();
      return global ?? '';
    };

    return {
      defaultMonthlyPrice: cid
        ? mergeWorkspaceMonthlyPrice(globalMonthlyRounded, patch)
        : Number.isFinite(globalParsed) && globalParsed >= 1
          ? globalParsed
          : 1,
      shoutoutMinKes: shout.minKes,
      shoutoutMinKesWithVideo: shout.minKesWithVideo,
      shoutoutMaxKes: shout.maxKes,
      coachingAccountReviewKes,
      obsAlertSecsNew: obsTimers.newSecs,
      obsAlertSecsRenewal: obsTimers.renewalSecs,
      obsAlertSecsShoutout: obsTimers.shoutoutSecs,
      obsAlertSecsShoutoutVideo: obsTimers.shoutoutVideoSecs,
      supportCatalogOrder,
      supportTierMembershipTitle: pickTier(
        memTitle,
        patch.supportTierMembershipTitle,
      ),
      supportTierMembershipDescription: pickTier(
        memDesc,
        patch.supportTierMembershipDescription,
      ),
      supportTierShoutoutTitle: pickTier(
        shoTitle,
        patch.supportTierShoutoutTitle,
      ),
      supportTierShoutoutDescription: pickTier(
        shoDesc,
        patch.supportTierShoutoutDescription,
      ),
      obsSubscriptionMessageTemplate: pickTier(
        subTpl,
        patch.obsSubscriptionMessageTemplate,
      ),
      obsShoutoutMessageTemplate: pickTier(
        shoutTpl,
        patch.obsShoutoutMessageTemplate,
      ),
      platformFeePercent,
    };
  }

  private async updateCreatorWorkspaceSettings(
    updateData: Record<string, unknown>,
    creatorId: string,
  ) {
    const existing = await this.prisma.creator.findUnique({
      where: { id: creatorId },
      select: { id: true, workspaceSettings: true },
    });
    if (!existing) {
      throw new NotFoundException('Creator not found');
    }

    const patch = parseCreatorWorkspaceSettings(existing.workspaceSettings);

    if (updateData.defaultMonthlyPrice !== undefined) {
      const v = Math.round(Number(updateData.defaultMonthlyPrice));
      if (!Number.isFinite(v) || v < 1) {
        throw new BadRequestException('Invalid monthly price');
      }
      patch.defaultMonthlyPrice = v;
    }

    const touchShoutout =
      updateData.shoutoutMinKes !== undefined ||
      updateData.shoutoutMinKesWithVideo !== undefined ||
      updateData.shoutoutMaxKes !== undefined;

    if (touchShoutout) {
      const cur = await resolveShoutoutLimits(this.prisma, creatorId);
      let minKes = cur.minKes;
      let minKesWithVideo = cur.minKesWithVideo;
      let maxKes = cur.maxKes;

      if (updateData.shoutoutMinKes !== undefined) {
        minKes = Math.round(Number(updateData.shoutoutMinKes));
      }
      if (updateData.shoutoutMinKesWithVideo !== undefined) {
        minKesWithVideo = Math.round(
          Number(updateData.shoutoutMinKesWithVideo),
        );
      }
      if (updateData.shoutoutMaxKes !== undefined) {
        maxKes = Math.round(Number(updateData.shoutoutMaxKes));
      }

      if (!Number.isFinite(minKes) || minKes < 1) {
        throw new BadRequestException('Invalid shoutout base minimum (KES)');
      }
      if (!Number.isFinite(minKesWithVideo) || minKesWithVideo < 1) {
        throw new BadRequestException(
          'Invalid shoutout minimum with clip (KES)',
        );
      }
      if (!Number.isFinite(maxKes) || maxKes < 1) {
        throw new BadRequestException('Invalid shoutout maximum (KES)');
      }
      if (minKesWithVideo < minKes) {
        throw new BadRequestException(
          'Minimum with clip must be greater than or equal to base shoutout minimum',
        );
      }
      if (maxKes < minKesWithVideo) {
        throw new BadRequestException(
          'Maximum shoutout amount must be at least the minimum with clip',
        );
      }

      patch.shoutoutMinKes = minKes;
      patch.shoutoutMinKesWithVideo = minKesWithVideo;
      patch.shoutoutMaxKes = maxKes;
    }

    if (updateData.coachingAccountReviewKes !== undefined) {
      const kes = Math.round(Number(updateData.coachingAccountReviewKes));
      if (!Number.isFinite(kes) || kes < 1 || kes > 10_000_000) {
        throw new BadRequestException(
          'Account review checkout amount must be between 1 and 10,000,000 KES',
        );
      }
      patch.coachingAccountReviewKes = kes;
    }

    const touchObsTimers =
      updateData.obsAlertSecsNew !== undefined ||
      updateData.obsAlertSecsRenewal !== undefined ||
      updateData.obsAlertSecsShoutout !== undefined ||
      updateData.obsAlertSecsShoutoutVideo !== undefined;

    if (touchObsTimers) {
      const cur = await resolveObsAlertHideTimers(this.prisma, creatorId);
      let newS = cur.newSecs;
      let renewalS = cur.renewalSecs;
      let shoutS = cur.shoutoutSecs;
      let shoutVidS = cur.shoutoutVideoSecs;

      if (updateData.obsAlertSecsNew !== undefined) {
        newS = Math.round(Number(updateData.obsAlertSecsNew));
      }
      if (updateData.obsAlertSecsRenewal !== undefined) {
        renewalS = Math.round(Number(updateData.obsAlertSecsRenewal));
      }
      if (updateData.obsAlertSecsShoutout !== undefined) {
        shoutS = Math.round(Number(updateData.obsAlertSecsShoutout));
      }
      if (updateData.obsAlertSecsShoutoutVideo !== undefined) {
        shoutVidS = Math.round(Number(updateData.obsAlertSecsShoutoutVideo));
      }

      const validateSecs = (label: string, v: number) => {
        if (!Number.isFinite(v)) {
          throw new BadRequestException(`Invalid ${label}`);
        }
        if (v < OBS_ALERT_TIMER_MIN_SEC || v > OBS_ALERT_TIMER_MAX_SEC) {
          throw new BadRequestException(
            `${label} must be between ${OBS_ALERT_TIMER_MIN_SEC} and ${OBS_ALERT_TIMER_MAX_SEC} seconds`,
          );
        }
      };
      validateSecs('New subscriber display time', newS);
      validateSecs('Renewal display time', renewalS);
      validateSecs('Shoutout (no clip) display time', shoutS);
      validateSecs('Shoutout (with clip) display time', shoutVidS);

      patch.obsAlertSecsNew = newS;
      patch.obsAlertSecsRenewal = renewalS;
      patch.obsAlertSecsShoutout = shoutS;
      patch.obsAlertSecsShoutoutVideo = shoutVidS;
    }

    const touchSupportCatalog =
      updateData.supportCatalogOrder !== undefined ||
      updateData.supportTierMembershipTitle !== undefined ||
      updateData.supportTierMembershipDescription !== undefined ||
      updateData.supportTierShoutoutTitle !== undefined ||
      updateData.supportTierShoutoutDescription !== undefined ||
      updateData.obsSubscriptionMessageTemplate !== undefined ||
      updateData.obsShoutoutMessageTemplate !== undefined;

    if (touchSupportCatalog) {
      if (updateData.supportCatalogOrder !== undefined) {
        const rewardRows = await this.prisma.creatorReward.findMany({
          where: { creatorId },
          select: { id: true },
        });
        const idSet = new Set(rewardRows.map((r) => r.id));
        const raw = Array.isArray(updateData.supportCatalogOrder)
          ? updateData.supportCatalogOrder
          : [];
        const cleaned = raw.filter(
          (t: unknown): t is string =>
            typeof t === 'string' &&
            (t === 'membership' || t === 'shoutout' || idSet.has(t)),
        );
        patch.supportCatalogOrder = cleaned;
      }

      const saveTierToPatch = (field: string, storage: string) => {
        if (updateData[field] === undefined) return;
        const s = String(updateData[field] ?? '').trim();
        if (s.length > 0) {
          (patch as Record<string, unknown>)[storage as string] = s;
        } else {
          delete (patch as Record<string, unknown>)[storage as string];
        }
      };

      saveTierToPatch(
        'supportTierMembershipTitle',
        'supportTierMembershipTitle',
      );
      saveTierToPatch(
        'supportTierMembershipDescription',
        'supportTierMembershipDescription',
      );
      saveTierToPatch('supportTierShoutoutTitle', 'supportTierShoutoutTitle');
      saveTierToPatch(
        'supportTierShoutoutDescription',
        'supportTierShoutoutDescription',
      );
      saveTierToPatch(
        'obsSubscriptionMessageTemplate',
        'obsSubscriptionMessageTemplate',
      );
      saveTierToPatch('obsShoutoutMessageTemplate', 'obsShoutoutMessageTemplate');
    }

    await this.prisma.creator.update({
      where: { id: creatorId },
      data: { workspaceSettings: patch as Prisma.InputJsonValue },
    });

    return await this.getSettings(creatorId);
  }

  async updateSettings(updateData: any, scopedCreatorId?: string | null) {
    const cid = scopedCreatorId?.trim() || null;
    if (cid) {
      return this.updateCreatorWorkspaceSettings(updateData, cid);
    }
    if (updateData.defaultMonthlyPrice !== undefined) {
      await this.prisma.settings.upsert({
        where: { key: 'default_monthly_price' },
        update: { value: updateData.defaultMonthlyPrice.toString() },
        create: {
          key: 'default_monthly_price',
          value: updateData.defaultMonthlyPrice.toString(),
        },
      });
    }

    const touchShoutout =
      updateData.shoutoutMinKes !== undefined ||
      updateData.shoutoutMinKesWithVideo !== undefined ||
      updateData.shoutoutMaxKes !== undefined;

    if (touchShoutout) {
      const cur = await resolveShoutoutLimits(this.prisma);
      let minKes = cur.minKes;
      let minKesWithVideo = cur.minKesWithVideo;
      let maxKes = cur.maxKes;

      if (updateData.shoutoutMinKes !== undefined) {
        minKes = Math.round(Number(updateData.shoutoutMinKes));
      }
      if (updateData.shoutoutMinKesWithVideo !== undefined) {
        minKesWithVideo = Math.round(Number(updateData.shoutoutMinKesWithVideo));
      }
      if (updateData.shoutoutMaxKes !== undefined) {
        maxKes = Math.round(Number(updateData.shoutoutMaxKes));
      }

      if (!Number.isFinite(minKes) || minKes < 1) {
        throw new BadRequestException('Invalid shoutout base minimum (KES)');
      }
      if (!Number.isFinite(minKesWithVideo) || minKesWithVideo < 1) {
        throw new BadRequestException('Invalid shoutout minimum with clip (KES)');
      }
      if (!Number.isFinite(maxKes) || maxKes < 1) {
        throw new BadRequestException('Invalid shoutout maximum (KES)');
      }
      if (minKesWithVideo < minKes) {
        throw new BadRequestException(
          'Minimum with clip must be greater than or equal to base shoutout minimum',
        );
      }
      if (maxKes < minKesWithVideo) {
        throw new BadRequestException(
          'Maximum shoutout amount must be at least the minimum with clip',
        );
      }

      await this.prisma.settings.upsert({
        where: { key: SHOUTOUT_MIN_KES_KEY },
        update: { value: String(minKes) },
        create: { key: SHOUTOUT_MIN_KES_KEY, value: String(minKes) },
      });
      await this.prisma.settings.upsert({
        where: { key: SHOUTOUT_MIN_KES_WITH_VIDEO_KEY },
        update: { value: String(minKesWithVideo) },
        create: {
          key: SHOUTOUT_MIN_KES_WITH_VIDEO_KEY,
          value: String(minKesWithVideo),
        },
      });
      await this.prisma.settings.upsert({
        where: { key: SHOUTOUT_MAX_KES_KEY },
        update: { value: String(maxKes) },
        create: { key: SHOUTOUT_MAX_KES_KEY, value: String(maxKes) },
      });
    }

    if (updateData.coachingAccountReviewKes !== undefined) {
      const kes = Math.round(Number(updateData.coachingAccountReviewKes));
      if (!Number.isFinite(kes) || kes < 1 || kes > 10_000_000) {
        throw new BadRequestException(
          'Account review checkout amount must be between 1 and 10,000,000 KES',
        );
      }
      await this.prisma.settings.upsert({
        where: { key: COACHING_ACCOUNT_REVIEW_KES_KEY },
        update: { value: String(kes) },
        create: {
          key: COACHING_ACCOUNT_REVIEW_KES_KEY,
          value: String(kes),
        },
      });
    }

    if (updateData.platformFeePercent !== undefined) {
      const pctRaw = Number(updateData.platformFeePercent);
      if (!Number.isFinite(pctRaw) || pctRaw < 0 || pctRaw > 100) {
        throw new BadRequestException(
          'Platform fee percent must be between 0 and 100',
        );
      }
      const pct = Math.round(pctRaw * 100) / 100;
      await this.prisma.settings.upsert({
        where: { key: PLATFORM_FEE_PERCENT_KEY },
        update: { value: String(pct) },
        create: {
          key: PLATFORM_FEE_PERCENT_KEY,
          value: String(pct),
        },
      });
    }

    const touchObsTimers =
      updateData.obsAlertSecsNew !== undefined ||
      updateData.obsAlertSecsRenewal !== undefined ||
      updateData.obsAlertSecsShoutout !== undefined ||
      updateData.obsAlertSecsShoutoutVideo !== undefined;

    if (touchObsTimers) {
      const cur = await resolveObsAlertHideTimers(this.prisma);
      let newS = cur.newSecs;
      let renewalS = cur.renewalSecs;
      let shoutS = cur.shoutoutSecs;
      let shoutVidS = cur.shoutoutVideoSecs;

      if (updateData.obsAlertSecsNew !== undefined) {
        newS = Math.round(Number(updateData.obsAlertSecsNew));
      }
      if (updateData.obsAlertSecsRenewal !== undefined) {
        renewalS = Math.round(Number(updateData.obsAlertSecsRenewal));
      }
      if (updateData.obsAlertSecsShoutout !== undefined) {
        shoutS = Math.round(Number(updateData.obsAlertSecsShoutout));
      }
      if (updateData.obsAlertSecsShoutoutVideo !== undefined) {
        shoutVidS = Math.round(Number(updateData.obsAlertSecsShoutoutVideo));
      }

      const validateSecs = (label: string, v: number) => {
        if (!Number.isFinite(v)) {
          throw new BadRequestException(`Invalid ${label}`);
        }
        if (v < OBS_ALERT_TIMER_MIN_SEC || v > OBS_ALERT_TIMER_MAX_SEC) {
          throw new BadRequestException(
            `${label} must be between ${OBS_ALERT_TIMER_MIN_SEC} and ${OBS_ALERT_TIMER_MAX_SEC} seconds`,
          );
        }
      };
      validateSecs('New subscriber display time', newS);
      validateSecs('Renewal display time', renewalS);
      validateSecs('Shoutout (no clip) display time', shoutS);
      validateSecs('Shoutout (with clip) display time', shoutVidS);

      await this.prisma.settings.upsert({
        where: { key: OBS_ALERT_SECS_NEW_KEY },
        update: { value: String(newS) },
        create: { key: OBS_ALERT_SECS_NEW_KEY, value: String(newS) },
      });
      await this.prisma.settings.upsert({
        where: { key: OBS_ALERT_SECS_RENEWAL_KEY },
        update: { value: String(renewalS) },
        create: { key: OBS_ALERT_SECS_RENEWAL_KEY, value: String(renewalS) },
      });
      await this.prisma.settings.upsert({
        where: { key: OBS_ALERT_SECS_SHOUTOUT_KEY },
        update: { value: String(shoutS) },
        create: { key: OBS_ALERT_SECS_SHOUTOUT_KEY, value: String(shoutS) },
      });
      await this.prisma.settings.upsert({
        where: { key: OBS_ALERT_SECS_SHOUTOUT_VIDEO_KEY },
        update: { value: String(shoutVidS) },
        create: {
          key: OBS_ALERT_SECS_SHOUTOUT_VIDEO_KEY,
          value: String(shoutVidS),
        },
      });
    }

    const touchSupportCatalog =
      updateData.supportCatalogOrder !== undefined ||
      updateData.supportTierMembershipTitle !== undefined ||
      updateData.supportTierMembershipDescription !== undefined ||
      updateData.supportTierShoutoutTitle !== undefined ||
      updateData.supportTierShoutoutDescription !== undefined ||
      updateData.obsSubscriptionMessageTemplate !== undefined ||
      updateData.obsShoutoutMessageTemplate !== undefined;

    if (touchSupportCatalog) {
      if (updateData.supportCatalogOrder !== undefined) {
        const allIds = await this.prisma.creatorReward.findMany({
          select: { id: true },
        });
        const idSet = new Set(allIds.map((r) => r.id));
        const raw = Array.isArray(updateData.supportCatalogOrder)
          ? updateData.supportCatalogOrder
          : [];
        const cleaned = raw.filter(
          (t: unknown): t is string =>
            typeof t === 'string' &&
            (t === 'membership' || t === 'shoutout' || idSet.has(t)),
        );
        await this.prisma.settings.upsert({
          where: { key: SUPPORT_CATALOG_ORDER_KEY },
          update: { value: JSON.stringify(cleaned) },
          create: {
            key: SUPPORT_CATALOG_ORDER_KEY,
            value: JSON.stringify(cleaned),
          },
        });
      }

      const saveOptionalText = async (key: string, field: string) => {
        if (updateData[field] === undefined) return;
        const s = String(updateData[field] ?? '').trim();
        if (s.length > 0) {
          await this.prisma.settings.upsert({
            where: { key },
            update: { value: s },
            create: { key, value: s },
          });
        } else {
          await this.prisma.settings.deleteMany({ where: { key } });
        }
      };

      await saveOptionalText(
        SUPPORT_TIER_MEMBERSHIP_TITLE_KEY,
        'supportTierMembershipTitle',
      );
      await saveOptionalText(
        SUPPORT_TIER_MEMBERSHIP_DESC_KEY,
        'supportTierMembershipDescription',
      );
      await saveOptionalText(
        SUPPORT_TIER_SHOUTOUT_TITLE_KEY,
        'supportTierShoutoutTitle',
      );
      await saveOptionalText(
        SUPPORT_TIER_SHOUTOUT_DESC_KEY,
        'supportTierShoutoutDescription',
      );
      await saveOptionalText(
        OBS_SUBSCRIPTION_MESSAGE_TEMPLATE_KEY,
        'obsSubscriptionMessageTemplate',
      );
      await saveOptionalText(
        OBS_SHOUTOUT_MESSAGE_TEMPLATE_KEY,
        'obsShoutoutMessageTemplate',
      );
    }

    return await this.getSettings();
  }

  /** Completed M-Pesa revenue by source; dates are Nairobi (EAT) calendar days. */
  async getRevenueBreakdown(
    query: {
      preset?: string;
      from?: string;
      to?: string;
    },
    scopedCreatorId?: string | null,
  ) {
    const preset = (query.preset || 'today') as RevenuePreset;
    let fromYmd: string;
    let toYmd: string;
    try {
      const r = resolveRevenueRangeNairobi(
        preset === 'custom' ? 'custom' : preset,
        query.from,
        query.to,
      );
      fromYmd = r.fromYmd;
      toYmd = r.toYmd;
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Invalid date range',
      );
    }

    const dayKeys = enumerateNairobiDays(fromYmd, toYmd);
    if (dayKeys.length > 366) {
      throw new BadRequestException('Date range cannot exceed 366 days');
    }

    const { startUtc, endUtc } = nairobiRangeToUtcBounds(fromYmd, toYmd);

    const rows = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.COMPLETED,
        completedAt: { gte: startUtc, lte: endUtc },
        amount: { not: null },
        ...(scopedCreatorId ? { creatorId: scopedCreatorId } : {}),
      },
      select: {
        id: true,
        amount: true,
        purpose: true,
        completedAt: true,
      },
    });
    const platformFeeRow = await this.prisma.settings.findUnique({
      where: { key: PLATFORM_FEE_PERCENT_KEY },
    });
    const platformFeeParsed = parseFloat(platformFeeRow?.value ?? '');
    const platformFeePercent =
      Number.isFinite(platformFeeParsed) &&
      platformFeeParsed >= 0 &&
      platformFeeParsed <= 100
        ? platformFeeParsed
        : DEFAULT_PLATFORM_FEE_PERCENT;

    const REVENUE_FEE_LINES = 50;

    type Bucket = 'subscription' | 'shoutout' | 'accountReview' | 'other';
    const bucketPurpose = (p: PaymentPurpose | null): Bucket => {
      if (p === PaymentPurpose.STREAM_ALERT) return 'shoutout';
      if (p === PaymentPurpose.COACHING_BOOKING) return 'accountReview';
      if (p === PaymentPurpose.SUBSCRIPTION || p == null) {
        return 'subscription';
      }
      return 'other';
    };

    const roundKes = (n: number) => Math.round(n * 100) / 100;

    const sources: Record<
      Bucket,
      { key: Bucket; label: string; kes: number; count: number }
    > = {
      subscription: {
        key: 'subscription',
        label: 'Subscriptions',
        kes: 0,
        count: 0,
      },
      shoutout: { key: 'shoutout', label: 'Shoutouts', kes: 0, count: 0 },
      accountReview: {
        key: 'accountReview',
        label: 'Account review (coaching)',
        kes: 0,
        count: 0,
      },
      other: { key: 'other', label: 'Other', kes: 0, count: 0 },
    };

    type DailyAgg = {
      subscriptionKes: number;
      shoutoutKes: number;
      accountReviewKes: number;
      otherKes: number;
    };
    const dailyMap = new Map<string, DailyAgg>();
    for (const d of dayKeys) {
      dailyMap.set(d, {
        subscriptionKes: 0,
        shoutoutKes: 0,
        accountReviewKes: 0,
        otherKes: 0,
      });
    }

    let totalKes = 0;
    let totalCount = 0;
    let platformFeeKesAcc = 0;

    for (const row of rows) {
      if (!row.completedAt) continue;
      const amt = Number(row.amount);
      if (!Number.isFinite(amt)) continue;
      const b = bucketPurpose(row.purpose);
      sources[b].kes += amt;
      sources[b].count += 1;
      totalKes += amt;
      totalCount += 1;
      platformFeeKesAcc += roundKes((amt * platformFeePercent) / 100);

      const day = nairobiYmd(row.completedAt);
      const cell = dailyMap.get(day);
      if (cell) {
        if (b === 'subscription') cell.subscriptionKes += amt;
        else if (b === 'shoutout') cell.shoutoutKes += amt;
        else if (b === 'accountReview') cell.accountReviewKes += amt;
        else cell.otherKes += amt;
      }
    }

    for (const b of Object.keys(sources) as Bucket[]) {
      sources[b].kes = roundKes(sources[b].kes);
    }
    totalKes = roundKes(totalKes);
    const platformFeeKes = roundKes(platformFeeKesAcc);
    const creatorNetKes = roundKes(totalKes - platformFeeKes);

    const daily = dayKeys.map((date) => {
      const c = dailyMap.get(date)!;
      const t =
        c.subscriptionKes +
        c.shoutoutKes +
        c.accountReviewKes +
        c.otherKes;
      return {
        date,
        subscriptionKes: roundKes(c.subscriptionKes),
        shoutoutKes: roundKes(c.shoutoutKes),
        accountReviewKes: roundKes(c.accountReviewKes),
        otherKes: roundKes(c.otherKes),
        totalKes: roundKes(t),
      };
    });

    const paymentFeeLines = [...rows]
      .filter((row) => row.completedAt && Number.isFinite(Number(row.amount)))
      .sort(
        (a, b) =>
          (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0),
      )
      .slice(0, REVENUE_FEE_LINES)
      .map((row) => {
        const amt = Number(row.amount);
        const fee = roundKes((amt * platformFeePercent) / 100);
        return {
          id: row.id,
          completedAt: row.completedAt!.toISOString(),
          amountKes: roundKes(amt),
          feeKes: fee,
          netKes: roundKes(amt - fee),
          purpose: row.purpose,
        };
      });

    return {
      preset: preset === 'custom' ? 'custom' : preset,
      timezone: 'Africa/Nairobi',
      from: fromYmd,
      to: toYmd,
      rangeStartUtc: startUtc.toISOString(),
      rangeEndUtc: endUtc.toISOString(),
      totalKes,
      platformFeePercent,
      platformFeeKes,
      creatorNetKes,
      totalCount,
      sources: [
        sources.subscription,
        sources.shoutout,
        sources.accountReview,
        sources.other,
      ],
      daily,
      paymentFeeLines,
      paymentFeeLinesLimit: REVENUE_FEE_LINES,
    };
  }

  /**
   * Leaderboards scoped to one creator (creator portal).
   * Contributors: completed payment totals (all purposes). Subscribers: membership payments only (subscription + legacy null purpose).
   */
  async getCreatorSupporterRankings(creatorId: string, limitRaw?: number) {
    const limit = Math.min(100, Math.max(1, Math.round(Number(limitRaw)) || 25));

    const [contributorGroups, subscriberGroups] = await Promise.all([
      this.prisma.payment.groupBy({
        by: ['userId'],
        where: {
          creatorId,
          status: PaymentStatus.COMPLETED,
          userId: { not: null },
          amount: { not: null },
        },
        _sum: { amount: true, months: true },
        _count: { _all: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: limit,
      }),
      this.prisma.payment.groupBy({
        by: ['userId'],
        where: {
          creatorId,
          status: PaymentStatus.COMPLETED,
          userId: { not: null },
          amount: { not: null },
          OR: [
            { purpose: PaymentPurpose.SUBSCRIPTION },
            { purpose: null },
          ],
        },
        _sum: { amount: true, months: true },
        _count: { _all: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: limit,
      }),
    ]);

    const allUserIds = [
      ...new Set(
        [...contributorGroups, ...subscriberGroups]
          .map((g) => g.userId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const users =
      allUserIds.length === 0
        ? []
        : await this.prisma.user.findMany({
            where: { id: { in: allUserIds }, creatorId },
            select: { id: true, name: true, tiktokUsername: true, isActive: true },
          });
    const userById = new Map(users.map((u) => [u.id, u]));

    const round2 = (n: number) => Math.round(n * 100) / 100;

    const contributors = contributorGroups.map((g, idx) => {
      const uid = g.userId as string;
      const u = userById.get(uid);
      const totalKes = round2(Number(g._sum.amount ?? 0));
      return {
        rank: idx + 1,
        userId: uid,
        displayName:
          u?.name?.trim() ||
          (u?.tiktokUsername ? `@${u.tiktokUsername}` : null) ||
          `Supporter ${uid.slice(0, 8)}`,
        tiktokUsername: u?.tiktokUsername ?? null,
        isActive: u?.isActive ?? true,
        totalKes,
        completedPaymentCount: g._count._all,
      };
    });

    const subscribers = subscriberGroups.map((g, idx) => {
      const uid = g.userId as string;
      const u = userById.get(uid);
      const totalKes = round2(Number(g._sum.amount ?? 0));
      const totalMonthsSubscribed = round2(Number(g._sum.months ?? 0));
      return {
        rank: idx + 1,
        userId: uid,
        displayName:
          u?.name?.trim() ||
          (u?.tiktokUsername ? `@${u.tiktokUsername}` : null) ||
          `Supporter ${uid.slice(0, 8)}`,
        tiktokUsername: u?.tiktokUsername ?? null,
        isActive: u?.isActive ?? true,
        totalKes,
        totalMonthsSubscribed,
        completedSubscriptionPayments: g._count._all,
      };
    });

    return { limit, contributors, subscribers };
  }

  /**
   * Creator wallet summary (all-time completed revenue).
   * Platform fee is applied per completed payment (percent × amount, rounded to 2 dp per tx), then summed.
   */
  async getCreatorWalletSummary(scopedCreatorId: string) {
    const rows = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.COMPLETED,
        amount: { not: null },
        creatorId: scopedCreatorId,
      },
      select: {
        id: true,
        amount: true,
        purpose: true,
        completedAt: true,
      },
    });

    const platformFeeRow = await this.prisma.settings.findUnique({
      where: { key: PLATFORM_FEE_PERCENT_KEY },
    });
    const platformFeeParsed = parseFloat(platformFeeRow?.value ?? '');
    const platformFeePercent =
      Number.isFinite(platformFeeParsed) &&
      platformFeeParsed >= 0 &&
      platformFeeParsed <= 100
        ? platformFeeParsed
        : DEFAULT_PLATFORM_FEE_PERCENT;

    const roundKes = (n: number) => Math.round(n * 100) / 100;

    const byPurpose = {
      subscriptionKes: 0,
      shoutoutKes: 0,
      coachingKes: 0,
      creatorRewardKes: 0,
      otherKes: 0,
    };
    let grossKes = 0;
    let completedPayments = 0;
    let feeKesAcc = 0;

    for (const row of rows) {
      const amt = Number(row.amount);
      if (!Number.isFinite(amt)) continue;
      grossKes += amt;
      completedPayments += 1;
      feeKesAcc += roundKes((amt * platformFeePercent) / 100);
      if (row.purpose === PaymentPurpose.SUBSCRIPTION || row.purpose == null) {
        byPurpose.subscriptionKes += amt;
      } else if (row.purpose === PaymentPurpose.STREAM_ALERT) {
        byPurpose.shoutoutKes += amt;
      } else if (row.purpose === PaymentPurpose.COACHING_BOOKING) {
        byPurpose.coachingKes += amt;
      } else if (row.purpose === PaymentPurpose.CREATOR_REWARD) {
        byPurpose.creatorRewardKes += amt;
      } else {
        byPurpose.otherKes += amt;
      }
    }

    const feeKes = roundKes(feeKesAcc);
    const netKes = roundKes(grossKes - feeKes);

    const WALLET_FEE_LINES = 40;
    const recentFeeLines = [...rows]
      .filter((row) => Number.isFinite(Number(row.amount)))
      .sort((a, b) => {
        const ta = a.completedAt?.getTime() ?? 0;
        const tb = b.completedAt?.getTime() ?? 0;
        return tb - ta;
      })
      .slice(0, WALLET_FEE_LINES)
      .map((row) => {
        const amt = Number(row.amount);
        const fee = roundKes((amt * platformFeePercent) / 100);
        return {
          id: row.id,
          completedAt: row.completedAt?.toISOString() ?? null,
          amountKes: roundKes(amt),
          feeKes: fee,
          netKes: roundKes(amt - fee),
          purpose: row.purpose,
        };
      });

    return {
      completedPayments,
      platformFeePercent,
      totals: {
        grossKes: roundKes(grossKes),
        feeKes,
        netKes,
      },
      byPurpose: {
        subscriptionKes: roundKes(byPurpose.subscriptionKes),
        shoutoutKes: roundKes(byPurpose.shoutoutKes),
        coachingKes: roundKes(byPurpose.coachingKes),
        creatorRewardKes: roundKes(byPurpose.creatorRewardKes),
        otherKes: roundKes(byPurpose.otherKes),
      },
      recentFeeLines,
      recentFeeLinesLimit: WALLET_FEE_LINES,
    };
  }

  async getCreatorPayoutRequests(scopedCreatorId: string) {
    const rows = await this.prisma.payoutRequest.findMany({
      where: { creatorId: scopedCreatorId },
      orderBy: [{ createdAt: 'desc' }],
    });
    return rows.map((r) => ({
      ...r,
      amountKes: Number(r.amountKes),
    }));
  }

  private async getCreatorAvailablePayoutKes(scopedCreatorId: string) {
    const wallet = await this.getCreatorWalletSummary(scopedCreatorId);
    const lockedRows = await this.prisma.payoutRequest.findMany({
      where: {
        creatorId: scopedCreatorId,
        status: {
          in: [
            PayoutRequestStatus.PENDING,
            PayoutRequestStatus.APPROVED,
            PayoutRequestStatus.PAID,
          ],
        },
      },
      select: { amountKes: true },
    });
    const lockedKes = lockedRows.reduce((sum, row) => {
      const n = Number(row.amountKes);
      return Number.isFinite(n) ? sum + n : sum;
    }, 0);
    const availableKes = Math.max(0, wallet.totals.netKes - lockedKes);
    return Math.round(availableKes * 100) / 100;
  }

  async createCreatorPayoutRequest(
    scopedCreatorId: string,
    body: { amountKes: number; payoutChannel?: string; notes?: string },
  ) {
    const amountKes = Math.round(Number(body.amountKes) * 100) / 100;
    if (!Number.isFinite(amountKes) || amountKes <= 0) {
      throw new BadRequestException('Invalid payout amount');
    }
    if (amountKes < MIN_PAYOUT_REQUEST_KES) {
      throw new BadRequestException(
        `Minimum payout request is KES ${MIN_PAYOUT_REQUEST_KES}`,
      );
    }
    const pendingExists = await this.prisma.payoutRequest.findFirst({
      where: {
        creatorId: scopedCreatorId,
        status: PayoutRequestStatus.PENDING,
      },
      select: { id: true },
    });
    if (pendingExists) {
      throw new BadRequestException(
        'You already have a pending payout request. Wait for review before creating another one.',
      );
    }
    const availableKes = await this.getCreatorAvailablePayoutKes(scopedCreatorId);
    if (amountKes > availableKes) {
      throw new BadRequestException(
        `Requested amount exceeds available balance (KES ${availableKes})`,
      );
    }
    const row = await this.prisma.payoutRequest.create({
      data: {
        creatorId: scopedCreatorId,
        amountKes,
        payoutChannel: body.payoutChannel?.trim().slice(0, 80) || null,
        notes: body.notes?.trim().slice(0, 1000) || null,
      },
    });
    return {
      ...row,
      amountKes: Number(row.amountKes),
      availableKesAfterRequest: Math.max(
        0,
        Math.round((availableKes - amountKes) * 100) / 100,
      ),
    };
  }

  async listPayoutRequests(
    query: { page?: number; limit?: number; search?: string; status?: string },
    scopedCreatorId?: string | null,
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;
    const search = query.search?.trim();
    const status = query.status?.trim().toUpperCase();
    const where: Prisma.PayoutRequestWhereInput = {
      ...(scopedCreatorId ? { creatorId: scopedCreatorId } : {}),
      ...(status &&
      (status === 'PENDING' ||
        status === 'APPROVED' ||
        status === 'REJECTED' ||
        status === 'PAID')
        ? { status: status as PayoutRequestStatus }
        : {}),
      ...(search
        ? {
            OR: [
              { payoutChannel: { contains: search, mode: 'insensitive' } },
              { notes: { contains: search, mode: 'insensitive' } },
              {
                creator: {
                  OR: [
                    { slug: { contains: search, mode: 'insensitive' } },
                    { displayName: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                  ],
                },
              },
            ],
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.payoutRequest.count({ where }),
      this.prisma.payoutRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
        include: {
          creator: {
            select: {
              id: true,
              slug: true,
              displayName: true,
              email: true,
            },
          },
        },
      }),
    ]);
    return {
      data: rows.map((r) => ({
        ...r,
        amountKes: Number(r.amountKes),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async reviewPayoutRequest(
    id: string,
    body: { status: 'APPROVED' | 'REJECTED' | 'PAID'; notes?: string; payoutReference?: string },
    reviewerLabel?: string,
  ) {
    const existing = await this.prisma.payoutRequest.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Payout request not found');
    }
    if (body.status === 'PAID' && existing.status !== PayoutRequestStatus.APPROVED) {
      throw new BadRequestException('Only approved payout requests can be marked as paid');
    }
    const now = new Date();
    const row = await this.prisma.payoutRequest.update({
      where: { id },
      data: {
        status: body.status as PayoutRequestStatus,
        notes: body.notes?.trim().slice(0, 1000) || existing.notes || null,
        payoutReference:
          body.payoutReference?.trim().slice(0, 120) ||
          existing.payoutReference ||
          null,
        reviewedBy: reviewerLabel?.trim().slice(0, 120) || existing.reviewedBy || null,
        reviewedAt:
          body.status === 'APPROVED' || body.status === 'REJECTED'
            ? now
            : existing.reviewedAt,
        paidAt: body.status === 'PAID' ? now : existing.paidAt,
      },
      include: {
        creator: {
          select: {
            id: true,
            slug: true,
            displayName: true,
            email: true,
          },
        },
      },
    });
    return {
      ...row,
      amountKes: Number(row.amountKes),
    };
  }

  async getCoachingBookings(pagination: PaginationDto, status?: string) {
    const where: Prisma.CoachingBookingWhereInput = {};
    if (status && status !== 'all') {
      const upper = status.toUpperCase() as CoachingBookingStatus;
      if (Object.values(CoachingBookingStatus).includes(upper)) {
        where.status = upper;
      }
    }
    const take = pagination.take;
    const [data, total] = await Promise.all([
      this.prisma.coachingBooking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take,
      }),
      this.prisma.coachingBooking.count({ where }),
    ]);
    return {
      data,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async updateCoachingBooking(id: string, dto: UpdateCoachingBookingAdminDto) {
    const existing = await this.prisma.coachingBooking.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Booking not found');
    }
    return this.prisma.coachingBooking.update({
      where: { id },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.adminNotes !== undefined
          ? { adminNotes: dto.adminNotes.trim() || null }
          : {}),
      },
    });
  }

  async getCreatorRewardsAdmin(scopedCreatorId?: string | null) {
    const rows = await this.prisma.creatorReward.findMany({
      where: scopedCreatorId ? { creatorId: scopedCreatorId } : {},
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((r) => ({
      ...r,
      amountKes: Number(r.amountKes),
    }));
  }

  async createCreatorReward(
    dto: CreateCreatorRewardDto,
    forcedCreatorId?: string | null,
  ) {
    const creatorId =
      forcedCreatorId?.trim() ||
      (await resolveDefaultCreatorId(this.prisma)) ||
      undefined;
    const limits = await resolveShoutoutLimits(this.prisma, creatorId ?? null);
    if (dto.amountKes > limits.maxKes) {
      throw new BadRequestException(`Amount cannot exceed KES ${limits.maxKes}`);
    }
    if (dto.allowVideoClip && dto.amountKes < limits.minKesWithVideo) {
      throw new BadRequestException(
        `Price must be at least KES ${limits.minKesWithVideo} when a TikTok clip is allowed on this tier.`,
      );
    }
    return this.prisma.creatorReward.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        amountKes: dto.amountKes,
        alertBannerLabel: dto.alertBannerLabel.trim(),
        ttsScript: dto.ttsScript?.trim() || null,
        allowSupporterMessage: dto.allowSupporterMessage !== false,
        allowVideoClip: dto.allowVideoClip === true,
        maxMessageLength: dto.maxMessageLength ?? 200,
        active: dto.active !== false,
        sortOrder: dto.sortOrder ?? 0,
        accentColor: dto.accentColor ?? null,
        ...(creatorId ? { creatorId } : {}),
      },
    });
  }

  async updateCreatorReward(
    id: string,
    dto: UpdateCreatorRewardDto,
    scopedCreatorId?: string | null,
  ) {
    const existing = await this.prisma.creatorReward.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Reward not found');
    }
    if (
      scopedCreatorId &&
      existing.creatorId !== scopedCreatorId
    ) {
      throw new NotFoundException('Reward not found');
    }
    const rewardCreator = existing.creatorId ?? scopedCreatorId ?? null;
    const limits = await resolveShoutoutLimits(this.prisma, rewardCreator);
    const nextAmount =
      dto.amountKes !== undefined
        ? dto.amountKes
        : Number(existing.amountKes);
    const nextVideo =
      dto.allowVideoClip !== undefined
        ? dto.allowVideoClip
        : existing.allowVideoClip;
    if (nextAmount > limits.maxKes) {
      throw new BadRequestException(`Amount cannot exceed KES ${limits.maxKes}`);
    }
    if (nextVideo && nextAmount < limits.minKesWithVideo) {
      throw new BadRequestException(
        `Price must be at least KES ${limits.minKesWithVideo} when a TikTok clip is allowed.`,
      );
    }
    return this.prisma.creatorReward.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() || null }
          : {}),
        ...(dto.amountKes !== undefined ? { amountKes: dto.amountKes } : {}),
        ...(dto.alertBannerLabel !== undefined
          ? { alertBannerLabel: dto.alertBannerLabel.trim() }
          : {}),
        ...(dto.ttsScript !== undefined
          ? { ttsScript: dto.ttsScript?.trim() || null }
          : {}),
        ...(dto.allowSupporterMessage !== undefined
          ? { allowSupporterMessage: dto.allowSupporterMessage }
          : {}),
        ...(dto.allowVideoClip !== undefined
          ? { allowVideoClip: dto.allowVideoClip }
          : {}),
        ...(dto.maxMessageLength !== undefined
          ? { maxMessageLength: dto.maxMessageLength }
          : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.accentColor !== undefined ? { accentColor: dto.accentColor } : {}),
      },
    });
  }
}
