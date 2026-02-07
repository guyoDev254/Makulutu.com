import {
  Controller,
  Get,
  Post,
  Body,
  Param,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentService.create(createPaymentDto);
  }

  @Get()
  findAll() {
    return this.paymentService.findAll();
  }

  @Get('stats')
  getStats() {
    return this.paymentService.getStats();
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.paymentService.findByUser(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentService.findOne(id);
  }

  @Get(':id/status')
  async checkStatus(@Param('id') id: string) {
    const payment = await this.paymentService.checkPaymentStatus(id);
    // Return payment with lowercase status for frontend compatibility
    return {
      ...payment,
      status: payment.status.toLowerCase(),
    };
  }
}
