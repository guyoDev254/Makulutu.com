import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Post,
  forwardRef,
} from '@nestjs/common';
import { MegapayService, WebhookPayload } from './megapay.service';
import { PaymentService } from '../payment/payment.service';

@Controller('megapay')
export class MegapayController {
  private readonly logger = new Logger(MegapayController.name);

  constructor(
    private readonly megapayService: MegapayService,
    @Inject(forwardRef(() => PaymentService))
    private readonly paymentService: PaymentService,
  ) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() payload: unknown) {
    this.logger.log(`Webhook received: ${JSON.stringify(payload)}`);

    if (!this.megapayService.validateWebhook(payload)) {
      this.logger.warn('Invalid MegaPay webhook payload');
      return { status: 'error', message: 'Invalid webhook payload' };
    }

    const webhookData = payload as WebhookPayload;

    try {
      if (webhookData.ResponseCode === 0) {
        await this.paymentService.handleSuccessfulPayment(webhookData);
      } else {
        await this.paymentService.handleFailedPayment(webhookData);
      }
      return { status: 'success', message: 'Webhook processed' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`MegaPay webhook error: ${message}`);
      return { status: 'error', message };
    }
  }

  @Get('webhook/test')
  testWebhook() {
    return {
      status: 'success',
      message: 'MegaPay webhook endpoint is accessible',
      timestamp: new Date().toISOString(),
      url: '/megapay/webhook',
    };
  }
}
