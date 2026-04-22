import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PaymentService } from '../payment/payment.service';
import { CheckoutCreatorRewardDto } from './dto/checkout-creator-reward.dto';

@Controller('creator-rewards')
export class CreatorRewardController {
  constructor(private readonly paymentService: PaymentService) {}

  /** Public list for subscribe page (active tiers only). */
  @Get()
  listPublic(@Query('creatorSlug') creatorSlug?: string) {
    return this.paymentService.listPublicCreatorRewards(creatorSlug);
  }

  @Post(':id/checkout')
  checkout(@Param('id') id: string, @Body() dto: CheckoutCreatorRewardDto) {
    return this.paymentService.checkoutCreatorReward(id, dto);
  }
}
