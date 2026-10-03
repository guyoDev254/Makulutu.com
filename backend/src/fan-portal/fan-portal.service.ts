import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Fan, PaymentPurpose, PaymentStatus, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentService } from '../payment/payment.service';
import { FanAuthService } from '../fan-auth/fan-auth.service';
import {
  fetchCreatorWorkspacePatch,
  mergeWorkspaceMonthlyPrice,
} from '../common/utils/creator-workspace-settings';
import {
  kenyaMsisdnAliases,
  normalizeKenyaMsisdn,
} from '../common/utils/mpesa-msisdn';
import { parseCheckoutCountry } from '../common/utils/checkout-country';
import { FanSubscribeDto } from './dto/fan-subscribe.dto';
import { FanShoutoutDto } from './dto/fan-shoutout.dto';
import { FanRewardCheckoutDto } from './dto/fan-reward-checkout.dto';
import { FanCoachDto } from './dto/fan-coach.dto';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class FanPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
    private readonly fanAuth: FanAuthService,
    private readonly storage: StorageService,
  ) {}

  async me(fanId: string) {
    return this.fanAuth.me(fanId);
  }

  async memberships(fanId: string) {
    const userIds = await this.fanUserIds(fanId);
    if (userIds.length === 0) return [];
    const rows = await this.prisma.subscription.findMany({
      where: { userId: { in: userIds } },
      include: {
        creator: {
          select: { slug: true, displayName: true, avatarUrl: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
    const now = new Date();
    return Promise.all(
      rows.map(async (row) => {
        const active =
          row.status === SubscriptionStatus.ACTIVE &&
          row.endDate != null &&
          row.endDate > now;
        const daysLeft =
          active && row.endDate
            ? Math.max(
                0,
                Math.ceil((row.endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
              )
            : null;
        return {
          id: row.id,
          months: row.months,
          amountKes: row.amount != null ? Number(row.amount) : null,
          amount: row.amount != null ? Number(row.amount) : null,
          status: row.status,
          startDate: row.startDate,
          endDate: row.endDate,
          daysLeft,
          active,
          creator: await this.storage.resolveAvatar(row.creator),
        };
      }),
    );
  }

  async payments(fanId: string) {
    const userIds = await this.fanUserIds(fanId);
    if (userIds.length === 0) return [];
    const rows = await this.prisma.payment.findMany({
      where: { userId: { in: userIds } },
      include: {
        creator: {
          select: { slug: true, displayName: true, avatarUrl: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 100,
    });
    return Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        amountKes: row.amount != null ? Number(row.amount) : null,
        amount: row.amount != null ? Number(row.amount) : null,
        status: row.status,
        purpose: row.purpose,
        paymentMethod: row.paymentMethod,
        months: row.months,
        createdAt: row.createdAt,
        completedAt: row.completedAt,
        mpesaReceipt: row.transactionReceipt || row.transactionId,
        giftRecipientName: row.giftRecipientName,
        creator: await this.storage.resolveAvatar(row.creator),
      })),
    );
  }

  async paymentReceipt(fanId: string, paymentId: string) {
    await this.requireFan(fanId);
    const userIds = await this.fanUserIds(fanId);
    const row = await this.prisma.payment.findFirst({
      where: { id: paymentId, userId: { in: userIds } },
      include: {
        creator: {
          select: {
            slug: true,
            displayName: true,
            avatarUrl: true,
            fanThankYouMessage: true,
          },
        },
        streamShoutout: true,
        creatorRewardPurchase: true,
        coachingBookings: true,
      },
    });
    if (!row) throw new NotFoundException('Payment not found');
    return this.serializeReceipt(row);
  }

  async follows(fanId: string) {
    await this.requireFan(fanId);
    const rows = await this.prisma.fanFollow.findMany({
      where: { fanId },
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: {
            slug: true,
            displayName: true,
            avatarUrl: true,
            primaryCategory: true,
            bio: true,
            isActive: true,
            supportEnabled: true,
          },
        },
      },
    });
    return Promise.all(
      rows
        .filter((r) => r.creator.isActive && r.creator.supportEnabled)
        .map(async (r) => ({
          slug: r.creator.slug,
          displayName: r.creator.displayName,
          avatarUrl: await this.storage.resolveUrl(r.creator.avatarUrl),
          primaryCategory: r.creator.primaryCategory,
          bio: r.creator.bio,
          followedAt: r.createdAt,
        })),
    );
  }

  async follow(fanId: string, slug: string) {
    const creator = await this.requirePublicCreator(slug);
    await this.prisma.fanFollow.upsert({
      where: { fanId_creatorId: { fanId, creatorId: creator.id } },
      create: { fanId, creatorId: creator.id },
      update: {},
    });
    return { following: true, slug: creator.slug };
  }

  async unfollow(fanId: string, slug: string) {
    const creator = await this.prisma.creator.findFirst({
      where: { slug: { equals: slug.trim().toLowerCase(), mode: 'insensitive' } },
      select: { id: true, slug: true },
    });
    if (creator) {
      await this.prisma.fanFollow.deleteMany({
        where: { fanId, creatorId: creator.id },
      });
    }
    return { following: false, slug: creator?.slug || slug };
  }

  async notifications(fanId: string) {
    await this.requireFan(fanId);
    const rows = await this.prisma.fanNotification.findMany({
      where: { fanId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      creatorSlug: row.creatorSlug,
      refId: row.refId,
      readAt: row.readAt,
      createdAt: row.createdAt,
      unread: !row.readAt,
    }));
  }

  async markNotificationsRead(fanId: string) {
    await this.prisma.fanNotification.updateMany({
      where: { fanId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  async markNotificationRead(fanId: string, id: string) {
    const row = await this.prisma.fanNotification.findFirst({
      where: { id, fanId },
    });
    if (!row) throw new NotFoundException('Notification not found');
    if (row.readAt) return { ok: true, id: row.id, readAt: row.readAt };
    const updated = await this.prisma.fanNotification.update({
      where: { id: row.id },
      data: { readAt: new Date() },
    });
    return { ok: true, id: updated.id, readAt: updated.readAt };
  }

  async coachingInbox(fanId: string) {
    await this.requireFan(fanId);
    const userIds = await this.fanUserIds(fanId);
    if (userIds.length === 0) return [];
    const rows = await this.prisma.coachingBooking.findMany({
      where: { payment: { userId: { in: userIds } } },
      include: {
        payment: {
          include: {
            creator: { select: { slug: true, displayName: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
    });
    return Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        service: row.service,
        status: row.status,
        accountUsername: row.accountUsername,
        notes: row.notes,
        createdAt: row.createdAt,
        amountKes: row.payment?.amount != null ? Number(row.payment.amount) : null,
        paymentStatus: row.payment?.status,
        creator: await this.storage.resolveAvatar(row.payment?.creator),
      })),
    );
  }

  async creatorSnapshot(fanId: string, slug: string) {
    const fan = await this.requireFan(fanId);
    await this.fanAuth.claimGuestSupportRecords(fan);
    const creator = await this.requirePublicCreator(slug);
    const users = await this.prisma.user.findMany({
      where: { fanId: fan.id, creatorId: creator.id },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    const following = Boolean(
      await this.prisma.fanFollow.findUnique({
        where: { fanId_creatorId: { fanId: fan.id, creatorId: creator.id } },
      }),
    );
    const membership = await this.prisma.subscription.findFirst({
      where: {
        creatorId: creator.id,
        ...(userIds.length > 0
          ? { userId: { in: userIds } }
          : { user: { fanId: fan.id } }),
      },
      orderBy: { createdAt: 'desc' },
    });
    const now = new Date();
    const active =
      membership?.status === SubscriptionStatus.ACTIVE &&
      membership.endDate != null &&
      membership.endDate > now;
    const daysLeft =
      active && membership?.endDate
        ? Math.max(
            0,
            Math.ceil(
              (membership.endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
            ),
          )
        : null;

    let rank: { place: number; rank: number; totalKes: number; of: number } | null =
      null;
    if (userIds.length > 0) {
      const groups = await this.prisma.payment.groupBy({
        by: ['userId'],
        where: {
          creatorId: creator.id,
          status: PaymentStatus.COMPLETED,
          userId: { not: null },
          amount: { not: null },
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
      });
      const idx = groups.findIndex((g) => userIds.includes(g.userId || ''));
      if (idx >= 0) {
        const place = idx + 1;
        rank = {
          place,
          rank: place,
          totalKes: Math.round(Number(groups[idx]._sum.amount ?? 0) * 100) / 100,
          of: groups.length,
        };
      }
    }

    const queueWhere = {
      creatorId: creator.id,
      purpose: PaymentPurpose.STREAM_ALERT,
      status: PaymentStatus.COMPLETED,
      subscriberAlertEmittedAt: null,
    };
    const queued = await this.prisma.payment.findMany({
      where: queueWhere,
      orderBy: { completedAt: 'asc' },
      select: { id: true, userId: true },
      take: 50,
    });
    const queueIndex = userIds.length
      ? queued.findIndex((p) => p.userId != null && userIds.includes(p.userId))
      : -1;

    return {
      following,
      thankYouMessage:
        creator.fanThankYouMessage?.trim() ||
        (fan.locale === 'sw'
          ? 'Asante kwa kuunga mkono!'
          : 'Thank you for supporting this creator.'),
      fanThankYouMessage: creator.fanThankYouMessage,
      membership: membership
        ? {
            id: membership.id,
            active,
            daysLeft,
            endDate: membership.endDate,
            months: membership.months,
            status: membership.status,
          }
        : null,
      rank,
      shoutoutQueue:
        queueIndex >= 0
          ? { position: queueIndex + 1, waiting: queued.length }
          : queued.length > 0
            ? { position: null, waiting: queued.length }
            : null,
    };
  }

  private async serializeReceipt(row: {
    id: string;
    amount: unknown;
    months: number | null;
    purpose: string | null;
    paymentMethod: string;
    status: string | null;
    transactionReceipt: string | null;
    transactionId: string | null;
    reference: string | null;
    giftRecipientName: string | null;
    giftRecipientPhone: string | null;
    subscriberMessage: string | null;
    completedAt: Date | null;
    createdAt: Date | null;
    failureReason: string | null;
    creator: {
      slug: string;
      displayName: string;
      avatarUrl: string | null;
      fanThankYouMessage: string | null;
    } | null;
    streamShoutout: { displayHandle: string; message: string | null } | null;
    creatorRewardPurchase: { rewardNameSnapshot: string } | null;
    coachingBookings: { accountUsername: string | null; status: string }[];
  }) {
    return {
      id: row.id,
      amountKes: row.amount != null ? Number(row.amount) : null,
      amount: row.amount != null ? Number(row.amount) : null,
      months: row.months,
      purpose: row.purpose,
      paymentMethod: row.paymentMethod,
      status: row.status,
      mpesaReceipt: row.transactionReceipt || row.transactionId,
      reference: row.reference,
      giftRecipientName: row.giftRecipientName,
      giftRecipientPhone: row.giftRecipientPhone,
      note: row.subscriberMessage,
      completedAt: row.completedAt,
      createdAt: row.createdAt,
      failureReason: row.failureReason,
      creator: await this.storage.resolveAvatar(row.creator),
      shoutout: row.streamShoutout,
      rewardName: row.creatorRewardPurchase?.rewardNameSnapshot || null,
      coaching: row.coachingBookings[0] || null,
      thankYouMessage: row.creator?.fanThankYouMessage || null,
      fanThankYouMessage: row.creator?.fanThankYouMessage || null,
    };
  }

  private async fanUserIds(fanId: string): Promise<string[]> {
    const fan = await this.requireFan(fanId);
    await this.fanAuth.claimGuestSupportRecords(fan);
    const users = await this.prisma.user.findMany({
      where: { fanId },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  private async attachGift(paymentId: string, dto: FanSubscribeDto) {
    const name = dto.giftName?.trim() || null;
    const note = dto.giftNote?.trim() || null;
    let phone: string | null = null;
    if (dto.giftPhone?.trim()) {
      const n = normalizeKenyaMsisdn(dto.giftPhone);
      if (!n) throw new BadRequestException('Enter a valid Kenyan mobile for the gift');
      phone = n;
    }
    if (!name && !phone && !note) return;
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        giftRecipientName: name,
        giftRecipientPhone: phone,
        ...(note ? { subscriberMessage: note.slice(0, 500) } : {}),
      },
    });
  }

  async subscribe(fanId: string, dto: FanSubscribeDto) {
    const fan = await this.requireFan(fanId);
    const creator = await this.requirePublicCreator(dto.creatorSlug);
    const payMethod = dto.paymentMethod || 'mpesa';
    const checkoutCountry = parseCheckoutCountry(dto.checkoutCountry);
    if (payMethod !== 'paypal' && payMethod !== 'paystack' && checkoutCountry !== 'KE') {
      throw new BadRequestException(
        'M-Pesa is only available when Kenya is selected',
      );
    }
    const user = await this.ensureSupporterUser(fan, creator.id);
    if (payMethod !== 'paypal' && payMethod !== 'paystack') {
      const phone = await this.resolveMpesaPhone(fan, dto.mpesaMobile);
      if (user.mpesaMobile !== phone) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { mpesaMobile: phone, whatsappNumber: phone },
        });
        user.mpesaMobile = phone;
        user.whatsappNumber = phone;
      }
    }
    const settings = await this.prisma.settings.findUnique({
      where: { key: 'default_monthly_price' },
    });
    const parsed = settings ? parseFloat(settings.value || '') : 1;
    let monthlyPrice =
      Number.isFinite(parsed) && parsed >= 1 ? Math.round(parsed) : 1;
    const patch = await fetchCreatorWorkspacePatch(this.prisma, creator.id);
    monthlyPrice = mergeWorkspaceMonthlyPrice(monthlyPrice, patch);
    const amount = monthlyPrice * dto.months;
    if (payMethod === 'paypal') {
      const { payment, approvalUrl } =
        await this.paymentService.createSubscriptionPayPalCheckout({
          userId: user.id,
          creatorId: creator.id,
          amount,
          months: dto.months,
          reference: `SUB_${user.id}_${Date.now()}`,
          checkoutCountry,
        });
      await this.attachGift(payment.id, dto);
      return {
        user,
        payment,
        approvalUrl,
        message: 'Continue to PayPal to complete payment.',
      };
    }
    if (payMethod === 'paystack') {
      const email = this.requireFanEmail(fan);
      const { payment, approvalUrl } =
        await this.paymentService.createSubscriptionPaystackCheckout({
          userId: user.id,
          creatorId: creator.id,
          amount,
          months: dto.months,
          reference: `SUB_${user.id}_${Date.now()}`,
          email,
          checkoutCountry,
        });
      await this.attachGift(payment.id, dto);
      return {
        user,
        payment,
        approvalUrl,
        message: 'Continue to Paystack to complete payment.',
      };
    }
    const payment = await this.paymentService.create({
      userId: user.id,
      creatorId: creator.id,
      amount,
      months: dto.months,
      reference: `SUB_${user.id}_${Date.now()}`,
      checkoutCountry,
    });
    await this.attachGift(payment.id, dto);
    return {
      user,
      payment,
      message: 'STK Push initiated. Complete payment on your phone.',
    };
  }

  async shoutout(fanId: string, dto: FanShoutoutDto) {
    const fan = await this.requireFan(fanId);
    await this.requirePublicCreator(dto.creatorSlug);
    const handle =
      dto.displayHandle?.trim().replace(/^@+/, '') ||
      fan.tiktokUsername ||
      fan.name ||
      'Fan';
    const payMethod = dto.paymentMethod || 'mpesa';
    if (payMethod === 'paystack') {
      return this.paymentService.checkoutStreamAlert({
        displayHandle: handle.slice(0, 64),
        platform: dto.platform || 'tiktok',
        message: dto.message,
        videoUrl: dto.videoUrl,
        amount: dto.amount,
        creatorSlug: dto.creatorSlug,
        paymentMethod: 'paystack',
        email: this.requireFanEmail(fan),
        ...(dto.mpesaMobile ? { mpesaMobile: dto.mpesaMobile } : {}),
      });
    }
    const phone = await this.resolveMpesaPhone(fan, dto.mpesaMobile);
    return this.paymentService.checkoutStreamAlert({
      displayHandle: handle.slice(0, 64),
      mpesaMobile: phone,
      platform: dto.platform || 'tiktok',
      message: dto.message,
      videoUrl: dto.videoUrl,
      amount: dto.amount,
      creatorSlug: dto.creatorSlug,
    });
  }

  async checkoutReward(fanId: string, rewardId: string, dto: FanRewardCheckoutDto) {
    const fan = await this.requireFan(fanId);
    const payMethod = dto.paymentMethod || 'mpesa';
    if (payMethod === 'paystack') {
      return this.paymentService.checkoutCreatorReward(rewardId, {
        displayName:
          dto.displayName?.trim() ||
          fan.tiktokUsername ||
          fan.name ||
          'Fan',
        platform: dto.platform,
        message: dto.message,
        videoUrl: dto.videoUrl,
        paymentMethod: 'paystack',
        email: this.requireFanEmail(fan),
        ...(dto.mpesaMobile ? { mpesaMobile: dto.mpesaMobile } : {}),
      });
    }
    const phone = await this.resolveMpesaPhone(fan, dto.mpesaMobile);
    return this.paymentService.checkoutCreatorReward(rewardId, {
      displayName:
        dto.displayName?.trim() ||
        fan.tiktokUsername ||
        fan.name ||
        'Fan',
      mpesaMobile: phone,
      platform: dto.platform,
      message: dto.message,
      videoUrl: dto.videoUrl,
    });
  }

  async checkoutCoaching(fanId: string, dto: FanCoachDto) {
    const fan = await this.requireFan(fanId);
    const phone = await this.resolveMpesaPhone(fan, dto.mpesaMobile);
    const result = await this.paymentService.checkoutCoachingBooking({
      service: 'ACCOUNT_REVIEW',
      name: dto.name?.trim() || fan.name?.trim() || fan.tiktokUsername || 'Fan',
      contact: phone,
      mpesaMobile: phone,
      accountUsername: dto.accountUsername,
      notes: dto.notes,
      creatorSlug: dto.creatorSlug,
    });
    if (result.payment?.id) {
      await this.linkCheckoutUser(fanId, result.payment.id);
    }
    return result;
  }

  async linkCheckoutUser(fanId: string, paymentId: string) {
    const fan = await this.requireFan(fanId);
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { userId: true, status: true },
    });
    if (!payment?.userId) return;
    if (payment.status === PaymentStatus.FAILED) return;
    await this.prisma.user.update({
      where: { id: payment.userId },
      data: { fanId: fan.id },
    });
  }

  private async requireFan(fanId: string): Promise<Fan> {
    const fan = await this.prisma.fan.findUnique({ where: { id: fanId } });
    if (!fan || !fan.isActive) {
      throw new NotFoundException('Fan not found');
    }
    return fan;
  }

  private requireFanEmail(fan: Fan): string {
    const email = fan.email?.trim();
    if (!email) {
      throw new BadRequestException(
        'Add an email on your fan account to pay with card (Paystack)',
      );
    }
    return email;
  }

  private async resolveMpesaPhone(fan: Fan, override?: string): Promise<string> {
    const raw = override?.trim() || fan.phone || '';
    const phone = normalizeKenyaMsisdn(raw);
    if (!phone) {
      throw new BadRequestException(
        'Enter a valid Kenyan M-Pesa number (254XXXXXXXXX or 07XXXXXXXX)',
      );
    }
    if (!fan.phone) {
      const taken = await this.prisma.fan.findFirst({
        where: { phone, NOT: { id: fan.id } },
        select: { id: true },
      });
      if (!taken) {
        await this.prisma.fan.update({
          where: { id: fan.id },
          data: { phone },
        });
        fan.phone = phone;
        await this.fanAuth.claimGuestSupportRecords(fan);
      }
    }
    return phone;
  }

  private async requirePublicCreator(slugRaw: string) {
    const slug = slugRaw.trim().toLowerCase();
    const creator = await this.prisma.creator.findFirst({
      where: {
        slug: { equals: slug, mode: 'insensitive' },
        isActive: true,
        onboardingComplete: true,
        supportEnabled: true,
      },
    });
    if (!creator) {
      throw new NotFoundException('Creator not found');
    }
    return creator;
  }

  async ensureSupporterUser(fan: Fan, creatorId: string) {
    const existing = await this.prisma.user.findFirst({
      where: { fanId: fan.id, creatorId },
    });
    if (existing) {
      const phone = fan.phone;
      if (
        phone &&
        (existing.mpesaMobile !== phone || existing.whatsappNumber !== phone)
      ) {
        return this.prisma.user.update({
          where: { id: existing.id },
          data: { mpesaMobile: phone, whatsappNumber: phone },
        });
      }
      return existing;
    }

    if (fan.phone) {
      const phones = kenyaMsisdnAliases(fan.phone);
      const guest = await this.prisma.user.findFirst({
        where: {
          creatorId,
          fanId: null,
          OR: [
            { mpesaMobile: { in: phones } },
            { whatsappNumber: { in: phones } },
          ],
        },
      });
      if (guest) {
        return this.prisma.user.update({
          where: { id: guest.id },
          data: {
            fanId: fan.id,
            mpesaMobile: fan.phone,
            whatsappNumber: fan.phone,
            ...(fan.name && !guest.name ? { name: fan.name } : {}),
          },
        });
      }
    }

    const handle =
      fan.phone?.slice(-6) || fan.email?.split('@')[0] || fan.id.slice(0, 8);
    const base =
      (fan.tiktokUsername || fan.name || `fan_${handle}`)
        .replace(/[^a-zA-Z0-9_]/g, '')
        .slice(0, 40) || `fan_${handle}`;
    let unique = base;
    let n = 0;
    while (
      await this.prisma.user.findFirst({
        where: { tiktokUsername: unique, creatorId },
        select: { id: true },
      })
    ) {
      unique = `${base}_${++n}`;
    }
    return this.prisma.user.create({
      data: {
        name: fan.name || unique,
        tiktokUsername: unique,
        mpesaMobile: fan.phone,
        whatsappNumber: fan.phone,
        creatorId,
        fanId: fan.id,
      },
    });
  }
}
