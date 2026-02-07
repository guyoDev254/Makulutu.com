import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { PaymentService } from '../payment/payment.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaymentStatus, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private userService: UserService,
    private subscriptionService: SubscriptionService,
    private paymentService: PaymentService,
  ) {}

  async getDashboardStats() {
    try {
      const [usersWithCompletedPayment, subscriptionStats, paymentStats] = await Promise.all([
        this.prisma.user.findMany({
          where: { payments: { some: { status: PaymentStatus.COMPLETED } } },
          include: { payments: true },
        }),
        this.subscriptionService.getStats(),
        this.paymentService.getStats(),
      ]);

      return {
        users: {
          total: usersWithCompletedPayment.length,
          active: usersWithCompletedPayment.filter((u) => u.isActive).length,
        },
        subscriptions: subscriptionStats,
        payments: paymentStats,
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

  async getAllUsers(pagination: PaginationDto, search?: string) {
    const where: any = {
      payments: { some: { status: PaymentStatus.COMPLETED } },
    };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { tiktokUsername: { contains: search, mode: 'insensitive' as const } },
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
  ) {
    const where: any = {};

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
  ) {
    const where: any = {};

    if (status) {
      where.status = status.toUpperCase() as PaymentStatus;
    }

    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' as const } } },
        { user: { tiktokUsername: { contains: search, mode: 'insensitive' as const } } },
        { transactionId: { contains: search } },
        { reference: { contains: search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: 'desc' },
        include: { user: true },
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

    return await this.prisma.subscription.create({
      data: {
        userId: createData.userId,
        months: parseInt(createData.months),
        amount: parseFloat(createData.amount), // Admin sets amount directly
        startDate,
        endDate,
        status: (createData.status || 'ACTIVE').toUpperCase(),
        paymentId: createData.paymentId,
      },
      include: { user: true },
    });
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

    return await this.prisma.payment.update({
      where: { id: paymentId },
      data: updatePayload,
      include: { user: true },
    });
  }

  async getSettings() {
    const defaultPrice = await this.prisma.settings.findUnique({
      where: { key: 'default_monthly_price' },
    });

    return {
      defaultMonthlyPrice: defaultPrice ? parseFloat(defaultPrice.value) : 1,
    };
  }

  async updateSettings(updateData: any) {
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

    return await this.getSettings();
  }
}
