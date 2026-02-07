import { Controller, Post, Get, Body, HttpCode, HttpStatus, Inject, forwardRef } from '@nestjs/common';
import { MegapayService, WebhookPayload } from './megapay.service';
import { PaymentService } from '../payment/payment.service';
import { SubscriptionService } from '../subscription/subscription.service';

@Controller('megapay')
export class MegapayController {
  constructor(
    private readonly megapayService: MegapayService,
    @Inject(forwardRef(() => PaymentService))
    private readonly paymentService: PaymentService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  /**
   * Webhook endpoint for MegaPay payment notifications
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() payload: any) {
    console.log('🔔 Webhook received:', JSON.stringify(payload, null, 2));
    
    // Validate webhook payload
    if (!this.megapayService.validateWebhook(payload)) {
      console.error('❌ Invalid webhook payload received');
      return { status: 'error', message: 'Invalid webhook payload' };
    }

    const webhookData = payload as WebhookPayload;

    try {
      // Process successful payment
      if (webhookData.ResponseCode === 0) {
        console.log(`✅ Processing successful payment: ${webhookData.TransactionID}`);
        await this.paymentService.handleSuccessfulPayment(webhookData);
      } else {
        console.log(`❌ Processing failed payment: ${webhookData.TransactionID} - ${webhookData.ResponseDescription}`);
        // Process failed payment
        await this.paymentService.handleFailedPayment(webhookData);
      }

      // Always return 200 to acknowledge receipt
      return { status: 'success', message: 'Webhook processed' };
    } catch (error) {
      console.error('❌ Error processing webhook:', error);
      // Still return 200 to prevent MegaPay from retrying
      return { status: 'error', message: error.message };
    }
  }

  /**
   * Test endpoint to verify webhook URL is accessible
   */
  @Get('webhook/test')
  testWebhook() {
    return {
      status: 'success',
      message: 'Webhook endpoint is accessible',
      timestamp: new Date().toISOString(),
      url: '/megapay/webhook',
    };
  }
}
