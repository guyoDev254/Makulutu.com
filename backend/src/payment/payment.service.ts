import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  CoachingBookingService as CoachingServiceEnum,
  Payment,
  PaymentMethod,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { WebhookPayload } from '../paystack/paystack.types';
import { PaystackService } from '../paystack/paystack.service';
import { PaypalService } from '../paypal/paypal.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { UserService } from '../user/user.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { ObsAlertsService } from '../obs-alerts/obs-alerts.service';
import { FanNotifyService } from '../fan-portal/fan-notify.service';
import {
  kenyaMsisdnAliases,
  normalizeKenyaMsisdn,
} from '../common/utils/mpesa-msisdn';
import { paymentIdFromProviderReference } from '../common/utils/payment-id-from-reference';
import { parseCheckoutCountry } from '../common/utils/checkout-country';
import { chargeEmailForMsisdn } from '../paystack/paystack.mapper';
import { logPaystackTest } from '../paystack/paystack-test-log';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CheckoutStreamAlertDto } from '../stream-alerts/dto/checkout-stream-alert.dto';
import { CheckoutCoachingBookingDto } from '../coaching-booking/dto/checkout-coaching-booking.dto';
import { CheckoutCreatorRewardDto } from '../creator-reward/dto/checkout-creator-reward.dto';
import { renderCreatorRewardTts } from '../common/utils/creator-reward-tts';
import {
  MAX_STREAM_ALERT_MESSAGE_LENGTH,
  STREAM_ALERT_PLATFORM_SET,
} from '../common/constants/stream-alert';
import {
  normalizeShoutoutVideoPageUrl,
  resolveShoutoutVideoEmbedUrlForObs,
} from '../common/utils/shoutout-video-url';
import { resolveShoutoutLimits } from '../common/utils/stream-alert-limits';
import {
  COACHING_ACCOUNT_REVIEW_KES_DEFAULT,
  resolveCoachingAccountReviewKes,
} from '../common/utils/coaching-booking-price';
import { buildPublicSupportCatalog } from '../common/utils/support-catalog';
import { resolveDefaultCreatorId } from '../common/utils/default-creator';
import { FinanceService } from '../finance/finance.service';
import { StorageService } from '../storage/storage.service';

// Type for Payment with user + optional shoutout / coaching / creator reward
type PaymentWithUser = Prisma.PaymentGetPayload<{
  include: {
    user: true;
    streamShoutout: true;
    creatorRewardPurchase: true;
    coachingBookings: true;
  };
}>;

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => PaystackService))
    private paystackService: PaystackService,
    @Inject(forwardRef(() => SubscriptionService))
    private subscriptionService: SubscriptionService,
    private userService: UserService,
    private whatsappService: WhatsAppService,
    private obsAlerts: ObsAlertsService,
    private config: ConfigService,
    private paypalService: PaypalService,
    private fanNotify: FanNotifyService,
    private finance: FinanceService,
    private storage: StorageService,
  ) {}

  /** Kenya M-Pesa STK and card checkout both go through Paystack. */
  private requirePaystack(): PaystackService {
    if (!this.paystackService.isConfigured()) {
      throw new BadRequestException(
        'Paystack is not configured. Set PAYSTACK_SECRET_KEY on the API.',
      );
    }
    return this.paystackService;
  }

  private frontendOrigin(): string {
    return (
      this.config.get<string>('FRONTEND_URL')?.replace(/\/$/, '') ||
      'http://localhost:3000'
    );
  }

  async startPaystackHostedCheckout(
    paymentId: string,
    email: string,
  ): Promise<string> {
    if (!this.paystackService.isConfigured()) {
      throw new BadRequestException(
        'Paystack is not configured. Set PAYSTACK_SECRET_KEY on the API.',
      );
    }
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment || payment.amount == null) {
      throw new NotFoundException('Payment not found');
    }
    const callbackUrl = `${this.frontendOrigin()}/success?paymentId=${encodeURIComponent(payment.id)}&paystack=1`;
    const started = await this.paystackService.initializeHostedCheckout({
      email,
      amountKes: Number(payment.amount),
      reference: payment.id,
      callbackUrl,
      metadata: {
        purpose: payment.purpose,
        creatorId: payment.creatorId,
      },
    });
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        paymentMethod: PaymentMethod.PAYSTACK,
        transactionRequestId: started.reference,
      },
    });
    logPaystackTest({
      stage: 'hosted_checkout_saved',
      paymentId: payment.id,
      purpose: payment.purpose,
      amountKes: Number(payment.amount),
      paystackReference: started.reference,
      callbackUrl,
    });
    return started.authorizationUrl;
  }

  async createSubscriptionPaystackCheckout(params: {
    userId: string;
    creatorId?: string;
    amount: number;
    months: number;
    reference: string;
    email: string;
    checkoutCountry?: string;
  }): Promise<{ payment: Payment; approvalUrl: string }> {
    const savedPayment = await this.prisma.payment.create({
      data: {
        userId: params.userId,
        creatorId: params.creatorId,
        amount: params.amount,
        months: params.months,
        reference: params.reference,
        purpose: PaymentPurpose.SUBSCRIPTION,
        status: PaymentStatus.PENDING,
        paymentMethod: PaymentMethod.PAYSTACK,
        checkoutCountry: parseCheckoutCountry(params.checkoutCountry),
      },
    });
    const approvalUrl = await this.startPaystackHostedCheckout(
      savedPayment.id,
      params.email,
    );
    const payment = await this.prisma.payment.findUniqueOrThrow({
      where: { id: savedPayment.id },
    });
    return { payment, approvalUrl };
  }

  async verifyPaystackReference(reference: string): Promise<Payment> {
    const ref = reference.trim();
    if (!ref) {
      throw new BadRequestException('Missing Paystack reference');
    }
    const status = await this.paystackService.checkTransactionStatus(ref);
    let payment = await this.prisma.payment.findFirst({
      where: {
        OR: [{ id: ref }, { transactionRequestId: ref }, { reference: ref }],
      },
    });
    logPaystackTest({
      stage: 'verify_db',
      reference: ref,
      paystackStatus: status.TransactionStatus,
      paystackDesc: status.ResultDesc,
      paystackAmount: status.TransactionAmount,
      dbFound: Boolean(payment),
      dbPaymentId: payment?.id,
      dbStatus: payment?.status,
    });
    if (!payment) {
      throw new NotFoundException(
        `Payment not found for Paystack reference ${ref} (${status.TransactionStatus}: ${status.ResultDesc})`,
      );
    }
    if (status.TransactionStatus === 'Completed' && status.TransactionCode === '0') {
      await this.handleSuccessfulPayment({
        ResponseCode: 0,
        ResponseDescription: status.ResultDesc,
        TransactionID: status.TransactionID,
        TransactionAmount: Number(status.TransactionAmount) || Number(payment.amount) || 0,
        TransactionReceipt: status.TransactionReceipt,
        TransactionDate: status.TransactionDate,
        TransactionReference: payment.id,
        Msisdn: status.Msisdn,
      });
      return this.findOne(payment.id);
    }
    if (status.TransactionStatus === 'Failed') {
      await this.handleFailedPayment({
        ResponseCode: 1,
        ResponseDescription: status.ResultDesc,
        TransactionID: status.TransactionID,
        TransactionAmount: Number(status.TransactionAmount) || 0,
        TransactionReference: payment.id,
      });
    }
    return this.findOne(payment.id);
  }

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    const user = await this.userService.findOne(createPaymentDto.userId);

    let creatorId = createPaymentDto.creatorId ?? user.creatorId ?? null;
    if (!creatorId) {
      creatorId = await resolveDefaultCreatorId(this.prisma);
    }

    const savedPayment = await this.prisma.payment.create({
      data: {
        userId: user.id,
        creatorId: creatorId ?? undefined,
        amount: createPaymentDto.amount,
        months: createPaymentDto.months,
        reference: createPaymentDto.reference,
        status: PaymentStatus.PENDING,
        paymentMethod: PaymentMethod.MPESA,
        checkoutCountry: parseCheckoutCountry(createPaymentDto.checkoutCountry),
      },
    });

    // Initiate STK Push
    try {
      if (!user.mpesaMobile) {
        throw new BadRequestException('Enter a Kenyan M-Pesa number');
      }
      const stkResponse = await this.requirePaystack().initiateSTKPush({
        amount: createPaymentDto.amount,
        msisdn: user.mpesaMobile,
        reference: savedPayment.id,
      });

      return await this.prisma.payment.update({
        where: { id: savedPayment.id },
        data: { transactionRequestId: stkResponse.transaction_request_id },
      });
    } catch (error) {
      this.logger.error(`Failed to initiate STK Push: ${error.message}`);
      return await this.prisma.payment.update({
        where: { id: savedPayment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureReason: error.message,
        },
      });
    }
  }

  /**
   * Paid stream shoutout: min/max KES from platform settings (defaults + Admin → Settings).
   * Higher minimum when a clip URL is included. Does not create a subscription or send WhatsApp.
   */
  async checkoutStreamAlert(
    dto: CheckoutStreamAlertDto,
  ): Promise<{ payment: Payment; message: string; approvalUrl?: string }> {
    const amount = dto.amount;

    const scopedCreatorId = await this.resolvePublicCreatorScopeId(
      dto.creatorSlug,
    );

    const limits = await resolveShoutoutLimits(this.prisma, scopedCreatorId);

    const handle = dto.displayHandle.trim().replace(/^@+/, '').slice(0, 64);
    if (!handle) {
      throw new BadRequestException('Display handle is required');
    }

    let plat = dto.platform.trim().toLowerCase();
    if (!STREAM_ALERT_PLATFORM_SET.has(plat)) {
      plat = 'tiktok';
    }

    const msg =
      dto.message?.trim().slice(0, MAX_STREAM_ALERT_MESSAGE_LENGTH) || null;

    let videoPageUrl: string | null = null;
    if (dto.videoUrl?.trim()) {
      videoPageUrl = await normalizeShoutoutVideoPageUrl(dto.videoUrl);
    }

    const minRequired = videoPageUrl
      ? limits.minKesWithVideo
      : limits.minKes;
    if (amount < minRequired) {
      throw new BadRequestException(
        videoPageUrl
          ? `Amount must be at least KES ${minRequired} when a clip URL is included`
          : `Amount must be at least KES ${minRequired}`,
      );
    }
    if (amount > limits.maxKes) {
      throw new BadRequestException(
        `Amount cannot exceed KES ${limits.maxKes}`,
      );
    }

    let user = dto.mpesaMobile
      ? await this.userService.findByMpesaMobileEitherForm(dto.mpesaMobile)
      : await this.userService.findByTikTokUsername(handle, scopedCreatorId);
    const payMethod = (dto.paymentMethod || 'mpesa').toLowerCase();
    if (!user) {
      const slugBase =
        handle.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 40) || 'viewer';
      let unique = slugBase;
      let n = 0;
      while (await this.userService.findByTikTokUsername(unique, scopedCreatorId)) {
        unique = `${slugBase}_${++n}`;
      }
      const phone =
        payMethod === 'mpesa' && dto.mpesaMobile
          ? this.requireKenyaMsisdn(dto.mpesaMobile)
          : undefined;
      user = await this.userService.create({
        name: handle.slice(0, 120),
        tiktokUsername: unique,
        ...(phone ? { mpesaMobile: phone, whatsappNumber: phone } : {}),
        ...(scopedCreatorId ? { creatorId: scopedCreatorId } : {}),
      });
    } else if (!user.creatorId && scopedCreatorId) {
      user = await this.userService.update(user.id, {
        creator: { connect: { id: scopedCreatorId } },
      });
    }

    const payCreatorId = scopedCreatorId ?? user.creatorId ?? undefined;

    const savedPayment = await this.prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          userId: user.id,
          ...(payCreatorId ? { creatorId: payCreatorId } : {}),
          amount,
          months: 1,
          purpose: PaymentPurpose.STREAM_ALERT,
          reference: `STREAM_${user.id}_${Date.now()}`,
          status: PaymentStatus.PENDING,
        },
      });
      await tx.streamShoutout.create({
        data: {
          paymentId: p.id,
          displayHandle: handle,
          platform: plat,
          message: msg,
          amountKes: amount,
          ...(videoPageUrl ? { videoUrl: videoPageUrl } : {}),
        },
      });
      return p;
    });

    try {
      if (payMethod === 'paystack') {
        const email =
          dto.email?.trim() ||
          (user.mpesaMobile
            ? chargeEmailForMsisdn(user.mpesaMobile)
            : `fan.${user.id.replace(/-/g, '')}@pay.makulutu.com`);
        const approvalUrl = await this.startPaystackHostedCheckout(
          savedPayment.id,
          email,
        );
        const payment = await this.prisma.payment.findUniqueOrThrow({
          where: { id: savedPayment.id },
        });
        return {
          payment,
          approvalUrl,
          message: 'Continue to Paystack to complete payment.',
        };
      }
      if (!user.mpesaMobile) {
        throw new BadRequestException('Enter a Kenyan M-Pesa number');
      }
      const stkResponse = await this.requirePaystack().initiateSTKPush({
        amount,
        msisdn: user.mpesaMobile,
        reference: savedPayment.id,
      });
      const payment = await this.prisma.payment.update({
        where: { id: savedPayment.id },
        data: { transactionRequestId: stkResponse.transaction_request_id },
      });
      return {
        payment,
        message: 'STK Push initiated. Complete payment on your phone.',
      };
    } catch (error) {
      const msg = httpClientMessage(error);
      this.logger.error(`Stream alert STK failed: ${msg}`);
      await this.prisma.payment.update({
        where: { id: savedPayment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureReason: msg,
        },
      });
      throw new BadRequestException(stkUserFacingError(error));
    }
  }

  private normalizeCoachingCheckoutService(raw: string): CoachingServiceEnum {
    const key = raw.replace(/-/g, '_').toUpperCase();
    if (key === 'ACCOUNT_REVIEW') return CoachingServiceEnum.ACCOUNT_REVIEW;
    if (key === 'BOTH') return CoachingServiceEnum.BOTH;
    throw new BadRequestException(
      'Paid checkout is only for account review or account review + rank push.',
    );
  }

  /**
   * Account review (or bundle) booking: 100 KES M-Pesa, then OBS alert on success.
   */
  async checkoutCoachingBooking(
    dto: CheckoutCoachingBookingDto,
  ): Promise<{ payment: Payment; message: string }> {
    const service = this.normalizeCoachingCheckoutService(dto.service);
    const acct = dto.accountUsername.trim().slice(0, 120);
    if (!acct) {
      throw new BadRequestException('Game account username is required');
    }

    const scopedCreatorId = await this.resolvePublicCreatorScopeId(
      dto.creatorSlug,
      true,
    );
    if (dto.creatorSlug?.trim() && scopedCreatorId === '__none__') {
      throw new BadRequestException('Creator not found or unavailable');
    }
    const defaultCreatorId = await resolveDefaultCreatorId(this.prisma);
    const targetCreatorId =
      scopedCreatorId && scopedCreatorId !== '__none__'
        ? scopedCreatorId
        : defaultCreatorId;

    const amount = await resolveCoachingAccountReviewKes(
      this.prisma,
      targetCreatorId ?? null,
    );

    let user = await this.userService.findByMpesaMobileEitherForm(
      dto.mpesaMobile,
    );
    if (!user) {
      const normalizedPhone = this.requireKenyaMsisdn(dto.mpesaMobile);
      const slugBase =
        dto.name
          .trim()
          .replace(/[^a-zA-Z0-9_]/g, '')
          .slice(0, 40) || 'booker';
      let unique = slugBase;
      let n = 0;
      while (await this.userService.findByTikTokUsername(unique, targetCreatorId)) {
        unique = `${slugBase}_${++n}`;
      }
      user = await this.userService.create({
        name: dto.name.trim().slice(0, 120),
        tiktokUsername: unique,
        mpesaMobile: normalizedPhone,
        whatsappNumber: normalizedPhone,
        ...(targetCreatorId ? { creatorId: targetCreatorId } : {}),
      });
    } else if (!user.creatorId && targetCreatorId) {
      user = await this.userService.update(user.id, {
        creator: { connect: { id: targetCreatorId } },
      });
    }

    const payCreatorId = user.creatorId ?? targetCreatorId ?? undefined;

    const savedPayment = await this.prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          userId: user.id,
          ...(payCreatorId ? { creatorId: payCreatorId } : {}),
          amount,
          months: 1,
          purpose: PaymentPurpose.COACHING_BOOKING,
          reference: `COACHING_${user.id}_${Date.now()}`,
          status: PaymentStatus.PENDING,
        },
      });
      await tx.coachingBooking.create({
        data: {
          service,
          name: dto.name.trim(),
          contact: dto.contact.trim(),
          accountUsername: acct,
          availability: dto.availability?.trim() || null,
          notes: dto.notes?.trim() || null,
          paymentId: p.id,
        },
      });
      return p;
    });

    try {
    const stkResponse = await this.requirePaystack().initiateSTKPush({
        amount,
        msisdn: user.mpesaMobile,
        reference: savedPayment.id,
      });
      const payment = await this.prisma.payment.update({
        where: { id: savedPayment.id },
        data: { transactionRequestId: stkResponse.transaction_request_id },
      });
      return {
        payment,
        message: `STK Push initiated. Complete KES ${amount} payment on your phone.`,
      };
    } catch (error) {
      const msg = httpClientMessage(error);
      this.logger.error(`Coaching booking STK failed: ${msg}`);
      await this.prisma.payment.update({
        where: { id: savedPayment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureReason: msg,
        },
      });
      throw new BadRequestException(stkUserFacingError(error));
    }
  }

  /** Active tiers for the public subscribe page (no admin secrets). */
  async listPublicCreatorRewards(creatorSlug?: string) {
    const scopedCreatorId = await this.resolvePublicCreatorScopeId(
      creatorSlug,
      true,
    );
    const rewardScope =
      scopedCreatorId && scopedCreatorId.length > 0
        ? { creatorId: scopedCreatorId }
        : {};
    const rows = await this.prisma.creatorReward.findMany({
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
    });
    return rows.map((r) => ({
      ...r,
      amountKes: Number(r.amountKes),
    }));
  }

  /** Ordered support tiers for the public subscribe page (membership, shoutout, custom rewards). */
  async getPublicSupportCatalog(creatorSlug?: string) {
    const scopedCreatorId = await this.resolvePublicCreatorScopeId(
      creatorSlug,
      true,
    );
    return buildPublicSupportCatalog(this.prisma, scopedCreatorId);
  }

  private async resolvePublicCreatorScopeId(
    creatorSlug?: string,
    strictWhenSlugProvided = false,
  ): Promise<string | null> {
    const slug = creatorSlug?.trim().toLowerCase();
    if (slug) {
      const creator = await this.prisma.creator.findFirst({
        where: {
          slug: { equals: slug, mode: 'insensitive' },
          isActive: true,
          onboardingComplete: true,
          supportEnabled: true,
        },
        select: { id: true },
      });
      if (creator) return creator.id;
      if (strictWhenSlugProvided) {
        // Prevent cross-creator tier leakage: no fallback when slug scope was explicitly requested.
        return '__none__';
      }
    }
    return resolveDefaultCreatorId(this.prisma);
  }

  /**
   * Fixed-price M-Pesa checkout for an admin-defined reward tier (Patreon-style).
   */
  async checkoutCreatorReward(
    rewardId: string,
    dto: CheckoutCreatorRewardDto,
  ): Promise<{ payment: Payment; message: string; approvalUrl?: string }> {
    const reward = await this.prisma.creatorReward.findUnique({
      where: { id: rewardId },
    });
    if (!reward || !reward.active) {
      throw new BadRequestException('This reward is not available');
    }

    const amount = Math.round(Number(reward.amountKes));
    if (!Number.isFinite(amount) || amount < 1) {
      throw new BadRequestException('Invalid reward price');
    }

    const defaultCreatorId = await resolveDefaultCreatorId(this.prisma);
    const rewardCreatorId = reward.creatorId ?? defaultCreatorId ?? undefined;

    const limits = await resolveShoutoutLimits(
      this.prisma,
      rewardCreatorId ?? null,
    );
    if (amount > limits.maxKes) {
      throw new BadRequestException(
        `Reward price exceeds platform maximum (KES ${limits.maxKes})`,
      );
    }

    const handle = dto.displayName.trim().replace(/^@+/, '').slice(0, 64);
    if (!handle) {
      throw new BadRequestException('Display name is required');
    }

    let plat = (dto.platform || 'tiktok').trim().toLowerCase();
    if (!STREAM_ALERT_PLATFORM_SET.has(plat)) {
      plat = 'tiktok';
    }

    let msg: string | null = null;
    if (reward.allowSupporterMessage && dto.message?.trim()) {
      const maxLen = Math.min(500, Math.max(0, reward.maxMessageLength));
      msg = dto.message.trim().slice(0, maxLen) || null;
    }

    let videoPageUrl: string | null = null;
    if (reward.allowVideoClip && dto.videoUrl?.trim()) {
      videoPageUrl = await normalizeShoutoutVideoPageUrl(dto.videoUrl);
      if (amount < limits.minKesWithVideo) {
        throw new BadRequestException(
          `This reward’s price must be at least KES ${limits.minKesWithVideo} when a clip URL is included. Raise the tier price in admin or remove the clip.`,
        );
      }
    }

    let user = dto.mpesaMobile
      ? await this.userService.findByMpesaMobileEitherForm(dto.mpesaMobile)
      : await this.userService.findByTikTokUsername(handle, rewardCreatorId);
    const payMethod = (dto.paymentMethod || 'mpesa').toLowerCase();
    if (!user) {
      const slugBase =
        handle.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 40) || 'supporter';
      let unique = slugBase;
      let n = 0;
      while (await this.userService.findByTikTokUsername(unique, rewardCreatorId)) {
        unique = `${slugBase}_${++n}`;
      }
      const phone =
        payMethod === 'mpesa' && dto.mpesaMobile
          ? this.requireKenyaMsisdn(dto.mpesaMobile)
          : undefined;
      user = await this.userService.create({
        name: handle.slice(0, 120),
        tiktokUsername: unique,
        ...(phone ? { mpesaMobile: phone, whatsappNumber: phone } : {}),
        ...(rewardCreatorId ? { creatorId: rewardCreatorId } : {}),
      });
    } else if (!user.creatorId && rewardCreatorId) {
      user = await this.userService.update(user.id, {
        creator: { connect: { id: rewardCreatorId } },
      });
    }

    /**
     * OBS + wallet scope must match the creator who owns the tier, not a stale
     * user.creatorId from an earlier checkout on another page. Otherwise SSE
     * filters drop the alert (player subscribed with uid= reward owner).
     */
    const payCreatorId = rewardCreatorId ?? user.creatorId ?? undefined;
    if (
      rewardCreatorId &&
      user.creatorId &&
      user.creatorId !== rewardCreatorId
    ) {
      this.logger.warn(
        `Creator reward checkout: user ${user.id} is linked to creator ${user.creatorId} but tier belongs to ${rewardCreatorId}; payment scoped to tier owner for OBS.`,
      );
    }

    const savedPayment = await this.prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          userId: user.id,
          ...(payCreatorId ? { creatorId: payCreatorId } : {}),
          amount,
          months: 1,
          purpose: PaymentPurpose.CREATOR_REWARD,
          reference: `REWARD_${user.id}_${Date.now()}`,
          status: PaymentStatus.PENDING,
        },
      });
      await tx.creatorRewardPurchase.create({
        data: {
          paymentId: p.id,
          rewardId: reward.id,
          rewardNameSnapshot: reward.name.slice(0, 80),
          bannerLabelSnapshot: reward.alertBannerLabel.trim().slice(0, 40),
          ttsScriptSnapshot: reward.ttsScript?.trim().slice(0, 600) || null,
          displayName: handle,
          platform: plat,
          supporterMessage: msg,
          ...(videoPageUrl ? { videoUrl: videoPageUrl } : {}),
        },
      });
      return p;
    });

    try {
      if (payMethod === 'paystack') {
        const email =
          dto.email?.trim() ||
          (user.mpesaMobile
            ? chargeEmailForMsisdn(user.mpesaMobile)
            : `fan.${user.id.replace(/-/g, '')}@pay.makulutu.com`);
        const approvalUrl = await this.startPaystackHostedCheckout(
          savedPayment.id,
          email,
        );
        const payment = await this.prisma.payment.findUniqueOrThrow({
          where: { id: savedPayment.id },
        });
        return {
          payment,
          approvalUrl,
          message: 'Continue to Paystack to complete payment.',
        };
      }
      if (!user.mpesaMobile) {
        throw new BadRequestException('Enter a Kenyan M-Pesa number');
      }
      const stkResponse = await this.requirePaystack().initiateSTKPush({
        amount,
        msisdn: user.mpesaMobile,
        reference: savedPayment.id,
      });
      const payment = await this.prisma.payment.update({
        where: { id: savedPayment.id },
        data: { transactionRequestId: stkResponse.transaction_request_id },
      });
      return {
        payment,
        message: 'STK Push initiated. Complete payment on your phone.',
      };
    } catch (error) {
      const errMsg = httpClientMessage(error);
      this.logger.error(`Creator reward STK failed: ${errMsg}`);
      await this.prisma.payment.update({
        where: { id: savedPayment.id },
        data: {
          status: PaymentStatus.FAILED,
          failureReason: errMsg,
        },
      });
      throw new BadRequestException(stkUserFacingError(error));
    }
  }

  async findAll(): Promise<PaymentWithUser[]> {
    return await this.prisma.payment.findMany({
      include: {
        user: true,
        streamShoutout: true,
        creatorRewardPurchase: true,
        coachingBookings: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<PaymentWithUser> {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        user: true,
        streamShoutout: true,
        creatorRewardPurchase: true,
        coachingBookings: true,
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  /** Shape shared by website polling, success page, and mobile PayStatus. */
  toPublicClientPayment(
    payment: PaymentWithUser,
    extra?: {
      thankYouMessage?: string | null;
      creator?: {
        slug: string;
        displayName: string;
        avatarUrl: string | null;
        fanThankYouMessage: string | null;
        thankYouMessage: string | null;
      } | null;
      membership?: {
        id: string;
        status: string;
        months: number | null;
        endDate: Date | null;
      } | null;
    },
  ) {
    const amountKes = payment.amount != null ? Number(payment.amount) : null;
    const statusUpper = String(payment.status || '').toUpperCase();
    return {
      id: payment.id,
      amount: amountKes,
      amountKes,
      months: payment.months,
      purpose: payment.purpose,
      paymentMethod: payment.paymentMethod,
      status: statusUpper.toLowerCase(),
      statusUpper,
      createdAt: payment.createdAt,
      completedAt: payment.completedAt,
      thankYouMessage: extra?.thankYouMessage ?? extra?.creator?.thankYouMessage ?? null,
      creator: extra?.creator
        ? {
            slug: extra.creator.slug,
            displayName: extra.creator.displayName,
            avatarUrl: extra.creator.avatarUrl,
            fanThankYouMessage: extra.creator.fanThankYouMessage,
            thankYouMessage: extra.creator.thankYouMessage,
          }
        : null,
      membership: extra?.membership ?? null,
    };
  }

  async findOneForClient(id: string) {
    const payment = await this.findOne(id);
    let creator: {
      slug: string;
      displayName: string;
      avatarUrl: string | null;
      fanThankYouMessage: string | null;
      thankYouMessage: string | null;
    } | null = null;
    if (payment.creatorId) {
      const row = await this.prisma.creator.findUnique({
        where: { id: payment.creatorId },
        select: {
          slug: true,
          displayName: true,
          avatarUrl: true,
          fanThankYouMessage: true,
        },
      });
      if (row) {
        creator = {
          ...row,
          avatarUrl: await this.storage.resolveUrl(row.avatarUrl),
          thankYouMessage: row.fanThankYouMessage,
        };
      }
    }
    let membership: {
      id: string;
      status: string;
      months: number | null;
      endDate: Date | null;
    } | null = null;
    if (payment.userId) {
      const sub = await this.prisma.subscription.findFirst({
        where: {
          userId: payment.userId,
          ...(payment.creatorId ? { creatorId: payment.creatorId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, status: true, months: true, endDate: true },
      });
      if (sub) membership = sub;
    }
    return this.toPublicClientPayment(payment, {
      thankYouMessage: creator?.thankYouMessage ?? null,
      creator,
      membership,
    });
  }

  /** Public shoutout amount rules (subscribe page + checkout validation). */
  async getStreamAlertLimits(creatorSlug?: string) {
    const scopedId = await this.resolvePublicCreatorScopeId(
      creatorSlug,
      false,
    );
    return resolveShoutoutLimits(
      this.prisma,
      scopedId && scopedId !== '__none__' ? scopedId : null,
    );
  }

  async findByUser(userId: string): Promise<PaymentWithUser[]> {
    return await this.prisma.payment.findMany({
      where: { userId },
      include: {
        user: true,
        streamShoutout: true,
        creatorRewardPurchase: true,
        coachingBookings: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Opt out with OBS_ALERT_RENEWALS=false (default is to alert on renewals). */
  private suppressRenewalSubscriberObs(): boolean {
    return this.config.get<string>('OBS_ALERT_RENEWALS') === 'false';
  }

  private async inferObsKindForPayment(
    payment: PaymentWithUser,
  ): Promise<'new' | 'renewal'> {
    if (!payment.completedAt) return 'new';
    const prior = await this.prisma.payment.count({
      where: {
        userId: payment.userId,
        status: PaymentStatus.COMPLETED,
        completedAt: { lt: payment.completedAt },
      },
    });
    return prior > 0 ? 'renewal' : 'new';
  }

  /** SSE payload only (no DB claim). Used by live emit after claim and by admin replay. */
  private async dispatchSubscriberObsAlert(
    payment: PaymentWithUser,
    kind: 'new' | 'renewal',
  ): Promise<void> {
    const amountNum =
      payment.amount != null ? Number(payment.amount) : Number.NaN;
    const subscriptionAmountKes = Number.isFinite(amountNum)
      ? Math.round(amountNum)
      : undefined;
    await this.obsAlerts.emitSubscriberAlert(
      {
        kind,
        tiktokUsername: payment.user.tiktokUsername,
        ...(payment.creatorId ? { creatorId: payment.creatorId } : {}),
        ...this.obsTtsLanguagePayload(),
        ...(subscriptionAmountKes !== undefined
          ? { subscriptionAmountKes }
          : {}),
      },
      { requireEnabled: false },
    );
  }

  private async dispatchStreamShoutoutObsAlert(
    payment: PaymentWithUser,
  ): Promise<void> {
    const sh = payment.streamShoutout;
    const displayHandle =
      sh?.displayHandle?.trim() ||
      payment.streamAlertHandle?.trim() ||
      payment.user?.tiktokUsername;
    const plat = (
      sh?.platform ||
      payment.streamAlertPlatform ||
      ''
    ).trim().toLowerCase();
    const shout = (sh?.message ?? payment.streamAlertMessage)?.trim();
    const amtSrc = sh?.amountKes ?? payment.amount;
    const amountNum = amtSrc != null ? Number(amtSrc) : Number.NaN;
    const shoutoutAmountKes = Number.isFinite(amountNum)
      ? Math.round(amountNum)
      : undefined;
    const shoutoutVideoEmbedUrl = await resolveShoutoutVideoEmbedUrlForObs(
      sh?.videoUrl,
    );
    await this.obsAlerts.emitSubscriberAlert(
      {
        kind: 'shoutout',
        tiktokUsername: displayHandle,
        ...(payment.creatorId ? { creatorId: payment.creatorId } : {}),
        ...this.obsTtsLanguagePayload(),
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
        ...(shoutoutVideoEmbedUrl ? { shoutoutVideoEmbedUrl } : {}),
        skipGemini: true,
      },
      { requireEnabled: false },
    );
  }

  private async dispatchCreatorRewardObsAlert(
    payment: PaymentWithUser,
  ): Promise<void> {
    const pur = payment.creatorRewardPurchase;
    if (!pur) {
      throw new Error('Creator reward purchase missing');
    }
    const plat = (pur.platform || 'tiktok').trim().toLowerCase();
    const shout = pur.supporterMessage?.trim();
    const amtSrc = payment.amount;
    const amountNum = amtSrc != null ? Number(amtSrc) : Number.NaN;
    const shoutoutAmountKes = Number.isFinite(amountNum)
      ? Math.round(amountNum)
      : undefined;
    const shoutoutVideoEmbedUrl = await resolveShoutoutVideoEmbedUrlForObs(
      pur.videoUrl,
    );
    const creatorRewardTts = renderCreatorRewardTts(pur.ttsScriptSnapshot, {
      displayName: pur.displayName.trim(),
      rewardName: pur.rewardNameSnapshot.trim(),
      amount: shoutoutAmountKes ?? 0,
      message: shout || '',
    });
    await this.obsAlerts.emitSubscriberAlert(
      {
        kind: 'creator_reward',
        tiktokUsername: pur.displayName.trim().slice(0, 64),
        ...(payment.creatorId ? { creatorId: payment.creatorId } : {}),
        ...this.obsTtsLanguagePayload(),
        ...(plat && STREAM_ALERT_PLATFORM_SET.has(plat)
          ? { subscriberPlatform: plat }
          : {}),
        ...(shout ? { subscriberMessage: shout.slice(0, 500) } : {}),
        ...(shoutoutAmountKes !== undefined ? { shoutoutAmountKes } : {}),
        ...(shoutoutVideoEmbedUrl ? { shoutoutVideoEmbedUrl } : {}),
        creatorRewardBanner: pur.bannerLabelSnapshot.slice(0, 40),
        creatorRewardTts,
        skipGemini: true,
      },
      { requireEnabled: false },
    );
  }

  private async dispatchCoachingBookingObsAlert(
    payment: PaymentWithUser,
  ): Promise<void> {
    const booking =
      payment.coachingBookings && payment.coachingBookings.length > 0
        ? payment.coachingBookings[0]
        : null;
    if (!booking) {
      throw new Error('Coaching booking missing');
    }
    const amtSrc = payment.amount;
    const amountNum = amtSrc != null ? Number(amtSrc) : Number.NaN;
    const shoutoutAmountKes = Number.isFinite(amountNum)
      ? Math.round(amountNum)
      : COACHING_ACCOUNT_REVIEW_KES_DEFAULT;
    const acct = booking.accountUsername?.trim().slice(0, 120);
    await this.obsAlerts.emitSubscriberAlert(
      {
        kind: 'coaching_booking',
        tiktokUsername: booking.name.trim().slice(0, 80),
        ...(payment.creatorId ? { creatorId: payment.creatorId } : {}),
        ...(acct ? { coachingAccountUsername: acct } : {}),
        shoutoutAmountKes,
        ...(booking.notes?.trim()
          ? { subscriberMessage: booking.notes.trim().slice(0, 500) }
          : {}),
        skipGemini: true,
        ...this.obsTtsLanguagePayload(),
      },
      { requireEnabled: false },
    );
  }

  /**
   * One OBS alert per payment (webhook vs poll vs catch-up). Same options as admin test
   * so production OBS_ALERT_SECRET/stream-link rules do not block real checkouts.
   */
  private async emitSubscriberAlertForCompletedPayment(
    payment: PaymentWithUser,
    kind: 'new' | 'renewal',
  ): Promise<void> {
    if (kind === 'renewal' && this.suppressRenewalSubscriberObs()) {
      return;
    }

    const claimed = await this.prisma.payment.updateMany({
      where: {
        id: payment.id,
        status: PaymentStatus.COMPLETED,
        subscriberAlertEmittedAt: null,
      },
      data: { subscriberAlertEmittedAt: new Date() },
    });
    if (claimed.count === 0) {
      return;
    }

    try {
      await this.dispatchSubscriberObsAlert(payment, kind);
    } catch (err: unknown) {
      await this.prisma.payment.updateMany({
        where: { id: payment.id },
        data: { subscriberAlertEmittedAt: null },
      });
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`OBS subscriber alert failed for payment ${payment.id}: ${msg}`);
    }
  }

  private async emitStreamAlertForCompletedPayment(
    payment: PaymentWithUser,
  ): Promise<void> {
    const claimed = await this.prisma.payment.updateMany({
      where: {
        id: payment.id,
        status: PaymentStatus.COMPLETED,
        subscriberAlertEmittedAt: null,
      },
      data: { subscriberAlertEmittedAt: new Date() },
    });
    if (claimed.count === 0) {
      return;
    }

    try {
      await this.dispatchStreamShoutoutObsAlert(payment);
      void this.fanNotify.shoutoutPlayed(payment.id);
    } catch (err: unknown) {
      await this.prisma.payment.updateMany({
        where: { id: payment.id },
        data: { subscriberAlertEmittedAt: null },
      });
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `OBS stream shoutout failed for payment ${payment.id}: ${msg}`,
      );
    }
  }

  private async emitCreatorRewardAlertForCompletedPayment(
    payment: PaymentWithUser,
  ): Promise<void> {
    const claimed = await this.prisma.payment.updateMany({
      where: {
        id: payment.id,
        status: PaymentStatus.COMPLETED,
        subscriberAlertEmittedAt: null,
      },
      data: { subscriberAlertEmittedAt: new Date() },
    });
    if (claimed.count === 0) {
      return;
    }

    const full = await this.findOne(payment.id);
    const pur = full.creatorRewardPurchase;
    if (!pur) {
      await this.prisma.payment.updateMany({
        where: { id: payment.id },
        data: { subscriberAlertEmittedAt: null },
      });
      this.logger.error(
        `Creator reward purchase missing for payment ${payment.id}; OBS alert skipped`,
      );
      return;
    }

    try {
      await this.dispatchCreatorRewardObsAlert(full);
    } catch (err: unknown) {
      await this.prisma.payment.updateMany({
        where: { id: payment.id },
        data: { subscriberAlertEmittedAt: null },
      });
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `OBS creator reward alert failed for payment ${payment.id}: ${msg}`,
      );
    }
  }

  private async emitCoachingBookingAlertForCompletedPayment(
    payment: PaymentWithUser,
  ): Promise<void> {
    const claimed = await this.prisma.payment.updateMany({
      where: {
        id: payment.id,
        status: PaymentStatus.COMPLETED,
        subscriberAlertEmittedAt: null,
      },
      data: { subscriberAlertEmittedAt: new Date() },
    });
    if (claimed.count === 0) {
      return;
    }

    const full = await this.findOne(payment.id);
    const booking =
      full.coachingBookings && full.coachingBookings.length > 0
        ? full.coachingBookings[0]
        : null;
    if (!booking) {
      await this.prisma.payment.updateMany({
        where: { id: payment.id },
        data: { subscriberAlertEmittedAt: null },
      });
      this.logger.error(
        `Coaching booking missing for payment ${payment.id}; OBS alert skipped`,
      );
      return;
    }

    try {
      await this.dispatchCoachingBookingObsAlert(full);
    } catch (err: unknown) {
      await this.prisma.payment.updateMany({
        where: { id: payment.id },
        data: { subscriberAlertEmittedAt: null },
      });
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `OBS coaching booking alert failed for payment ${payment.id}: ${msg}`,
      );
    }
  }

  /**
   * Admin: re-send OBS SSE for a completed payment without touching subscriberAlertEmittedAt.
   */
  async replayCompletedObsAlertByPaymentId(
    paymentId: string,
  ): Promise<{ ok: true; purpose: string }> {
    const payment = await this.findOne(paymentId);
    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException(
        'Only completed payments can replay OBS alerts',
      );
    }
    const p = payment.purpose;
    try {
      if (p === PaymentPurpose.STREAM_ALERT) {
        await this.dispatchStreamShoutoutObsAlert(payment);
        return { ok: true, purpose: 'STREAM_ALERT' };
      }
      if (p === PaymentPurpose.CREATOR_REWARD) {
        if (!payment.creatorRewardPurchase) {
          throw new BadRequestException(
            'Creator reward purchase missing for this payment',
          );
        }
        await this.dispatchCreatorRewardObsAlert(payment);
        return { ok: true, purpose: 'CREATOR_REWARD' };
      }
      if (p === PaymentPurpose.COACHING_BOOKING) {
        if (
          !payment.coachingBookings ||
          payment.coachingBookings.length === 0
        ) {
          throw new BadRequestException(
            'Coaching booking missing for this payment',
          );
        }
        await this.dispatchCoachingBookingObsAlert(payment);
        return { ok: true, purpose: 'COACHING_BOOKING' };
      }
      if (p === PaymentPurpose.SUBSCRIPTION || p == null) {
        const kind = await this.inferObsKindForPayment(payment);
        await this.dispatchSubscriberObsAlert(payment, kind);
        return { ok: true, purpose: p ?? 'SUBSCRIPTION' };
      }
    } catch (err: unknown) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`OBS replay failed for payment ${paymentId}: ${msg}`);
      throw new BadRequestException(msg || 'OBS replay failed');
    }
    throw new BadRequestException('Unsupported payment type for OBS replay');
  }

  /**
   * Payment already COMPLETED in DB (e.g. webhook) but this Node process may not have
   * emitted yet — needed when the browser polls this same API for /payments/:id/status.
   */
  private async maybeCatchUpSubscriberObsAlert(paymentId: string): Promise<void> {
    try {
      const payment = await this.findOne(paymentId);
      if (payment.subscriberAlertEmittedAt) return;
      if (payment.purpose === PaymentPurpose.STREAM_ALERT) {
        await this.emitStreamAlertForCompletedPayment(payment);
        return;
      }
      if (payment.purpose === PaymentPurpose.COACHING_BOOKING) {
        await this.emitCoachingBookingAlertForCompletedPayment(payment);
        return;
      }
      if (payment.purpose === PaymentPurpose.CREATOR_REWARD) {
        await this.emitCreatorRewardAlertForCompletedPayment(payment);
        return;
      }
      const kind = await this.inferObsKindForPayment(payment);
      await this.emitSubscriberAlertForCompletedPayment(payment, kind);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`OBS catch-up skipped for payment ${paymentId}: ${msg}`);
    }
  }

  /**
   * Membership checkout via PayPal (order created; user must approve and capture on return).
   */
  async createSubscriptionPayPalCheckout(params: {
    userId: string;
    creatorId?: string;
    amount: number;
    months: number;
    reference: string;
    checkoutCountry?: string;
  }): Promise<{ payment: Payment; approvalUrl: string }> {
    if (!this.paypalService.isConfigured()) {
      throw new BadRequestException(
        'PayPal is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.',
      );
    }
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL')?.replace(/\/$/, '') ||
      'http://localhost:3000';

    const savedPayment = await this.prisma.payment.create({
      data: {
        userId: params.userId,
        creatorId: params.creatorId,
        amount: params.amount,
        months: params.months,
        reference: params.reference,
        purpose: PaymentPurpose.SUBSCRIPTION,
        status: PaymentStatus.PENDING,
        paymentMethod: PaymentMethod.PAYPAL,
        checkoutCountry: parseCheckoutCountry(params.checkoutCountry),
      },
    });

    const siteName =
      this.config.get<string>('NEXT_PUBLIC_SITE_NAME')?.trim() || 'Makulutu';
    const order = await this.paypalService.createOrder({
      amountKes: params.amount,
      customId: savedPayment.id,
      description: `${siteName} subscription (${params.months} mo)`,
      returnUrl: `${frontendUrl}/success?paymentId=${encodeURIComponent(savedPayment.id)}&paypal_return=1`,
      cancelUrl: `${frontendUrl}/support?paypal_cancel=1`,
      brandName: siteName,
    });

    const payment = await this.prisma.payment.update({
      where: { id: savedPayment.id },
      data: { paypalOrderId: order.id },
    });

    return { payment, approvalUrl: order.approvalUrl };
  }

  /** Capture an approved PayPal order and fulfill subscription side effects. */
  async capturePayPalOrder(orderId: string): Promise<PaymentWithUser> {
    const pending = await this.prisma.payment.findFirst({
      where: {
        paypalOrderId: orderId,
        status: PaymentStatus.PENDING,
        paymentMethod: PaymentMethod.PAYPAL,
      },
    });

    if (!pending) {
      const done = await this.prisma.payment.findFirst({
        where: {
          paypalOrderId: orderId,
          status: PaymentStatus.COMPLETED,
          paymentMethod: PaymentMethod.PAYPAL,
        },
      });
      if (done) {
        return this.findOne(done.id);
      }
      throw new NotFoundException('PayPal payment not found or already processed');
    }

    const orderMeta = await this.paypalService.getOrder(orderId);
    if (orderMeta.customId && orderMeta.customId !== pending.id) {
      throw new BadRequestException('PayPal order does not match this payment');
    }

    let cap: { status: string; captureId: string | null; id: string };
    try {
      cap = await this.paypalService.captureOrder(orderId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const already =
        typeof msg === 'string' &&
        (msg.includes('ORDER_ALREADY_CAPTURED') ||
          msg.includes('RESOURCE_NOT_FOUND'));
      if (already) {
        const refreshed = await this.prisma.payment.findUnique({
          where: { id: pending.id },
        });
        if (refreshed?.status === PaymentStatus.COMPLETED) {
          return this.findOne(pending.id);
        }
      }
      throw err;
    }

    if (cap.status !== 'COMPLETED') {
      throw new BadRequestException(`PayPal capture status: ${cap.status}`);
    }

    const captureId = cap.captureId || cap.id;

    await this.prisma.payment.update({
      where: { id: pending.id },
      data: {
        status: PaymentStatus.COMPLETED,
        transactionId: captureId,
        transactionReceipt: captureId,
        completedAt: new Date(),
      },
    });

    const updated = await this.findOne(pending.id);
    await this.finance.recordSuccessfulPayment(updated.id);
    await this.dispatchFulfillmentForCompletedPayment(updated);
    return updated;
  }

  private async ensureGiftRecipientUser(payment: PaymentWithUser) {
    const phone = String(payment.giftRecipientPhone || '').trim();
    const creatorId = payment.creatorId;
    if (!phone || !creatorId) return payment.user;
    const existing = await this.prisma.user.findFirst({
      where: {
        creatorId,
        OR: [{ mpesaMobile: phone }, { mpesaMobile: `0${phone.slice(3)}` }],
      },
    });
    if (existing) {
      const fan = await this.prisma.fan.findUnique({ where: { phone } });
      if (fan && !existing.fanId) {
        return this.prisma.user.update({
          where: { id: existing.id },
          data: { fanId: fan.id },
        });
      }
      return existing;
    }
    const name = (payment.giftRecipientName || 'Gifted fan').slice(0, 80);
    const base =
      name.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 40) || `gift_${phone.slice(-6)}`;
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
    const fan = await this.prisma.fan.findUnique({ where: { phone } });
    return this.prisma.user.create({
      data: {
        name,
        tiktokUsername: unique,
        mpesaMobile: phone,
        whatsappNumber: phone,
        creatorId,
        fanId: fan?.id || null,
      },
    });
  }

  private async linkFanToCheckoutUser(payment: PaymentWithUser): Promise<void> {
    const user = payment.user;
    if (!user || user.fanId) return;
    const phones = kenyaMsisdnAliases(user.mpesaMobile);
    if (phones.length === 0) return;
    const fan = await this.prisma.fan.findFirst({
      where: { isActive: true, phone: { in: phones } },
      select: { id: true },
    });
    if (!fan) return;
    await this.prisma.user.update({
      where: { id: user.id },
      data: { fanId: fan.id },
    });
  }

  private async dispatchFulfillmentForCompletedPayment(
    updatedPayment: PaymentWithUser,
  ): Promise<void> {
    await this.linkFanToCheckoutUser(updatedPayment);
    void this.fanNotify.paymentCompleted(updatedPayment.id);
    if (updatedPayment.purpose === PaymentPurpose.STREAM_ALERT) {
      await this.emitStreamAlertForCompletedPayment(updatedPayment);
      this.logger.log(`Stream alert payment completed: ${updatedPayment.id}`);
      return;
    }

    if (updatedPayment.purpose === PaymentPurpose.COACHING_BOOKING) {
      await this.emitCoachingBookingAlertForCompletedPayment(updatedPayment);
      this.logger.log(
        `Coaching booking payment completed: ${updatedPayment.id}`,
      );
      return;
    }

    if (updatedPayment.purpose === PaymentPurpose.CREATOR_REWARD) {
      await this.emitCreatorRewardAlertForCompletedPayment(updatedPayment);
      this.logger.log(`Creator reward payment completed: ${updatedPayment.id}`);
      return;
    }

    if (!updatedPayment.user) {
      throw new NotFoundException(
        `User not found for payment ${updatedPayment.id}`,
      );
    }
    const user = updatedPayment.user;
    const subUser = updatedPayment.giftRecipientPhone
      ? await this.ensureGiftRecipientUser(updatedPayment)
      : user;

    let subscription = await this.subscriptionService.findActiveByUser(subUser.id);

    if (!subscription) {
      subscription = await this.subscriptionService.findLatestByUser(subUser.id);
    }

    if (subscription) {
      await this.subscriptionService.extend(
        subscription.id,
        updatedPayment.months,
        parseFloat(updatedPayment.amount.toString()),
        updatedPayment.id,
        updatedPayment.checkoutCountry,
      );
      await this.emitSubscriberAlertForCompletedPayment(updatedPayment, 'renewal');
    } else {
      await this.subscriptionService.create(
        subUser,
        updatedPayment.months,
        parseFloat(updatedPayment.amount.toString()),
        updatedPayment.id,
        updatedPayment.creatorId,
        updatedPayment.checkoutCountry,
      );
      await this.emitSubscriberAlertForCompletedPayment(updatedPayment, 'new');
    }

    try {
      await this.whatsappService.sendInviteLink(user);
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp invite: ${error.message}`);
    }

    this.logger.log(`Payment processed successfully for user: ${user.id}`);
  }

  async handleSuccessfulPayment(webhookData: WebhookPayload): Promise<void> {
    this.logger.log(
      `Processing successful payment: ${webhookData.TransactionID}`,
    );
    this.logger.debug(`Webhook payload: ${JSON.stringify(webhookData)}`);

    // Find payment by multiple methods (TransactionReference might be undefined)
    let payment = null;

    // Try 1: Find by TransactionReference (payment ID)
    if (webhookData.TransactionReference) {
      const paymentId = paymentIdFromProviderReference(
        webhookData.TransactionReference,
      );
      if (paymentId) {
        payment = await this.prisma.payment.findUnique({
          where: { id: paymentId },
          include: {
        user: true,
        streamShoutout: true,
        creatorRewardPurchase: true,
        coachingBookings: true,
      },
        });
      }
      if (!payment) {
        payment = await this.prisma.payment.findFirst({
          where: { transactionRequestId: webhookData.TransactionReference },
          include: {
            user: true,
            streamShoutout: true,
            creatorRewardPurchase: true,
            coachingBookings: true,
          },
        });
      }
    }

    // Try 2: Find by MerchantRequestID
    if (!payment && webhookData.MerchantRequestID) {
      payment = await this.prisma.payment.findFirst({
        where: { merchantRequestId: webhookData.MerchantRequestID },
        include: {
        user: true,
        streamShoutout: true,
        creatorRewardPurchase: true,
        coachingBookings: true,
      },
      });
    }

    // Try 3: Find by CheckoutRequestID
    if (!payment && webhookData.CheckoutRequestID) {
      payment = await this.prisma.payment.findFirst({
        where: { checkoutRequestId: webhookData.CheckoutRequestID },
        include: {
        user: true,
        streamShoutout: true,
        creatorRewardPurchase: true,
        coachingBookings: true,
      },
      });
    }

    // Try 4: Find by TransactionID (if we already stored it)
    if (!payment && webhookData.TransactionID) {
      payment = await this.prisma.payment.findFirst({
        where: {
          OR: [
            { transactionId: webhookData.TransactionID },
            { transactionRequestId: webhookData.TransactionID },
          ],
        },
        include: {
        user: true,
        streamShoutout: true,
        creatorRewardPurchase: true,
        coachingBookings: true,
      },
      });
    }

    if (!payment) {
      this.logger.error(
        `Payment not found. TransactionReference: ${webhookData.TransactionReference}, MerchantRequestID: ${webhookData.MerchantRequestID}, CheckoutRequestID: ${webhookData.CheckoutRequestID}`,
      );
      throw new NotFoundException(
        `Payment not found for transaction: ${webhookData.TransactionID}`,
      );
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      await this.finance.recordSuccessfulPayment(payment.id);
      return;
    }

    // Update payment status
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.COMPLETED,
        transactionId: webhookData.TransactionID,
        transactionReceipt: webhookData.TransactionReceipt,
        merchantRequestId: webhookData.MerchantRequestID,
        checkoutRequestId: webhookData.CheckoutRequestID,
        completedAt: new Date(),
      },
    });

    const updatedPayment = await this.findOne(payment.id);
    await this.finance.recordSuccessfulPayment(updatedPayment.id);
    await this.dispatchFulfillmentForCompletedPayment(updatedPayment);
  }

  async handleFailedPayment(webhookData: WebhookPayload): Promise<void> {
    this.logger.log(`Processing failed payment: ${webhookData.TransactionID}`);
    this.logger.debug(`Webhook payload: ${JSON.stringify(webhookData)}`);

    // Find payment by multiple methods (TransactionReference might be undefined)
    let payment = null;

    // Try 1: Find by TransactionReference (payment ID)
    if (webhookData.TransactionReference) {
      const paymentId = paymentIdFromProviderReference(
        webhookData.TransactionReference,
      );
      if (paymentId) {
        payment = await this.prisma.payment.findUnique({
          where: { id: paymentId },
        });
      }
      if (!payment) {
        payment = await this.prisma.payment.findFirst({
          where: { transactionRequestId: webhookData.TransactionReference },
        });
      }
    }

    // Try 2: Find by MerchantRequestID
    if (!payment && webhookData.MerchantRequestID) {
      payment = await this.prisma.payment.findFirst({
        where: { merchantRequestId: webhookData.MerchantRequestID },
      });
    }

    // Try 3: Find by CheckoutRequestID
    if (!payment && webhookData.CheckoutRequestID) {
      payment = await this.prisma.payment.findFirst({
        where: { checkoutRequestId: webhookData.CheckoutRequestID },
      });
    }

    // Try 4: Find by TransactionID (if we already stored it)
    if (!payment && webhookData.TransactionID) {
      payment = await this.prisma.payment.findFirst({
        where: {
          OR: [
            { transactionId: webhookData.TransactionID },
            { transactionRequestId: webhookData.TransactionID },
          ],
        },
      });
    }

    if (!payment) {
      this.logger.error(
        `Payment not found. TransactionReference: ${webhookData.TransactionReference}, MerchantRequestID: ${webhookData.MerchantRequestID}, CheckoutRequestID: ${webhookData.CheckoutRequestID}`,
      );
      return;
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        transactionId: webhookData.TransactionID,
        failureReason: webhookData.ResponseDescription,
        failedAt: new Date(),
      },
    });
  }

  async checkPaymentStatus(paymentId: string): Promise<Payment> {
    const payment = await this.findOne(paymentId);

    // If payment is already completed, return it immediately
    if (payment.status === PaymentStatus.COMPLETED) {
      this.logger.log(`Payment ${paymentId} is already completed`);
      await this.finance.recordSuccessfulPayment(paymentId);
      await this.maybeCatchUpSubscriberObsAlert(paymentId);
      return this.findOne(paymentId);
    }

    // If payment is already failed, return it immediately
    if (payment.status === PaymentStatus.FAILED) {
      this.logger.log(`Payment ${paymentId} is already failed`);
      return payment;
    }

    if (payment.paymentMethod === PaymentMethod.PAYPAL) {
      this.logger.log(
        `Payment ${paymentId} is PayPal — status is updated after capture on return URL`,
      );
      return payment;
    }

    if (!payment.transactionRequestId) {
      throw new NotFoundException('Transaction request ID not found');
    }

    try {
      const status = await this.requirePaystack().checkTransactionStatus(
        payment.transactionRequestId,
      );

      this.logger.debug(`Mobile-money status check: ${JSON.stringify(status)}`);

      if (status.TransactionStatus === 'Completed' && status.TransactionCode === '0') {
        // Payment completed, update payment record
        const updatedPayment = await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.COMPLETED,
            transactionId: status.TransactionID,
            transactionReceipt: status.TransactionReceipt,
            completedAt: new Date(),
          },
        });
        await this.finance.recordSuccessfulPayment(payment.id);
        void this.fanNotify.paymentCompleted(payment.id);

        // Non-subscription OBS (shoutout / coaching / reward) must run even when the
        // user relation is missing — same as webhook path.
        try {
          const full = await this.findOne(payment.id);
          if (full.purpose === PaymentPurpose.STREAM_ALERT) {
            await this.emitStreamAlertForCompletedPayment(full);
            return updatedPayment;
          }
          if (full.purpose === PaymentPurpose.COACHING_BOOKING) {
            await this.emitCoachingBookingAlertForCompletedPayment(full);
            return updatedPayment;
          }
          if (full.purpose === PaymentPurpose.CREATOR_REWARD) {
            await this.emitCreatorRewardAlertForCompletedPayment(full);
            return updatedPayment;
          }
        } catch (obsErr: unknown) {
          const msg = obsErr instanceof Error ? obsErr.message : String(obsErr);
          this.logger.error(
            `OBS emit after status poll failed for payment ${payment.id}: ${msg}`,
          );
        }

        // Subscription + WhatsApp-style follow-up needs a user row.
        if (payment.user) {
          try {
            const user = payment.user;

            let subscription = await this.subscriptionService.findActiveByUser(user.id);

            if (!subscription) {
              subscription = await this.subscriptionService.findLatestByUser(user.id);
            }

            if (subscription) {
              await this.subscriptionService.extend(
                subscription.id,
                payment.months,
                parseFloat(payment.amount.toString()),
                payment.id,
                payment.checkoutCountry,
              );
              this.logger.log(`Extended subscription for user ${user.id}`);
              const forObs = await this.findOne(payment.id);
              await this.emitSubscriberAlertForCompletedPayment(forObs, 'renewal');
            } else {
              const fullPay = await this.findOne(payment.id);
              await this.subscriptionService.create(
                user,
                payment.months,
                parseFloat(payment.amount.toString()),
                payment.id,
                fullPay.creatorId,
                fullPay.checkoutCountry,
              );
              this.logger.log(`Created new subscription for user ${user.id}`);
              const forObs = await this.findOne(payment.id);
              await this.emitSubscriberAlertForCompletedPayment(forObs, 'new');
            }
          } catch (subError: unknown) {
            const m =
              subError instanceof Error ? subError.message : String(subError);
            this.logger.error(`Failed to process subscription: ${m}`);
          }
        }

        return updatedPayment;
      }

      // Check if payment failed
      if (status.TransactionStatus === 'Failed' || (status.TransactionCode && status.TransactionCode !== '0')) {
        return await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.FAILED,
            failureReason: status.ResultDesc || 'Payment failed',
            failedAt: new Date(),
          },
        });
      }

      return payment;
    } catch (error) {
      this.logger.error(`Failed to check payment status: ${error.message}`);
      // Return current payment status instead of throwing
      return payment;
    }
  }

  async getStats(scopedCreatorId?: string | null) {
    const scope =
      scopedCreatorId && scopedCreatorId.length > 0
        ? { creatorId: scopedCreatorId }
        : {};
    const completedWhere = {
      status: PaymentStatus.COMPLETED,
      ...scope,
    };
    const [
      total,
      completed,
      pending,
      failed,
      totalAmountResult,
      subscriptionAmountResult,
      shoutoutAmountResult,
      purposeGroups,
    ] = await Promise.all([
      this.prisma.payment.count({ where: scope }),
      this.prisma.payment.count({ where: completedWhere }),
      this.prisma.payment.count({
        where: { ...scope, status: PaymentStatus.PENDING },
      }),
      this.prisma.payment.count({
        where: { ...scope, status: PaymentStatus.FAILED },
      }),
      this.prisma.payment.aggregate({
        where: completedWhere,
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          ...completedWhere,
          OR: [
            { purpose: PaymentPurpose.SUBSCRIPTION },
            { purpose: null },
          ],
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          ...completedWhere,
          purpose: PaymentPurpose.STREAM_ALERT,
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.groupBy({
        by: ['purpose'],
        where: completedWhere,
        _sum: { amount: true },
      }),
    ]);

    const num = (v: unknown): number => {
      if (v == null) return 0;
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };
    const totalAmount = num(totalAmountResult._sum.amount);

    let subscriptionsKes = 0;
    let shoutoutsKes = 0;
    let coachingKes = 0;
    let tiersKes = 0;
    let otherKes = 0;
    for (const row of purposeGroups) {
      const a = num(row._sum.amount);
      const p = row.purpose;
      if (p === null || p === PaymentPurpose.SUBSCRIPTION) {
        subscriptionsKes += a;
      } else if (p === PaymentPurpose.STREAM_ALERT) {
        shoutoutsKes += a;
      } else if (p === PaymentPurpose.COACHING_BOOKING) {
        coachingKes += a;
      } else if (p === PaymentPurpose.CREATOR_REWARD) {
        tiersKes += a;
      } else {
        otherKes += a;
      }
    }

    return {
      total,
      completed,
      pending,
      failed,
      totalAmount,
      subscriptionAmount: num(subscriptionAmountResult._sum.amount),
      shoutoutAmount: num(shoutoutAmountResult._sum.amount),
      revenueBySource: {
        subscriptionsKes,
        shoutoutsKes,
        coachingKes,
        tiersKes,
        otherKes,
        totalKes: totalAmount,
      },
    };
  }

  private obsTtsLanguagePayload(): { languageCode: string } | Record<string, never> {
    const lang = this.config.get<string>('DEFAULT_OBS_TTS_LANGUAGE')?.trim();
    if (!lang) return {};
    return { languageCode: lang.slice(0, 20) };
  }

  private requireKenyaMsisdn(raw: string): string {
    const normalized = normalizeKenyaMsisdn(raw);
    if (!normalized) {
      throw new BadRequestException('Enter a valid Kenyan M-Pesa number');
    }
    return normalized;
  }
}

function httpClientMessage(error: unknown): string {
  if (error instanceof HttpException) {
    const res = error.getResponse();
    if (typeof res === 'string' && res.trim()) return res;
    if (typeof res === 'object' && res) {
      const msg = (res as { message?: unknown }).message;
      if (typeof msg === 'string' && msg.trim()) return msg;
      if (Array.isArray(msg)) return msg.map(String).join(', ');
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

function stkUserFacingError(error: unknown): string {
  const msg = httpClientMessage(error);
  return msg || 'Could not start payment. Try again.';
}
