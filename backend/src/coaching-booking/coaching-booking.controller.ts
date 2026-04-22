import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { PaymentService } from '../payment/payment.service';
import { CoachingBookingService } from './coaching-booking.service';
import { CheckoutCoachingBookingDto } from './dto/checkout-coaching-booking.dto';
import { CreateCoachingBookingDto } from './dto/create-coaching-booking.dto';

@Controller('coaching-bookings')
export class CoachingBookingController {
  constructor(
    private readonly coachingBookingService: CoachingBookingService,
    private readonly paymentService: PaymentService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateCoachingBookingDto) {
    return this.coachingBookingService.create(dto);
  }

  /** Current account-review / bundle M-Pesa amount (from admin settings). */
  @Get('pricing')
  getPricing(@Query('creatorSlug') creatorSlug?: string) {
    return this.coachingBookingService.getAccountReviewPricing(creatorSlug);
  }

  /** M-Pesa STK for account review or both (amount from settings). */
  @Post('checkout')
  checkout(@Body() dto: CheckoutCoachingBookingDto) {
    return this.paymentService.checkoutCoachingBooking(dto);
  }
}
