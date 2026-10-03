import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaypalCaptureDto } from './dto/paypal-capture.dto';
import { PaystackVerifyDto } from './dto/paystack-verify.dto';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentService.create(createPaymentDto);
  }

  /** Complete PayPal Checkout after the buyer returns with token = order ID. */
  @Post('paypal/capture')
  @HttpCode(HttpStatus.OK)
  async capturePaypal(@Body() body: PaypalCaptureDto) {
    const payment = await this.paymentService.capturePayPalOrder(body.orderId);
    return this.paymentService.findOneForClient(payment.id);
  }

  /** Confirm Paystack hosted checkout after the buyer returns (reference = payment id). */
  @Post('paystack/verify')
  @HttpCode(HttpStatus.OK)
  async verifyPaystack(@Body() body: PaystackVerifyDto) {
    const payment = await this.paymentService.verifyPaystackReference(
      body.reference,
    );
    return this.paymentService.findOneForClient(payment.id);
  }

  @Get()
  findAll() {
    throw new ForbiddenException('Use /admin/payments or /creator-portal/payments');
  }

  @Get('stats')
  getStats() {
    throw new ForbiddenException('Use /admin/dashboard');
  }

  @Get('user/:userId')
  findByUser() {
    throw new ForbiddenException('Use /fan-portal/payments');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentService.findOneForClient(id);
  }

  @Get(':id/status')
  async checkStatus(@Param('id') id: string) {
    const payment = await this.paymentService.checkPaymentStatus(id);
    return this.paymentService.findOneForClient(payment.id);
  }
}
