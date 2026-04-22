import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PaymentService } from '../payment/payment.service';
import { CheckoutStreamAlertDto } from './dto/checkout-stream-alert.dto';

@Controller('stream-alerts')
export class StreamAlertsController {
  constructor(private readonly paymentService: PaymentService) {}

  /** Min/max KES for shoutout checkout (base vs with clip URL). */
  @Get('limits')
  getLimits(@Query('creatorSlug') creatorSlug?: string) {
    return this.paymentService.getStreamAlertLimits(creatorSlug);
  }

  @Post('checkout')
  checkout(@Body() dto: CheckoutStreamAlertDto) {
    return this.paymentService.checkoutStreamAlert(dto);
  }
}
