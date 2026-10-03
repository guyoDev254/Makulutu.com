import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Post,
  RawBodyRequest,
  Req,
  UnauthorizedException,
  forwardRef,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentService } from '../payment/payment.service';
import { FinanceService } from '../finance/finance.service';
import { PaystackService } from './paystack.service';
import { logPaystackTest } from './paystack-test-log';
import { PaystackWebhookBody } from './paystack.types';

@Controller('paystack')
export class PaystackController {
  private readonly logger = new Logger(PaystackController.name);

  constructor(
    private readonly paystackService: PaystackService,
    @Inject(forwardRef(() => PaymentService))
    private readonly paymentService: PaymentService,
    @Inject(forwardRef(() => FinanceService))
    private readonly financeService: FinanceService,
  ) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string | undefined,
    @Body() payload: PaystackWebhookBody,
  ) {
    const raw = req.rawBody;
    if (!this.paystackService.verifySignature(raw, signature)) {
      this.logger.warn('Rejected Paystack webhook with invalid signature');
      throw new UnauthorizedException('Invalid signature');
    }

    const webhookData = this.paystackService.toWebhookPayload(payload);
    logPaystackTest({
      stage: 'webhook',
      event: payload?.event,
      reference: payload?.data?.reference,
      status: payload?.data?.status,
      amountSubunits: payload?.data?.amount,
      currency: payload?.data?.currency,
      gatewayResponse: payload?.data?.gateway_response,
      mapped: webhookData
        ? {
            responseCode: webhookData.ResponseCode,
            transactionReference: webhookData.TransactionReference,
            amount: webhookData.TransactionAmount,
          }
        : null,
    });
    if (String(payload?.event || '').toLowerCase().startsWith('transfer.')) {
      try {
        await this.financeService.handlePaystackTransferEvent(payload);
        return { status: 'success', message: 'Transfer webhook processed' };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Paystack transfer webhook error: ${message}`);
        return { status: 'error', message };
      }
    }
    if (!webhookData) {
      return { status: 'ignored', event: payload?.event || null };
    }

    try {
      if (webhookData.ResponseCode === 0) {
        await this.paymentService.handleSuccessfulPayment(webhookData);
      } else {
        await this.paymentService.handleFailedPayment(webhookData);
      }
      return { status: 'success', message: 'Webhook processed' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Paystack webhook error: ${message}`);
      return { status: 'error', message };
    }
  }

  @Get('webhook/test')
  testWebhook() {
    return {
      status: 'success',
      message: 'Paystack webhook endpoint is accessible',
      timestamp: new Date().toISOString(),
      url: '/paystack/webhook',
    };
  }
}
