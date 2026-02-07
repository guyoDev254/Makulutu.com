import { Injectable, NotFoundException, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Payment, PaymentStatus, Prisma } from '@prisma/client';
import { MegapayService, WebhookPayload } from '../megapay/megapay.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { UserService } from '../user/user.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

// Type for Payment with user relation
type PaymentWithUser = Prisma.PaymentGetPayload<{
  include: { user: true };
}>;

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => MegapayService))
    private megapayService: MegapayService,
    @Inject(forwardRef(() => SubscriptionService))
    private subscriptionService: SubscriptionService,
    private userService: UserService,
    private whatsappService: WhatsAppService,
  ) {}

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    const user = await this.userService.findOne(createPaymentDto.userId);

    const savedPayment = await this.prisma.payment.create({
      data: {
        userId: user.id,
        amount: createPaymentDto.amount,
        months: createPaymentDto.months,
        reference: createPaymentDto.reference,
        status: PaymentStatus.PENDING,
      },
    });

    // Initiate STK Push
    try {
      const stkResponse = await this.megapayService.initiateSTKPush({
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

  async findAll(): Promise<PaymentWithUser[]> {
    return await this.prisma.payment.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<PaymentWithUser> {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  async findByUser(userId: string): Promise<PaymentWithUser[]> {
    return await this.prisma.payment.findMany({
      where: { userId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
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
      payment = await this.prisma.payment.findUnique({
        where: { id: webhookData.TransactionReference },
        include: { user: true },
      });
    }

    // Try 2: Find by MerchantRequestID
    if (!payment && webhookData.MerchantRequestID) {
      payment = await this.prisma.payment.findFirst({
        where: { merchantRequestId: webhookData.MerchantRequestID },
        include: { user: true },
      });
    }

    // Try 3: Find by CheckoutRequestID
    if (!payment && webhookData.CheckoutRequestID) {
      payment = await this.prisma.payment.findFirst({
        where: { checkoutRequestId: webhookData.CheckoutRequestID },
        include: { user: true },
      });
    }

    // Try 4: Find by TransactionID (if we already stored it)
    if (!payment && webhookData.TransactionID) {
      payment = await this.prisma.payment.findFirst({
        where: { transactionId: webhookData.TransactionID },
        include: { user: true },
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

    // Get updated payment with user
    const updatedPayment = await this.findOne(payment.id);
    
    // Create or extend subscription
    if (!updatedPayment.user) {
      throw new NotFoundException(`User not found for payment ${payment.id}`);
    }
    const user = updatedPayment.user;
    
    // First check for active subscription
    let subscription = await this.subscriptionService.findActiveByUser(user.id);
    
    // If no active subscription, check for expired subscription (for renewal)
    if (!subscription) {
      subscription = await this.subscriptionService.findLatestByUser(user.id);
    }

    if (subscription) {
      // Extend existing subscription (will reactivate if expired)
      await this.subscriptionService.extend(
        subscription.id,
        updatedPayment.months,
        parseFloat(updatedPayment.amount.toString()),
        updatedPayment.id,
      );
    } else {
      // Create new subscription for new subscriber
      await this.subscriptionService.create(
        user,
        updatedPayment.months,
        parseFloat(updatedPayment.amount.toString()),
        updatedPayment.id,
      );
    }

    // Send WhatsApp invite link
    try {
      await this.whatsappService.sendInviteLink(user);
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp invite: ${error.message}`);
      // Don't fail the payment processing if WhatsApp fails
    }

    this.logger.log(`Payment processed successfully for user: ${user.id}`);
  }

  async handleFailedPayment(webhookData: WebhookPayload): Promise<void> {
    this.logger.log(`Processing failed payment: ${webhookData.TransactionID}`);
    this.logger.debug(`Webhook payload: ${JSON.stringify(webhookData)}`);

    // Find payment by multiple methods (TransactionReference might be undefined)
    let payment = null;

    // Try 1: Find by TransactionReference (payment ID)
    if (webhookData.TransactionReference) {
      payment = await this.prisma.payment.findUnique({
        where: { id: webhookData.TransactionReference },
      });
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
        where: { transactionId: webhookData.TransactionID },
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
      return payment;
    }

    // If payment is already failed, return it immediately
    if (payment.status === PaymentStatus.FAILED) {
      this.logger.log(`Payment ${paymentId} is already failed`);
      return payment;
    }

    if (!payment.transactionRequestId) {
      throw new NotFoundException('Transaction request ID not found');
    }

    try {
      const status = await this.megapayService.checkTransactionStatus(
        payment.transactionRequestId,
      );

      this.logger.debug(`MegaPay status check: ${JSON.stringify(status)}`);

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

        // If payment was just completed and we have user info, process subscription
        // This handles the case where webhook didn't arrive but status check found completion
        if (payment.user) {
          try {
            const user = payment.user;
            
            // First check for active subscription
            let subscription = await this.subscriptionService.findActiveByUser(user.id);
            
            // If no active subscription, check for expired subscription (for renewal)
            if (!subscription) {
              subscription = await this.subscriptionService.findLatestByUser(user.id);
            }

            if (subscription) {
              // Extend existing subscription (will reactivate if expired)
              await this.subscriptionService.extend(
                subscription.id,
                payment.months,
                parseFloat(payment.amount.toString()),
                payment.id,
              );
              this.logger.log(`Extended subscription for user ${user.id}`);
            } else {
              // Create new subscription for new subscriber
              await this.subscriptionService.create(
                user,
                payment.months,
                parseFloat(payment.amount.toString()),
                payment.id,
              );
              this.logger.log(`Created new subscription for user ${user.id}`);
            }
          } catch (subError) {
            this.logger.error(`Failed to process subscription: ${subError.message}`);
            // Don't fail the payment status check if subscription processing fails
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

  async getStats() {
    const [total, completed, pending, failed, totalAmountResult] = await Promise.all([
      this.prisma.payment.count(),
      this.prisma.payment.count({
        where: { status: PaymentStatus.COMPLETED },
      }),
      this.prisma.payment.count({
        where: { status: PaymentStatus.PENDING },
      }),
      this.prisma.payment.count({
        where: { status: PaymentStatus.FAILED },
      }),
      this.prisma.payment.aggregate({
        where: { status: PaymentStatus.COMPLETED },
        _sum: { amount: true },
      }),
    ]);

    const totalAmount = totalAmountResult._sum.amount;
    return {
      total,
      completed,
      pending,
      failed,
      totalAmount: totalAmount != null ? Number(totalAmount) : 0,
    };
  }
}
