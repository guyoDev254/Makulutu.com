import {
  BadRequestException,
  ConflictException,
  HttpException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import {
  LedgerAccount,
  LedgerEntryType,
  PaymentPurpose,
  PaymentStatus,
  PayoutRequestStatus,
  Prisma,
  SettlementStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PayoutNotifyService } from '../admin/payout-notify.service';
import { PaystackService } from '../paystack/paystack.service';
import {
  payoutIdFromTransferReference,
  payoutTransferReference,
} from '../paystack/paystack.mapper';
import { PaystackWebhookBody } from '../paystack/paystack.types';
import { extractKenyaMsisdn } from '../common/utils/mpesa-msisdn';
import {
  enumerateNairobiDays,
  nairobiRangeToUtcBounds,
  nairobiYmd,
  resolveRevenueRangeNairobi,
  type RevenuePreset,
} from '../common/utils/admin-revenue-range';
import {
  DEFAULT_MIN_WITHDRAWAL_KES,
  DEFAULT_PLATFORM_FEE_PERCENT,
  DEFAULT_SETTLEMENT_PERIOD_HOURS,
  DEFAULT_WITHDRAWAL_FEE_KES,
  MIN_WITHDRAWAL_KES_KEY,
  PLATFORM_FEE_PERCENT_KEY,
  SETTLEMENT_PERIOD_HOURS_KEY,
  WITHDRAWAL_FEE_KES_KEY,
  type FinanceConfig,
} from './finance-config';
import {
  centsToKesNumber,
  centsToKesString,
  parseKesToCents,
  parsePercentToHundredths,
  splitGrossCents,
} from './kes-money';

type Db = Prisma.TransactionClient | PrismaService;

export type PayoutDestinationInput = {
  amountKes?: number;
  payoutChannel?: string;
  notes?: string;
  channel?: 'MPESA' | 'BANK';
  bankCode?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
};

const PURPOSE_LABEL: Record<string, string> = {
  SUBSCRIPTION: 'Membership',
  STREAM_ALERT: 'Shoutout',
  COACHING_BOOKING: 'Coaching',
  CREATOR_REWARD: 'Reward',
};

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => PaystackService))
    private readonly paystack: PaystackService,
    private readonly payoutNotify: PayoutNotifyService,
  ) {}

  async loadConfig(): Promise<FinanceConfig> {
    const rows = await this.prisma.settings.findMany({
      where: {
        key: {
          in: [
            PLATFORM_FEE_PERCENT_KEY,
            SETTLEMENT_PERIOD_HOURS_KEY,
            MIN_WITHDRAWAL_KES_KEY,
            WITHDRAWAL_FEE_KES_KEY,
          ],
        },
      },
    });
    const map = new Map(rows.map((r) => [r.key, r.value ?? '']));
    const platformFeePercent =
      map.get(PLATFORM_FEE_PERCENT_KEY)?.trim() || DEFAULT_PLATFORM_FEE_PERCENT;
    let feePercentHundredths = parsePercentToHundredths(
      DEFAULT_PLATFORM_FEE_PERCENT,
    );
    try {
      feePercentHundredths = parsePercentToHundredths(platformFeePercent);
    } catch {
      feePercentHundredths = parsePercentToHundredths(
        DEFAULT_PLATFORM_FEE_PERCENT,
      );
    }
    const hoursRaw = Number.parseInt(
      map.get(SETTLEMENT_PERIOD_HOURS_KEY) || DEFAULT_SETTLEMENT_PERIOD_HOURS,
      10,
    );
    const settlementPeriodHours =
      Number.isFinite(hoursRaw) && hoursRaw >= 0 && hoursRaw <= 24 * 30
        ? hoursRaw
        : Number.parseInt(DEFAULT_SETTLEMENT_PERIOD_HOURS, 10);
    const minWithdrawalCents = parseKesToCents(
      map.get(MIN_WITHDRAWAL_KES_KEY) || DEFAULT_MIN_WITHDRAWAL_KES,
    );
    const withdrawalFeeCents = parseKesToCents(
      map.get(WITHDRAWAL_FEE_KES_KEY) || DEFAULT_WITHDRAWAL_FEE_KES,
    );
    return {
      platformFeePercent,
      feePercentHundredths,
      settlementPeriodHours,
      minWithdrawalCents,
      withdrawalFeeCents,
    };
  }

  /**
   * After a provider-verified COMPLETED payment: split, ledger, pending earnings.
   * Runs automatically on webhook, Paystack verify, status poll, and PayPal capture.
   * Duplicate calls are no-ops (ledgerPostedAt + unique idempotency keys).
   */
  async recordSuccessfulPayment(paymentId: string): Promise<void> {
    const cfg = await this.loadConfig();
    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
      });
      if (!payment) return;
      if (payment.status !== PaymentStatus.COMPLETED) return;
      if (payment.ledgerPostedAt) return;
      if (!payment.creatorId || payment.amount == null) {
        this.logger.warn(
          `Skip ledger for payment ${paymentId}: missing creator or amount`,
        );
        return;
      }

      const grossCents = parseKesToCents(payment.amount);
      const { feeCents, creatorCents } = splitGrossCents(
        grossCents,
        cfg.feePercentHundredths,
      );
      const completedAt = payment.completedAt ?? new Date();
      const settleAt = new Date(
        completedAt.getTime() + cfg.settlementPeriodHours * 3600_000,
      );

      await this.insertLedger(tx, {
        type: LedgerEntryType.PAYMENT_EARNING,
        account: LedgerAccount.CREATOR_PENDING,
        amountKes: centsToKesString(creatorCents),
        creatorId: payment.creatorId,
        paymentId: payment.id,
        idempotencyKey: `PAYMENT_EARNING:${payment.id}`,
        description: 'Creator pending earnings',
      });
      await this.insertLedger(tx, {
        type: LedgerEntryType.PLATFORM_FEE,
        account: LedgerAccount.PLATFORM_REVENUE,
        amountKes: centsToKesString(feeCents),
        creatorId: payment.creatorId,
        paymentId: payment.id,
        idempotencyKey: `PLATFORM_FEE:${payment.id}`,
        description: `Platform fee ${cfg.platformFeePercent}%`,
      });

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          platformFeeKes: centsToKesString(feeCents),
          creatorAmountKes: centsToKesString(creatorCents),
          feePercentSnapshot: cfg.platformFeePercent,
          settlementStatus: SettlementStatus.PENDING,
          settleAt,
          ledgerPostedAt: new Date(),
        },
      });

      if (settleAt.getTime() <= Date.now()) {
        await this.settleLockedPayment(tx, payment.id);
      }
    });
  }

  async settleDuePayments(): Promise<number> {
    const due = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.COMPLETED,
        settlementStatus: SettlementStatus.PENDING,
        settleAt: { lte: new Date() },
        ledgerPostedAt: { not: null },
      },
      select: { id: true },
      take: 40,
      orderBy: { settleAt: 'asc' },
    });
    let n = 0;
    for (const row of due) {
      const ok = await this.prisma.$transaction((tx) =>
        this.settleLockedPayment(tx, row.id),
      );
      if (ok) n += 1;
    }
    return n;
  }

  private async settleLockedPayment(
    tx: Prisma.TransactionClient,
    paymentId: string,
  ): Promise<boolean> {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (
      !payment ||
      payment.status !== PaymentStatus.COMPLETED ||
      payment.settlementStatus !== SettlementStatus.PENDING ||
      !payment.creatorId ||
      payment.creatorAmountKes == null
    ) {
      return false;
    }
    if (payment.settleAt && payment.settleAt.getTime() > Date.now()) {
      return false;
    }
    const amount = centsToKesString(parseKesToCents(payment.creatorAmountKes));
    await this.insertLedger(tx, {
      type: LedgerEntryType.SETTLEMENT,
      account: LedgerAccount.CREATOR_PENDING,
      amountKes: centsToKesString(-parseKesToCents(payment.creatorAmountKes)),
      creatorId: payment.creatorId,
      paymentId: payment.id,
      idempotencyKey: `SETTLEMENT:PENDING:${payment.id}`,
      description: 'Move pending → available',
    });
    await this.insertLedger(tx, {
      type: LedgerEntryType.SETTLEMENT,
      account: LedgerAccount.CREATOR_AVAILABLE,
      amountKes: amount,
      creatorId: payment.creatorId,
      paymentId: payment.id,
      idempotencyKey: `SETTLEMENT:AVAILABLE:${payment.id}`,
      description: 'Settled creator earnings',
    });
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        settlementStatus: SettlementStatus.SETTLED,
        settledAt: new Date(),
      },
    });
    return true;
  }

  async refundPayment(
    paymentId: string,
    opts: { reason?: string; createdBy?: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { refund: true },
      });
      if (!payment) throw new NotFoundException('Payment not found');
      if (payment.status !== PaymentStatus.COMPLETED) {
        throw new BadRequestException('Only completed payments can be refunded');
      }
      if (payment.refund) {
        throw new ConflictException('Payment already refunded');
      }
      if (!payment.creatorId || payment.creatorAmountKes == null) {
        throw new BadRequestException('Payment has no ledger split to reverse');
      }

      const creatorCents = parseKesToCents(payment.creatorAmountKes);
      const feeCents = parseKesToCents(payment.platformFeeKes);
      const grossCents = parseKesToCents(payment.amount);
      const refund = await tx.paymentRefund.create({
        data: {
          paymentId: payment.id,
          grossAmountKes: centsToKesString(grossCents),
          platformFeeKes: centsToKesString(feeCents),
          creatorAmountKes: centsToKesString(creatorCents),
          reason: opts.reason?.trim().slice(0, 500) || null,
          createdBy: opts.createdBy?.trim().slice(0, 120) || null,
        },
      });

      await this.insertLedger(tx, {
        type: LedgerEntryType.REFUND,
        account: LedgerAccount.PLATFORM_REVENUE,
        amountKes: centsToKesString(-feeCents),
        creatorId: payment.creatorId,
        paymentId: payment.id,
        refundId: refund.id,
        idempotencyKey: `REFUND:PLATFORM:${payment.id}`,
        description: 'Reverse platform fee',
      });

      if (payment.settlementStatus === SettlementStatus.PENDING) {
        await this.insertLedger(tx, {
          type: LedgerEntryType.REFUND,
          account: LedgerAccount.CREATOR_PENDING,
          amountKes: centsToKesString(-creatorCents),
          creatorId: payment.creatorId,
          paymentId: payment.id,
          refundId: refund.id,
          idempotencyKey: `REFUND:PENDING:${payment.id}`,
          description: 'Reverse pending earnings',
        });
      } else {
        const bals = await this.sumCreatorAccounts(tx, payment.creatorId);
        const fromAvailable = bals.available >= creatorCents ? creatorCents : bals.available;
        const remainder = creatorCents - fromAvailable;
        if (fromAvailable > 0n) {
          await this.insertLedger(tx, {
            type: LedgerEntryType.REFUND,
            account: LedgerAccount.CREATOR_AVAILABLE,
            amountKes: centsToKesString(-fromAvailable),
            creatorId: payment.creatorId,
            paymentId: payment.id,
            refundId: refund.id,
            idempotencyKey: `REFUND:AVAILABLE:${payment.id}`,
            description: 'Reverse settled earnings',
          });
        }
        if (remainder > 0n) {
          await this.insertLedger(tx, {
            type: LedgerEntryType.REFUND,
            account: LedgerAccount.CREATOR_DEBT,
            amountKes: centsToKesString(remainder),
            creatorId: payment.creatorId,
            paymentId: payment.id,
            refundId: refund.id,
            idempotencyKey: `REFUND:DEBT:${payment.id}`,
            description: 'Creator receivable after refund of withdrawn funds',
          });
        }
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          settlementStatus:
            payment.settlementStatus === SettlementStatus.PENDING
              ? SettlementStatus.REFUNDED
              : SettlementStatus.ADJUSTED,
          refundedAt: new Date(),
        },
      });
      return refund;
    });
  }

  async getCreatorBalances(creatorId: string, db: Db = this.prisma) {
    return this.sumCreatorAccounts(db, creatorId);
  }

  private async sumCreatorAccounts(db: Db, creatorId: string) {
    const groups = await db.ledgerEntry.groupBy({
      by: ['account'],
      where: { creatorId },
      _sum: { amountKes: true },
    });
    const map = new Map<LedgerAccount, bigint>();
    for (const g of groups) {
      map.set(g.account, parseKesToCents(g._sum.amountKes));
    }
    const pending = map.get(LedgerAccount.CREATOR_PENDING) ?? 0n;
    const available = map.get(LedgerAccount.CREATOR_AVAILABLE) ?? 0n;
    const reserved = map.get(LedgerAccount.CREATOR_RESERVED) ?? 0n;
    const debt = map.get(LedgerAccount.CREATOR_DEBT) ?? 0n;
    const withdrawable = available > debt ? available - debt : 0n;
    return { pending, available, reserved, debt, withdrawable };
  }

  async createWithdrawal(
    creatorId: string,
    body: PayoutDestinationInput & { amountKes: number },
  ) {
    const cfg = await this.loadConfig();
    const requestedCents = parseKesToCents(
      (Math.round(Number(body.amountKes) * 100) / 100).toFixed(2),
    );
    if (requestedCents <= 0n) {
      throw new BadRequestException('Invalid payout amount');
    }
    if (requestedCents < cfg.minWithdrawalCents) {
      throw new BadRequestException(
        `Minimum payout request is KES ${centsToKesString(cfg.minWithdrawalCents)}`,
      );
    }

    try {
      const created = await this.prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM creators WHERE id = ${creatorId} FOR UPDATE`;

          const dest = await tx.creatorPayoutDestination.findUnique({
            where: { creatorId },
          });
          const destination = await this.saveDestination(tx, creatorId, body, dest);
          if (!destination.verifiedAt) {
            throw new BadRequestException(
              'Payout destination is not verified yet.',
            );
          }

          const open = await tx.payoutRequest.findFirst({
            where: {
              creatorId,
              status: {
                in: [PayoutRequestStatus.PENDING, PayoutRequestStatus.APPROVED],
              },
            },
            select: { id: true },
          });
          if (open) {
            throw new BadRequestException(
              'You already have a payout in progress. Wait for it to finish before requesting another.',
            );
          }

          const bals = await this.sumCreatorAccounts(tx, creatorId);
          if (requestedCents > bals.withdrawable) {
            throw new BadRequestException(
              `Requested amount exceeds available balance (KES ${centsToKesString(bals.withdrawable)})`,
            );
          }

          const fee = cfg.withdrawalFeeCents;
          const payout = requestedCents > fee ? requestedCents - fee : 0n;
          if (payout <= 0n) {
            throw new BadRequestException(
              'Payout after the withdrawal fee is too small. Request a larger amount.',
            );
          }
          const row = await tx.payoutRequest.create({
            data: {
              creatorId,
              amountKes: centsToKesString(requestedCents),
              withdrawalFeeKes: centsToKesString(fee),
              payoutAmountKes: centsToKesString(payout),
              payoutChannel: this.destinationLabel(destination),
              destinationId: destination.id,
              notes: body.notes?.trim().slice(0, 1000) || null,
              status: PayoutRequestStatus.PENDING,
            },
            include: {
              creator: {
                select: { email: true, displayName: true, slug: true },
              },
            },
          });

          await this.insertLedger(tx, {
            type: LedgerEntryType.WITHDRAWAL_RESERVATION,
            account: LedgerAccount.CREATOR_AVAILABLE,
            amountKes: centsToKesString(-requestedCents),
            creatorId,
            payoutRequestId: row.id,
            idempotencyKey: `WD_RESERVE:AVAILABLE:${row.id}`,
            description: 'Reserve withdrawal',
          });
          await this.insertLedger(tx, {
            type: LedgerEntryType.WITHDRAWAL_RESERVATION,
            account: LedgerAccount.CREATOR_RESERVED,
            amountKes: centsToKesString(requestedCents),
            creatorId,
            payoutRequestId: row.id,
            idempotencyKey: `WD_RESERVE:RESERVED:${row.id}`,
            description: 'Reserved withdrawal',
          });

          return {
            ...row,
            amountKes: centsToKesNumber(requestedCents),
            withdrawalFeeKes: centsToKesNumber(fee),
            payoutAmountKes: centsToKesNumber(payout),
            payoutChannel: `****${destination.last4}`,
            msisdn: `****${destination.last4}`,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      await this.dispatchPaystackTransfer(created.id);
      const latest = await this.prisma.payoutRequest.findUnique({
        where: { id: created.id },
        include: {
          creator: {
            select: { email: true, displayName: true, slug: true },
          },
        },
      });
      return {
        ...created,
        ...latest,
        amountKes: created.amountKes,
        withdrawalFeeKes: created.withdrawalFeeKes,
        payoutAmountKes: created.payoutAmountKes,
        payoutChannel: created.payoutChannel,
        msisdn: created.msisdn,
      };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2034'
      ) {
        throw new ConflictException(
          'Another withdrawal is being processed. Try again.',
        );
      }
      throw err;
    }
  }

  async applyPayoutReview(
    id: string,
    body: {
      status: 'APPROVED' | 'REJECTED' | 'PAID' | 'FAILED' | 'CANCELLED';
      notes?: string;
      payoutReference?: string;
    },
    reviewerLabel?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.payoutRequest.findUnique({
        where: { id },
        include: {
          creator: {
            select: { id: true, slug: true, displayName: true, email: true },
          },
        },
      });
      if (!existing) throw new NotFoundException('Payout request not found');

      const next = body.status as PayoutRequestStatus;
      if (existing.status === next) {
        return this.mapPayoutReviewRow(existing, parseKesToCents(existing.amountKes));
      }
      if (existing.status === PayoutRequestStatus.PAID) {
        return this.mapPayoutReviewRow(existing, parseKesToCents(existing.amountKes));
      }
      if (
        next === PayoutRequestStatus.PAID &&
        existing.status !== PayoutRequestStatus.APPROVED &&
        existing.status !== PayoutRequestStatus.PENDING
      ) {
        throw new BadRequestException(
          'Only pending or approved payout requests can be marked as paid',
        );
      }
      if (
        (next === PayoutRequestStatus.FAILED ||
          next === PayoutRequestStatus.REJECTED ||
          next === PayoutRequestStatus.CANCELLED) &&
        existing.status !== PayoutRequestStatus.PENDING &&
        existing.status !== PayoutRequestStatus.APPROVED
      ) {
        throw new BadRequestException('This payout can no longer be cancelled');
      }

      const ref = body.payoutReference?.trim().slice(0, 120) || null;
      if (next === PayoutRequestStatus.PAID && ref) {
        const clash = await tx.payoutRequest.findFirst({
          where: { payoutReference: ref, NOT: { id } },
          select: { id: true },
        });
        if (clash) {
          throw new ConflictException('Payout provider reference already used');
        }
      }

      const now = new Date();
      const row = await tx.payoutRequest.update({
        where: { id },
        data: {
          status: next,
          notes: body.notes?.trim().slice(0, 1000) || existing.notes || null,
          payoutReference: ref || existing.payoutReference || null,
          failureReason:
            next === PayoutRequestStatus.FAILED ||
            next === PayoutRequestStatus.REJECTED
              ? body.notes?.trim().slice(0, 500) || existing.failureReason
              : existing.failureReason,
          reviewedBy:
            reviewerLabel?.trim().slice(0, 120) || existing.reviewedBy || null,
          reviewedAt:
            next === PayoutRequestStatus.APPROVED ||
            next === PayoutRequestStatus.REJECTED ||
            next === PayoutRequestStatus.CANCELLED
              ? now
              : existing.reviewedAt,
          processedAt:
            next === PayoutRequestStatus.APPROVED ? now : existing.processedAt,
          paidAt: next === PayoutRequestStatus.PAID ? now : existing.paidAt,
        },
        include: {
          creator: {
            select: { id: true, slug: true, displayName: true, email: true },
          },
        },
      });

      const requested = parseKesToCents(existing.amountKes);
      if (
        next === PayoutRequestStatus.REJECTED ||
        next === PayoutRequestStatus.FAILED ||
        next === PayoutRequestStatus.CANCELLED
      ) {
        await this.releaseReservation(tx, existing.creatorId, existing.id, requested);
      }
      if (next === PayoutRequestStatus.PAID) {
        await this.completeWithdrawal(tx, existing, requested);
      }

      return this.mapPayoutReviewRow(row, requested);
    });
  }

  private mapPayoutReviewRow<
    T extends {
      withdrawalFeeKes: Prisma.Decimal;
      payoutAmountKes: Prisma.Decimal | null;
    },
  >(row: T, requestedCents: bigint): T & {
    amountKes: number;
    withdrawalFeeKes: number;
    payoutAmountKes: number | null;
  } {
    return {
      ...row,
      amountKes: centsToKesNumber(requestedCents),
      withdrawalFeeKes: centsToKesNumber(parseKesToCents(row.withdrawalFeeKes)),
      payoutAmountKes: row.payoutAmountKes
        ? centsToKesNumber(parseKesToCents(row.payoutAmountKes))
        : null,
    };
  }

  async handlePaystackTransferEvent(payload: PaystackWebhookBody) {
    const event = String(payload.event || '').toLowerCase();
    const data = payload.data;
    const reference = data?.reference || data?.transfer_code || null;
    const payoutId =
      payoutIdFromTransferReference(data?.reference) ||
      (await this.findPayoutIdByReference(reference));
    if (!payoutId) {
      this.logger.warn(`Paystack transfer webhook with no matching payout: ${reference}`);
      return;
    }

    const existing = await this.prisma.payoutRequest.findUnique({
      where: { id: payoutId },
      include: {
        creator: { select: { email: true, displayName: true, slug: true } },
      },
    });
    if (!existing) return;
    if (existing.status === PayoutRequestStatus.PAID) return;
    if (
      (existing.status === PayoutRequestStatus.FAILED ||
        existing.status === PayoutRequestStatus.REJECTED ||
        existing.status === PayoutRequestStatus.CANCELLED) &&
      (event === 'transfer.failed' || event === 'transfer.reversed')
    ) {
      return;
    }

    const status = String(data?.status || '').toLowerCase();
    const failed =
      event === 'transfer.failed' ||
      event === 'transfer.reversed' ||
      status === 'failed' ||
      status === 'reversed';
    const success = event === 'transfer.success' || status === 'success';

    if (success && !failed) {
      const row = await this.applyPayoutReview(
        payoutId,
        {
          status: 'PAID',
          payoutReference: reference || undefined,
          notes: 'Paid via Paystack',
        },
        'Paystack',
      );
      void this.payoutNotify.notify('PAID', {
        amountKes: Number(row.amountKes),
        payoutChannel: existing.payoutChannel,
        payoutReference: reference,
        notes: null,
        creator: existing.creator,
      });
      return;
    }

    if (failed) {
      const row = await this.applyPayoutReview(
        payoutId,
        {
          status: 'FAILED',
          notes: data?.gateway_response
            ? String(data.gateway_response)
            : 'Paystack transfer failed',
          payoutReference: reference || undefined,
        },
        'Paystack',
      );
      void this.payoutNotify.notify('FAILED', {
        amountKes: Number(row.amountKes),
        payoutChannel: existing.payoutChannel,
        payoutReference: reference,
        notes:
          (typeof row.failureReason === 'string' && row.failureReason) ||
          (data?.gateway_response ? String(data.gateway_response) : 'Paystack transfer failed'),
        creator: existing.creator,
      });
    }
  }

  private async findPayoutIdByReference(reference: string | null): Promise<string | null> {
    if (!reference) return null;
    const row = await this.prisma.payoutRequest.findFirst({
      where: { payoutReference: reference },
      select: { id: true },
    });
    return row?.id || null;
  }

  private async dispatchPaystackTransfer(payoutId: string) {
    const row = await this.prisma.payoutRequest.findUnique({
      where: { id: payoutId },
      include: {
        destination: true,
        creator: { select: { displayName: true, slug: true, email: true } },
      },
    });
    if (!row || row.status === PayoutRequestStatus.PAID) return;
    if (
      row.status !== PayoutRequestStatus.PENDING &&
      row.status !== PayoutRequestStatus.APPROVED
    ) {
      return;
    }

    let queued = false;
    try {
      if (!this.paystack.isConfigured()) {
        throw new BadRequestException(
          'Payouts are not available right now. Try again later.',
        );
      }
      const dest = row.destination;
      if (!dest) {
        throw new BadRequestException(
          'Save an M-Pesa number or Kenyan bank account first.',
        );
      }
      const isBank = dest.channel === 'BANK';
      if (isBank && (!dest.accountNumber || !dest.bankCode)) {
        throw new BadRequestException('Save a Kenyan bank account before sending a payout.');
      }
      if (!isBank && !dest.msisdn) {
        throw new BadRequestException('Save a verified M-Pesa payout number first.');
      }
      const net = centsToKesNumber(parseKesToCents(row.payoutAmountKes));
      if (net <= 0) {
        throw new BadRequestException('Payout amount after fees is too small.');
      }

      let recipientCode = dest.paystackRecipientCode;
      if (!recipientCode) {
        recipientCode = isBank
          ? await this.paystack.createKepssRecipient({
              name:
                dest.accountName?.trim() ||
                row.creator.displayName?.trim() ||
                row.creator.slug,
              accountNumber: dest.accountNumber!,
              bankCode: dest.bankCode!,
            })
          : await this.paystack.createMpesaRecipient({
              name: row.creator.displayName?.trim() || row.creator.slug,
              msisdn: dest.msisdn!,
            });
        await this.prisma.creatorPayoutDestination.update({
          where: { id: dest.id },
          data: { paystackRecipientCode: recipientCode },
        });
      }

      const transfer = await this.paystack.initiateKesTransfer({
        amountKes: net,
        recipientCode,
        reference: payoutTransferReference(row.id),
        reason: 'Makulutu payout',
      });
      queued = true;
      const paystackRef = transfer.reference || transfer.transferCode;
      await this.applyPayoutReview(
        row.id,
        {
          status: 'APPROVED',
          payoutReference: paystackRef,
          notes: 'Queued with Paystack',
        },
        'Paystack',
      );
      if (transfer.status === 'success') {
        await this.applyPayoutReview(
          row.id,
          {
            status: 'PAID',
            payoutReference: paystackRef,
            notes: 'Paid via Paystack',
          },
          'Paystack',
        );
      }
    } catch (err) {
      const message =
        err instanceof HttpException
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Paystack payout failed';
      if (!queued) {
        try {
          await this.applyPayoutReview(
            payoutId,
            { status: 'FAILED', notes: message.slice(0, 500) },
            'Paystack',
          );
        } catch (releaseErr) {
          this.logger.error(
            `Could not release failed payout ${payoutId}: ${
              releaseErr instanceof Error ? releaseErr.message : String(releaseErr)
            }`,
          );
        }
      }
      this.logger.error(`Paystack payout ${payoutId}: ${message}`);
      throw err instanceof HttpException
        ? err
        : new BadRequestException(message);
    }
  }

  private async releaseReservation(
    tx: Prisma.TransactionClient,
    creatorId: string,
    payoutId: string,
    requestedCents: bigint,
  ) {
    await this.insertLedger(tx, {
      type: LedgerEntryType.WITHDRAWAL_FAILED,
      account: LedgerAccount.CREATOR_RESERVED,
      amountKes: centsToKesString(-requestedCents),
      creatorId,
      payoutRequestId: payoutId,
      idempotencyKey: `WD_FAIL:RESERVED:${payoutId}`,
      description: 'Release reserved withdrawal',
    });
    await this.insertLedger(tx, {
      type: LedgerEntryType.WITHDRAWAL_FAILED,
      account: LedgerAccount.CREATOR_AVAILABLE,
      amountKes: centsToKesString(requestedCents),
      creatorId,
      payoutRequestId: payoutId,
      idempotencyKey: `WD_FAIL:AVAILABLE:${payoutId}`,
      description: 'Return funds after failed payout',
    });
  }

  private async completeWithdrawal(
    tx: Prisma.TransactionClient,
    existing: { id: string; creatorId: string; withdrawalFeeKes: Prisma.Decimal },
    requestedCents: bigint,
  ) {
    const feeCents = parseKesToCents(existing.withdrawalFeeKes);
    await this.insertLedger(tx, {
      type: LedgerEntryType.WITHDRAWAL_COMPLETED,
      account: LedgerAccount.CREATOR_RESERVED,
      amountKes: centsToKesString(-requestedCents),
      creatorId: existing.creatorId,
      payoutRequestId: existing.id,
      idempotencyKey: `WD_DONE:RESERVED:${existing.id}`,
      description: 'Withdrawal completed',
    });
    if (feeCents > 0n) {
      await this.insertLedger(tx, {
        type: LedgerEntryType.WITHDRAWAL_FEE,
        account: LedgerAccount.PLATFORM_REVENUE,
        amountKes: centsToKesString(feeCents),
        creatorId: existing.creatorId,
        payoutRequestId: existing.id,
        idempotencyKey: `WD_FEE:${existing.id}`,
        description: 'Withdrawal fee',
      });
    }
  }

  async upsertPayoutDestination(creatorId: string, body: PayoutDestinationInput | string) {
    const input =
      typeof body === 'string' ? { payoutChannel: body, channel: 'MPESA' as const } : body;
    const row = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.creatorPayoutDestination.findUnique({
        where: { creatorId },
      });
      return this.saveDestination(tx, creatorId, input, existing);
    });
    return this.maskDestination(row);
  }

  async getPayoutDestination(creatorId: string) {
    const row = await this.prisma.creatorPayoutDestination.findUnique({
      where: { creatorId },
    });
    return row ? this.maskDestination(row) : null;
  }

  async listPayoutBanks() {
    return this.paystack.listKenyaBanks();
  }

  private destinationLabel(row: {
    channel: string;
    msisdn?: string | null;
    bankName?: string | null;
    last4: string;
  }) {
    if (row.channel === 'BANK') {
      return `${row.bankName?.trim() || 'Bank'} ****${row.last4}`;
    }
    return row.msisdn || `****${row.last4}`;
  }

  private async saveDestination(
    tx: Prisma.TransactionClient,
    creatorId: string,
    body: PayoutDestinationInput,
    existing: {
      id: string;
      channel: string;
      msisdn: string | null;
      last4: string;
      bankCode: string | null;
      bankName: string | null;
      accountNumber: string | null;
      accountName: string | null;
      verifiedAt: Date | null;
    } | null,
  ) {
    const wantsBank =
      String(body.channel || '').toUpperCase() === 'BANK' ||
      Boolean(body.accountNumber?.trim());
    if (wantsBank) {
      const accountNumber = String(body.accountNumber || '').replace(/\s+/g, '');
      const bankCode = String(body.bankCode || '').trim();
      const bankName = String(body.bankName || '').trim();
      const accountName = String(body.accountName || '').trim();
      if (!bankCode || !/^\d{5,20}$/.test(accountNumber)) {
        throw new BadRequestException(
          'Enter a Kenyan bank, account number, and the name on the account.',
        );
      }
      const last4 = accountNumber.slice(-4);
      const data = {
        channel: 'BANK',
        msisdn: null,
        last4,
        bankCode,
        bankName: bankName.slice(0, 80) || null,
        accountNumber,
        accountName: accountName.slice(0, 80) || null,
        verifiedAt: new Date(),
        paystackRecipientCode: null,
      };
      if (existing) {
        return tx.creatorPayoutDestination.update({
          where: { id: existing.id },
          data,
        });
      }
      return tx.creatorPayoutDestination.create({
        data: { creatorId, ...data },
      });
    }

    const msisdn = extractKenyaMsisdn(body.payoutChannel);
    if (msisdn) {
      const data = {
        channel: 'MPESA',
        msisdn,
        last4: msisdn.slice(-4),
        bankCode: null,
        bankName: null,
        accountNumber: null,
        accountName: null,
        verifiedAt: new Date(),
        paystackRecipientCode: null,
      };
      if (existing) {
        return tx.creatorPayoutDestination.update({
          where: { id: existing.id },
          data,
        });
      }
      return tx.creatorPayoutDestination.create({
        data: { creatorId, ...data },
      });
    }

    if (existing?.verifiedAt) return existing;
    throw new BadRequestException(
      'Save an M-Pesa number or a Kenyan bank account before requesting a withdrawal.',
    );
  }

  private maskDestination(row: {
    id: string;
    channel: string;
    last4: string;
    verifiedAt: Date | null;
    bankName?: string | null;
    accountName?: string | null;
  }) {
    return {
      id: row.id,
      channel: row.channel,
      last4: row.last4,
      bankName: row.bankName || null,
      accountName: row.accountName || null,
      maskedMsisdn: `****${row.last4}`,
      label: this.destinationLabel(row),
      verified: Boolean(row.verifiedAt),
    };
  }

  async getCreatorSummary(creatorId: string) {
    await this.ensureBackfill();
    const [cfg, bals, posted, lifetime, withdrawn] = await Promise.all([
      this.loadConfig(),
      this.sumCreatorAccounts(this.prisma, creatorId),
      this.prisma.payment.count({
        where: {
          creatorId,
          status: PaymentStatus.COMPLETED,
          ledgerPostedAt: { not: null },
        },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: {
          creatorId,
          type: LedgerEntryType.PAYMENT_EARNING,
          account: LedgerAccount.CREATOR_PENDING,
        },
        _sum: { amountKes: true },
      }),
      this.prisma.ledgerEntry.aggregate({
        where: {
          creatorId,
          type: LedgerEntryType.WITHDRAWAL_COMPLETED,
        },
        _sum: { amountKes: true },
      }),
    ]);
    const lifetimeEarnings = parseKesToCents(lifetime._sum.amountKes);
    const withdrawnAbs = -parseKesToCents(withdrawn._sum.amountKes);
    const feeAgg = await this.prisma.ledgerEntry.aggregate({
      where: {
        creatorId,
        type: LedgerEntryType.PLATFORM_FEE,
        account: LedgerAccount.PLATFORM_REVENUE,
      },
      _sum: { amountKes: true },
    });
    const feeKes = parseKesToCents(feeAgg._sum.amountKes);
    const byPurpose = await this.purposeGross(creatorId);
    const recentPays = await this.prisma.payment.findMany({
      where: {
        creatorId,
        status: PaymentStatus.COMPLETED,
        ledgerPostedAt: { not: null },
      },
      orderBy: { completedAt: 'desc' },
      take: 40,
      select: {
        id: true,
        completedAt: true,
        amount: true,
        platformFeeKes: true,
        creatorAmountKes: true,
        purpose: true,
      },
    });

    return {
      completedPayments: posted,
      platformFeePercent: Number(cfg.platformFeePercent),
      minWithdrawalKes: centsToKesNumber(cfg.minWithdrawalCents),
      withdrawalFeeKes: centsToKesNumber(cfg.withdrawalFeeCents),
      availableKes: centsToKesNumber(bals.available),
      pendingKes: centsToKesNumber(bals.pending),
      reservedKes: centsToKesNumber(bals.reserved),
      lifetimeEarningsKes: centsToKesNumber(lifetimeEarnings),
      totalWithdrawnKes: centsToKesNumber(withdrawnAbs < 0n ? 0n : withdrawnAbs),
      outstandingDebtKes: centsToKesNumber(bals.debt),
      withdrawableKes: centsToKesNumber(bals.withdrawable),
      totals: {
        grossKes: centsToKesNumber(lifetimeEarnings + feeKes),
        feeKes: centsToKesNumber(feeKes),
        netKes: centsToKesNumber(lifetimeEarnings),
      },
      byPurpose,
      recentFeeLines: recentPays.map((p) => ({
        id: p.id,
        completedAt: p.completedAt?.toISOString() ?? null,
        amountKes: centsToKesNumber(parseKesToCents(p.amount)),
        feeKes: centsToKesNumber(parseKesToCents(p.platformFeeKes)),
        netKes: centsToKesNumber(parseKesToCents(p.creatorAmountKes)),
        purpose: p.purpose,
      })),
      recentFeeLinesLimit: 40,
    };
  }

  async getCreatorTransactions(
    creatorId: string,
    query: { from?: string; to?: string; type?: string; page?: number; limit?: number },
  ) {
    const take = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const page = Math.max(1, Number(query.page) || 1);
    const where: Prisma.LedgerEntryWhereInput = {
      creatorId,
      account: {
        in: [
          LedgerAccount.CREATOR_PENDING,
          LedgerAccount.CREATOR_AVAILABLE,
          LedgerAccount.CREATOR_RESERVED,
          LedgerAccount.CREATOR_DEBT,
        ],
      },
      type: { not: LedgerEntryType.SETTLEMENT },
    };
    if (query.type) {
      where.type = query.type as LedgerEntryType;
    }
    this.applyDate(where, query.from, query.to);
    const [rows, total] = await Promise.all([
      this.prisma.ledgerEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * take,
        take,
        include: {
          payment: { select: { purpose: true, id: true, paymentMethod: true } },
        },
      }),
      this.prisma.ledgerEntry.count({ where }),
    ]);
    return {
      data: rows.map((e) => this.serializeCreatorLine(e)),
      pagination: {
        page,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async getAdminSummary(query: {
    preset?: string;
    from?: string;
    to?: string;
    creatorId?: string;
  }) {
    await this.ensureBackfill();
    const range = this.parseRange(query);
    const { startUtc, endUtc } = nairobiRangeToUtcBounds(range.fromYmd, range.toYmd);
    const paymentWhere: Prisma.PaymentWhereInput = {
      status: PaymentStatus.COMPLETED,
      ledgerPostedAt: { not: null },
      completedAt: { gte: startUtc, lte: endUtc },
      ...(query.creatorId ? { creatorId: query.creatorId } : {}),
    };
    const payments = await this.prisma.payment.findMany({
      where: paymentWhere,
      select: {
        id: true,
        amount: true,
        platformFeeKes: true,
        creatorAmountKes: true,
        purpose: true,
        refundedAt: true,
      },
    });
    let gross = 0n;
    let fees = 0n;
    let creator = 0n;
    let refundGross = 0n;
    let refundFees = 0n;
    const sources: Record<
      string,
      { key: string; label: string; kes: number; count: number }
    > = {
      subscription: { key: 'subscription', label: 'Memberships', kes: 0, count: 0 },
      shoutout: { key: 'shoutout', label: 'Shoutouts', kes: 0, count: 0 },
      accountReview: { key: 'accountReview', label: 'Coaching', kes: 0, count: 0 },
      other: { key: 'other', label: 'Other', kes: 0, count: 0 },
    };
    for (const p of payments) {
      const g = parseKesToCents(p.amount);
      const f = parseKesToCents(p.platformFeeKes);
      const c = parseKesToCents(p.creatorAmountKes);
      gross += g;
      fees += f;
      creator += c;
      if (p.refundedAt) {
        refundGross += g;
        refundFees += f;
      }
      const b = this.bucketPurpose(p.purpose);
      sources[b].kes += centsToKesNumber(g);
      sources[b].count += 1;
    }
    const cfg = await this.loadConfig();
    return {
      preset: range.preset,
      timezone: 'Africa/Nairobi',
      from: range.fromYmd,
      to: range.toYmd,
      rangeStartUtc: startUtc.toISOString(),
      rangeEndUtc: endUtc.toISOString(),
      grossPaymentsKes: centsToKesNumber(gross),
      platformFeeKes: centsToKesNumber(fees),
      creatorEarningsKes: centsToKesNumber(creator),
      refundsKes: centsToKesNumber(refundGross),
      netPlatformRevenueKes: centsToKesNumber(fees - refundFees),
      totalKes: centsToKesNumber(gross),
      creatorNetKes: centsToKesNumber(creator),
      platformFeePercent: Number(cfg.platformFeePercent),
      totalCount: payments.length,
      sources: Object.values(sources),
    };
  }

  async getAdminChart(
    query: {
      preset?: string;
      from?: string;
      to?: string;
      bucket?: string;
      creatorId?: string;
    },
  ) {
    const summaryRange = this.parseRange(query);
    const bucket = (query.bucket || 'day').toLowerCase();
    if (!['day', 'week', 'month'].includes(bucket)) {
      throw new BadRequestException('bucket must be day, week, or month');
    }
    const { startUtc, endUtc } = nairobiRangeToUtcBounds(
      summaryRange.fromYmd,
      summaryRange.toYmd,
    );
    const payments = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.COMPLETED,
        ledgerPostedAt: { not: null },
        completedAt: { gte: startUtc, lte: endUtc },
        ...(query.creatorId ? { creatorId: query.creatorId } : {}),
      },
      select: {
        completedAt: true,
        amount: true,
        platformFeeKes: true,
        refundedAt: true,
        purpose: true,
      },
    });
    const dayKeys = enumerateNairobiDays(summaryRange.fromYmd, summaryRange.toYmd);
    const dailyMap = new Map<
      string,
      {
        gross: bigint;
        fee: bigint;
        subscriptionKes: bigint;
        shoutoutKes: bigint;
        accountReviewKes: bigint;
        otherKes: bigint;
      }
    >();
    for (const d of dayKeys) {
      dailyMap.set(d, {
        gross: 0n,
        fee: 0n,
        subscriptionKes: 0n,
        shoutoutKes: 0n,
        accountReviewKes: 0n,
        otherKes: 0n,
      });
    }
    for (const p of payments) {
      if (!p.completedAt) continue;
      const day = nairobiYmd(p.completedAt);
      const cell = dailyMap.get(day);
      if (!cell) continue;
      const g = parseKesToCents(p.amount);
      const f = parseKesToCents(p.platformFeeKes);
      cell.gross += g;
      cell.fee += p.refundedAt ? 0n : f;
      const b = this.bucketPurpose(p.purpose);
      if (b === 'subscription') cell.subscriptionKes += g;
      else if (b === 'shoutout') cell.shoutoutKes += g;
      else if (b === 'accountReview') cell.accountReviewKes += g;
      else cell.otherKes += g;
    }
    const daily = dayKeys.map((date) => {
      const c = dailyMap.get(date)!;
      return {
        date,
        grossKes: centsToKesNumber(c.gross),
        platformRevenueKes: centsToKesNumber(c.fee),
        subscriptionKes: centsToKesNumber(c.subscriptionKes),
        shoutoutKes: centsToKesNumber(c.shoutoutKes),
        accountReviewKes: centsToKesNumber(c.accountReviewKes),
        otherKes: centsToKesNumber(c.otherKes),
        totalKes: centsToKesNumber(c.gross),
      };
    });
    if (bucket === 'day') {
      return { bucket: 'day', points: daily };
    }
    const grouped = new Map<
      string,
      { gross: number; platformRevenue: number }
    >();
    for (const row of daily) {
      const key =
        bucket === 'month' ? row.date.slice(0, 7) : this.isoWeekKey(row.date);
      const cur = grouped.get(key) || { gross: 0, platformRevenue: 0 };
      cur.gross += row.grossKes;
      cur.platformRevenue += row.platformRevenueKes;
      grouped.set(key, cur);
    }
    return {
      bucket,
      points: [...grouped.entries()].map(([date, v]) => ({
        date,
        grossKes: v.gross,
        platformRevenueKes: v.platformRevenue,
        totalKes: v.gross,
        subscriptionKes: 0,
        shoutoutKes: 0,
        accountReviewKes: 0,
        otherKes: 0,
      })),
    };
  }

  async getAdminTransactions(query: {
    from?: string;
    to?: string;
    preset?: string;
    creatorId?: string;
    type?: string;
    provider?: string;
    status?: string;
    settlementStatus?: string;
    page?: number;
    limit?: number;
  }) {
    await this.ensureBackfill();
    const take = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const page = Math.max(1, Number(query.page) || 1);
    const range = this.parseRange({
      preset: query.preset || (query.from ? 'custom' : 'last30'),
      from: query.from,
      to: query.to,
    });
    const { startUtc, endUtc } = nairobiRangeToUtcBounds(range.fromYmd, range.toYmd);
    const where: Prisma.PaymentWhereInput = {
      completedAt: { gte: startUtc, lte: endUtc },
      ...(query.creatorId ? { creatorId: query.creatorId } : {}),
    };
    if (query.type) {
      where.purpose = query.type as PaymentPurpose;
    }
    if (query.provider) {
      where.paymentMethod = query.provider.toUpperCase() as never;
    }
    if (query.status) {
      const s = query.status.toUpperCase();
      if (s === 'SUCCESS' || s === 'SUCCESSFUL' || s === 'COMPLETED') {
        where.status = PaymentStatus.COMPLETED;
      } else if (s === 'FAILED') where.status = PaymentStatus.FAILED;
      else if (s === 'REFUNDED') where.refundedAt = { not: null };
      else if (Object.values(PaymentStatus).includes(s as PaymentStatus)) {
        where.status = s as PaymentStatus;
      }
    }
    if (query.settlementStatus) {
      where.settlementStatus = query.settlementStatus as SettlementStatus;
    }
    const [rows, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: { completedAt: 'desc' },
        skip: (page - 1) * take,
        take,
        include: {
          user: { select: { name: true, tiktokUsername: true } },
          creator: { select: { slug: true, displayName: true } },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);
    return {
      from: range.fromYmd,
      to: range.toYmd,
      data: rows.map((p) => ({
        date: p.completedAt?.toISOString() ?? p.createdAt?.toISOString() ?? null,
        id: p.id,
        providerTransactionId: p.transactionId,
        supporter:
          p.user?.name ||
          (p.user?.tiktokUsername ? `@${p.user.tiktokUsername}` : null),
        creator: p.creator?.displayName || p.creator?.slug || null,
        creatorId: p.creatorId,
        type: p.purpose,
        typeLabel: PURPOSE_LABEL[String(p.purpose || 'SUBSCRIPTION')] || 'Other',
        grossKes: centsToKesNumber(parseKesToCents(p.amount)),
        platformFeeKes: centsToKesNumber(parseKesToCents(p.platformFeeKes)),
        creatorEarningsKes: centsToKesNumber(parseKesToCents(p.creatorAmountKes)),
        paymentProvider: p.paymentMethod,
        paymentStatus: p.refundedAt ? 'REFUNDED' : p.status,
        settlementStatus: p.settlementStatus,
        settleAt: p.settleAt?.toISOString() ?? null,
        settledAt: p.settledAt?.toISOString() ?? null,
      })),
      pagination: {
        page,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async getPendingSettlements(query: {
    page?: number;
    limit?: number;
    creatorId?: string;
  }) {
    const take = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const page = Math.max(1, Number(query.page) || 1);
    const where: Prisma.PaymentWhereInput = {
      settlementStatus: SettlementStatus.PENDING,
      status: PaymentStatus.COMPLETED,
      ...(query.creatorId ? { creatorId: query.creatorId } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: { settleAt: 'asc' },
        skip: (page - 1) * take,
        take,
        include: { creator: { select: { slug: true, displayName: true } } },
      }),
      this.prisma.payment.count({ where }),
    ]);
    return {
      data: rows.map((p) => ({
        paymentId: p.id,
        creator: p.creator?.displayName || p.creator?.slug,
        creatorId: p.creatorId,
        creatorAmountKes: centsToKesNumber(parseKesToCents(p.creatorAmountKes)),
        settleAt: p.settleAt?.toISOString() ?? null,
        completedAt: p.completedAt?.toISOString() ?? null,
        settlementStatus: p.settlementStatus,
      })),
      pagination: {
        page,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  /** Legacy admin/creator revenue payload plus ledger cards. */
  async getRevenueBreakdown(
    query: { preset?: string; from?: string; to?: string },
    scopedCreatorId?: string | null,
  ) {
    const summary = await this.getAdminSummary({
      ...query,
      creatorId: scopedCreatorId || undefined,
    });
    const chart = await this.getAdminChart({
      ...query,
      bucket: 'day',
      creatorId: scopedCreatorId || undefined,
    });
    const tx = await this.getAdminTransactions({
      ...query,
      creatorId: scopedCreatorId || undefined,
      status: 'COMPLETED',
      limit: 50,
      page: 1,
    });
    return {
      ...summary,
      daily: chart.points,
      paymentFeeLines: tx.data.slice(0, 50).map((r) => ({
        id: r.id,
        completedAt: r.date,
        amountKes: r.grossKes,
        feeKes: r.platformFeeKes,
        netKes: r.creatorEarningsKes,
        purpose: r.type,
      })),
      paymentFeeLinesLimit: 50,
    };
  }

  async backfillUnpostedPayments(): Promise<number> {
    const missing = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.COMPLETED,
        ledgerPostedAt: null,
        amount: { not: null },
        creatorId: { not: null },
      },
      select: { id: true },
      take: 500,
      orderBy: { completedAt: 'asc' },
    });
    for (const row of missing) {
      await this.recordSuccessfulPayment(row.id);
    }
    await this.settleDuePayments();
    await this.backfillHistoricalPayouts();
    return missing.length;
  }

  private backfillRunning = false;
  private async ensureBackfill() {
    if (this.backfillRunning) return;
    this.backfillRunning = true;
    try {
      await this.backfillUnpostedPayments();
    } catch (e) {
      this.logger.error(
        `Ledger backfill failed: ${e instanceof Error ? e.message : e}`,
      );
    } finally {
      this.backfillRunning = false;
    }
  }

  private async backfillHistoricalPayouts() {
    const rows = await this.prisma.payoutRequest.findMany({
      where: {
        ledgerEntries: { none: {} },
      },
      take: 200,
      orderBy: { createdAt: 'asc' },
    });
    for (const row of rows) {
      const cents = parseKesToCents(row.amountKes);
      try {
        await this.prisma.$transaction(async (tx) => {
          if (
            row.status === PayoutRequestStatus.PENDING ||
            row.status === PayoutRequestStatus.APPROVED
          ) {
            await this.insertLedger(tx, {
              type: LedgerEntryType.WITHDRAWAL_RESERVATION,
              account: LedgerAccount.CREATOR_AVAILABLE,
              amountKes: centsToKesString(-cents),
              creatorId: row.creatorId,
              payoutRequestId: row.id,
              idempotencyKey: `WD_RESERVE:AVAILABLE:${row.id}`,
              description: 'Backfill reservation',
            });
            await this.insertLedger(tx, {
              type: LedgerEntryType.WITHDRAWAL_RESERVATION,
              account: LedgerAccount.CREATOR_RESERVED,
              amountKes: centsToKesString(cents),
              creatorId: row.creatorId,
              payoutRequestId: row.id,
              idempotencyKey: `WD_RESERVE:RESERVED:${row.id}`,
              description: 'Backfill reservation',
            });
          } else if (row.status === PayoutRequestStatus.PAID) {
            await this.insertLedger(tx, {
              type: LedgerEntryType.WITHDRAWAL_COMPLETED,
              account: LedgerAccount.CREATOR_AVAILABLE,
              amountKes: centsToKesString(-cents),
              creatorId: row.creatorId,
              payoutRequestId: row.id,
              idempotencyKey: `WD_DONE:AVAILABLE:${row.id}`,
              description: 'Backfill completed withdrawal',
            });
          }
        });
      } catch (e) {
        this.logger.warn(
          `Skip payout backfill ${row.id}: ${e instanceof Error ? e.message : e}`,
        );
      }
    }
  }

  private serializeCreatorLine(e: {
    id: string;
    type: LedgerEntryType;
    account: LedgerAccount;
    amountKes: Prisma.Decimal;
    createdAt: Date;
    payment?: { purpose: PaymentPurpose | null; id: string; paymentMethod: string } | null;
  }) {
    const cents = parseKesToCents(e.amountKes);
    const signed = e.account === LedgerAccount.CREATOR_PENDING ||
      e.account === LedgerAccount.CREATOR_AVAILABLE ||
      e.account === LedgerAccount.CREATOR_RESERVED
      ? cents
      : cents;
    return {
      id: e.id,
      date: e.createdAt.toISOString(),
      type: e.type,
      account: e.account,
      label: this.creatorLineLabel(e.type, e.payment?.purpose),
      amountKes: centsToKesNumber(signed),
      purpose: e.payment?.purpose ?? null,
    };
  }

  private creatorLineLabel(type: LedgerEntryType, purpose?: PaymentPurpose | null) {
    if (type === LedgerEntryType.PAYMENT_EARNING) {
      return PURPOSE_LABEL[String(purpose || 'SUBSCRIPTION')] || 'Earning';
    }
    if (type === LedgerEntryType.SETTLEMENT) return 'Settled';
    if (type === LedgerEntryType.REFUND) return 'Refund';
    if (type === LedgerEntryType.WITHDRAWAL_RESERVATION) return 'Withdrawal reserved';
    if (type === LedgerEntryType.WITHDRAWAL_COMPLETED) return 'Withdrawal';
    if (type === LedgerEntryType.WITHDRAWAL_FAILED) return 'Withdrawal released';
    if (type === LedgerEntryType.WITHDRAWAL_FEE) return 'Withdrawal fee';
    return type;
  }

  private async purposeGross(creatorId: string) {
    const rows = await this.prisma.payment.findMany({
      where: {
        creatorId,
        status: PaymentStatus.COMPLETED,
        ledgerPostedAt: { not: null },
      },
      select: { amount: true, purpose: true },
    });
    const acc = {
      subscriptionKes: 0n,
      shoutoutKes: 0n,
      coachingKes: 0n,
      creatorRewardKes: 0n,
      otherKes: 0n,
    };
    for (const r of rows) {
      const g = parseKesToCents(r.amount);
      if (r.purpose === PaymentPurpose.STREAM_ALERT) acc.shoutoutKes += g;
      else if (r.purpose === PaymentPurpose.COACHING_BOOKING) acc.coachingKes += g;
      else if (r.purpose === PaymentPurpose.CREATOR_REWARD) acc.creatorRewardKes += g;
      else if (r.purpose === PaymentPurpose.SUBSCRIPTION || r.purpose == null) {
        acc.subscriptionKes += g;
      } else acc.otherKes += g;
    }
    return {
      subscriptionKes: centsToKesNumber(acc.subscriptionKes),
      shoutoutKes: centsToKesNumber(acc.shoutoutKes),
      coachingKes: centsToKesNumber(acc.coachingKes),
      creatorRewardKes: centsToKesNumber(acc.creatorRewardKes),
      otherKes: centsToKesNumber(acc.otherKes),
    };
  }

  private bucketPurpose(
    p: PaymentPurpose | null,
  ): 'subscription' | 'shoutout' | 'accountReview' | 'other' {
    if (p === PaymentPurpose.STREAM_ALERT) return 'shoutout';
    if (p === PaymentPurpose.COACHING_BOOKING) return 'accountReview';
    if (p === PaymentPurpose.SUBSCRIPTION || p == null) return 'subscription';
    return 'other';
  }

  private parseRange(query: { preset?: string; from?: string; to?: string }) {
    const preset = (query.preset || 'today') as RevenuePreset;
    try {
      const r = resolveRevenueRangeNairobi(
        preset === 'custom' ? 'custom' : preset,
        query.from,
        query.to,
      );
      return { preset: preset === 'custom' ? 'custom' : preset, ...r };
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Invalid date range',
      );
    }
  }

  private applyDate(
    where: Prisma.LedgerEntryWhereInput,
    from?: string,
    to?: string,
  ) {
    if (!from && !to) return;
    const range = this.parseRange({
      preset: from ? 'custom' : 'last30',
      from,
      to: to || from,
    });
    const { startUtc, endUtc } = nairobiRangeToUtcBounds(range.fromYmd, range.toYmd);
    where.createdAt = { gte: startUtc, lte: endUtc };
  }

  private isoWeekKey(ymd: string): string {
    const d = new Date(`${ymd}T12:00:00.000+03:00`);
    const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  }

  private async insertLedger(
    tx: Prisma.TransactionClient,
    data: Prisma.LedgerEntryUncheckedCreateInput,
  ) {
    try {
      await tx.ledgerEntry.create({ data });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        return;
      }
      throw e;
    }
  }
}
