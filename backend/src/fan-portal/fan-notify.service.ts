import { Injectable, Logger } from '@nestjs/common';
import {
  PaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { kenyaMsisdnAliases } from '../common/utils/mpesa-msisdn';

type NotifyInput = {
  fanId: string;
  type: string;
  title: string;
  body: string;
  creatorSlug?: string | null;
  refId: string;
  locale?: string | null;
};

@Injectable()
export class FanNotifyService {
  private readonly logger = new Logger(FanNotifyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  async paymentCompleted(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: { select: { fanId: true, mpesaMobile: true } },
        creator: { select: { slug: true, displayName: true, fanThankYouMessage: true } },
      },
    });
    if (!payment || payment.status !== PaymentStatus.COMPLETED) return;

    const fanId = await this.resolveFanId(payment.user?.fanId, payment.user?.mpesaMobile);
    if (!fanId) return;

    const fan = await this.prisma.fan.findUnique({
      where: { id: fanId },
      select: { locale: true, expoPushToken: true, phone: true },
    });
    const sw = fan?.locale === 'sw';
    const who = payment.creator?.displayName || 'this creator';
    const thank =
      payment.creator?.fanThankYouMessage?.trim() ||
      (sw
        ? `Asante kwa kumuunga mkono ${who}.`
        : `Thank you for supporting ${who}.`);
    const purpose = String(payment.purpose || 'SUBSCRIPTION');
    const title =
      purpose === 'STREAM_ALERT'
        ? sw
          ? 'Shoutout imelipwa'
          : 'Shoutout paid'
        : purpose === 'COACHING_BOOKING'
          ? sw
            ? 'Coaching imebookiwa'
            : 'Coaching booked'
          : purpose === 'CREATOR_REWARD'
            ? sw
              ? 'Zawadi imelipwa'
              : 'Reward unlocked'
            : sw
              ? 'Uanachama umethibitishwa'
              : 'Membership confirmed';
    await this.deliver({
      fanId,
      type: 'PAYMENT',
      title,
      body: thank,
      creatorSlug: payment.creator?.slug,
      refId: payment.id,
      locale: fan?.locale,
    });
  }

  async shoutoutPlayed(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: { select: { fanId: true, mpesaMobile: true } },
        creator: { select: { slug: true, displayName: true } },
      },
    });
    if (!payment) return;
    const fanId = await this.resolveFanId(payment.user?.fanId, payment.user?.mpesaMobile);
    if (!fanId) return;
    const fan = await this.prisma.fan.findUnique({
      where: { id: fanId },
      select: { locale: true },
    });
    const sw = fan?.locale === 'sw';
    const who = payment.creator?.displayName || 'the stream';
    await this.deliver({
      fanId,
      type: 'SHOUTOUT_PLAYED',
      title: sw ? 'Shoutout yako imechezwa' : 'Your shoutout played',
      body: sw
        ? `OBS imeonyesha shoutout yako kwa ${who}.`
        : `OBS just played your shoutout for ${who}.`,
      creatorSlug: payment.creator?.slug,
      refId: payment.id,
      locale: fan?.locale,
    });
  }

  async coachingStatus(bookingId: string, status: string) {
    const booking = await this.prisma.coachingBooking.findUnique({
      where: { id: bookingId },
      include: {
        payment: {
          include: {
            user: { select: { fanId: true, mpesaMobile: true } },
            creator: { select: { slug: true, displayName: true } },
          },
        },
      },
    });
    const payment = booking?.payment;
    if (!payment) return;
    const fanId = await this.resolveFanId(payment.user?.fanId, payment.user?.mpesaMobile);
    if (!fanId) return;
    const fan = await this.prisma.fan.findUnique({
      where: { id: fanId },
      select: { locale: true },
    });
    const sw = fan?.locale === 'sw';
    const label = status.replace(/_/g, ' ').toLowerCase();
    await this.deliver({
      fanId,
      type: 'COACHING',
      title: sw ? 'Huduma ya coaching' : 'Coaching update',
      body: sw
        ? `Hali sasa: ${label}.`
        : `Your account review is now ${label}.`,
      creatorSlug: payment.creator?.slug,
      refId: `${bookingId}:${status}`,
      locale: fan?.locale,
    });
  }

  async liveScheduled(creatorId: string, liveId: string) {
    const creator = await this.prisma.creator.findUnique({
      where: { id: creatorId },
      select: { slug: true, displayName: true },
    });
    if (!creator) return;
    const live = await this.prisma.scheduledLive.findUnique({
      where: { id: liveId },
      select: { title: true, startsAt: true, platform: true },
    });
    if (!live) return;
    const follows = await this.prisma.fanFollow.findMany({
      where: { creatorId },
      select: { fanId: true },
      take: 300,
    });
    const when = live.startsAt.toLocaleString('en-KE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    for (const follow of follows) {
      const fan = await this.prisma.fan.findUnique({
        where: { id: follow.fanId },
        select: { locale: true },
      });
      const sw = fan?.locale === 'sw';
      const who = creator.displayName;
      await this.deliver({
        fanId: follow.fanId,
        type: 'LIVE_SCHEDULED',
        title: sw ? `${who} ata-live` : `${who} is going live`,
        body: sw
          ? `${live.title} · ${when}`
          : `${live.title} · ${when}`,
        creatorSlug: creator.slug,
        refId: liveId,
        locale: fan?.locale,
      });
    }
  }

  async membershipExpiringSoon() {
    const now = new Date();
    const inThree = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endDate: { gte: now, lte: inThree },
      },
      include: {
        user: { select: { fanId: true, mpesaMobile: true } },
        creator: { select: { slug: true, displayName: true } },
      },
      take: 200,
    });
    for (const row of rows) {
      const fanId = await this.resolveFanId(row.user?.fanId, row.user?.mpesaMobile);
      if (!fanId) continue;
      const fan = await this.prisma.fan.findUnique({
        where: { id: fanId },
        select: { locale: true, phone: true },
      });
      const sw = fan?.locale === 'sw';
      const who = row.creator?.displayName || 'your creator';
      const end = row.endDate
        ? row.endDate.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })
        : '';
      await this.deliver({
        fanId,
        type: 'EXPIRING',
        title: sw ? 'Uanachama unaisha' : 'Membership ending soon',
        body: sw
          ? `Uanachama wa ${who} unaisha ${end}. Fanya renew sasa.`
          : `Your membership with ${who} ends ${end}. Renew to stay in.`,
        creatorSlug: row.creator?.slug,
        refId: row.id,
        locale: fan?.locale,
      });
      if (fan?.phone) {
        void this.whatsapp.sendMessage(
          fan.phone,
          sw
            ? `Makulutu: uanachama wa ${who} unaisha ${end}. Fungua app kufanya renew.`
            : `Makulutu: your membership with ${who} ends ${end}. Open the app to renew.`,
        );
      }
    }
  }

  private async resolveFanId(
    fanId?: string | null,
    mpesa?: string | null,
  ): Promise<string | null> {
    if (fanId) return fanId;
    const n = mpesa ? kenyaMsisdnAliases(mpesa) : [];
    if (n.length === 0) return null;
    const fan = await this.prisma.fan.findFirst({
      where: { phone: { in: n }, isActive: true },
      select: { id: true },
    });
    return fan?.id || null;
  }

  private async deliver(input: NotifyInput) {
    try {
      await this.prisma.fanNotification.upsert({
        where: {
          fanId_type_refId: {
            fanId: input.fanId,
            type: input.type,
            refId: input.refId,
          },
        },
        create: {
          fanId: input.fanId,
          type: input.type,
          title: input.title,
          body: input.body,
          creatorSlug: input.creatorSlug || null,
          refId: input.refId,
        },
        update: {},
      });
      const fan = await this.prisma.fan.findUnique({
        where: { id: input.fanId },
        select: { expoPushToken: true },
      });
      const token = fan?.expoPushToken?.trim();
      if (token && token.startsWith('ExponentPushToken')) {
        const res = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: token,
            title: input.title,
            body: input.body,
            sound: 'default',
            data: { creatorSlug: input.creatorSlug, type: input.type },
          }),
        });
        if (!res.ok) {
          this.logger.warn(`Expo push failed ${res.status}`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Fan notify failed: ${msg}`);
    }
  }
}
