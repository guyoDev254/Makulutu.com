import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Subscription, SubscriptionStatus, Prisma } from '@prisma/client';
import { User } from '@prisma/client';
import { parseCheckoutCountry } from '../common/utils/checkout-country';

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  async create(
    user: User,
    months: number,
    amount: number,
    paymentId?: string,
    creatorId?: string | null,
    checkoutCountry?: string | null,
  ): Promise<Subscription> {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + months);

    const resolvedCreatorId =
      creatorId ?? (user as { creatorId?: string | null }).creatorId ?? null;

    return await this.prisma.subscription.create({
      data: {
        userId: user.id,
        months,
        startDate,
        endDate,
        amount,
        paymentId,
        status: SubscriptionStatus.ACTIVE,
        checkoutCountry: parseCheckoutCountry(checkoutCountry),
        ...(resolvedCreatorId ? { creatorId: resolvedCreatorId } : {}),
      },
    });
  }

  async findAll(): Promise<Subscription[]> {
    return await this.prisma.subscription.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<Subscription> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }

    return subscription;
  }

  async findByUser(userId: string): Promise<Subscription[]> {
    return await this.prisma.subscription.findMany({
      where: { userId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActiveByUser(userId: string): Promise<Subscription | null> {
    const now = new Date();
    return await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
        endDate: { gt: now },
      },
      include: { user: true },
      orderBy: { endDate: 'desc' },
    });
  }

  /**
   * Find the latest subscription for a user (active or expired)
   * Useful for renewing expired subscriptions
   */
  async findLatestByUser(userId: string): Promise<Subscription | null> {
    return await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.EXPIRED],
        },
      },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async renew(
    subscriptionId: string,
    months: number,
    amount: number,
    paymentId?: string,
  ): Promise<Subscription> {
    const existing = await this.findOne(subscriptionId);
    
    // If subscription is expired, start from today; otherwise extend from endDate
    const baseDate = existing.status === SubscriptionStatus.EXPIRED 
      ? new Date() 
      : new Date(existing.endDate);
    
    const newEndDate = new Date(baseDate);
    newEndDate.setMonth(newEndDate.getMonth() + months);

    const currentAmount = parseFloat(existing.amount.toString());
    const newAmount = currentAmount + amount;

    return await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        startDate: existing.status === SubscriptionStatus.EXPIRED ? new Date() : existing.startDate,
        endDate: newEndDate,
        months: { increment: months },
        amount: newAmount,
        paymentId: paymentId || existing.paymentId,
        status: SubscriptionStatus.ACTIVE, // Reactivate if expired
      },
    });
  }

  async extend(
    subscriptionId: string,
    months: number,
    amount: number,
    paymentId?: string,
    checkoutCountry?: string | null,
  ): Promise<Subscription> {
    const existing = await this.findOne(subscriptionId);
    
    // If subscription is expired, start from today; otherwise extend from endDate
    const baseDate = existing.status === SubscriptionStatus.EXPIRED 
      ? new Date() 
      : new Date(existing.endDate);
    
    const newEndDate = new Date(baseDate);
    newEndDate.setMonth(newEndDate.getMonth() + months);

    const currentAmount = parseFloat(existing.amount.toString());
    const newAmount = currentAmount + amount;

    return await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        startDate: existing.status === SubscriptionStatus.EXPIRED ? new Date() : existing.startDate,
        endDate: newEndDate,
        months: { increment: months },
        amount: newAmount,
        paymentId: paymentId || existing.paymentId,
        status: SubscriptionStatus.ACTIVE, // Reactivate if expired
        checkoutCountry: parseCheckoutCountry(
          checkoutCountry ?? existing.checkoutCountry,
        ),
      },
    });
  }

  async cancel(id: string): Promise<Subscription> {
    return await this.prisma.subscription.update({
      where: { id },
      data: { status: SubscriptionStatus.CANCELLED },
    });
  }

  async expire(id: string): Promise<Subscription> {
    return await this.prisma.subscription.update({
      where: { id },
      data: { status: SubscriptionStatus.EXPIRED },
    });
  }

  /**
   * Check and expire subscriptions that have passed their end date
   */
  async checkAndExpireSubscriptions(): Promise<void> {
    const now = new Date();
    const expiredSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endDate: { lt: now },
      },
    });

    for (const subscription of expiredSubscriptions) {
      await this.expire(subscription.id);
    }
  }

  async getStats(scopedCreatorId?: string | null) {
    const now = new Date();
    const scope =
      scopedCreatorId && scopedCreatorId.length > 0
        ? { creatorId: scopedCreatorId }
        : {};
    const [total, active, expired] = await Promise.all([
      this.prisma.subscription.count({ where: scope }),
      this.prisma.subscription.count({
        where: {
          ...scope,
          status: SubscriptionStatus.ACTIVE,
          endDate: { gt: now },
        },
      }),
      this.prisma.subscription.count({
        where: { ...scope, status: SubscriptionStatus.EXPIRED },
      }),
    ]);

    return { total, active, expired };
  }
}
