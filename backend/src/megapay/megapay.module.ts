import { Module, forwardRef } from '@nestjs/common';
import { MegapayService } from './megapay.service';
import { MegapayController } from './megapay.controller';
import { PaymentModule } from '../payment/payment.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [forwardRef(() => PaymentModule), forwardRef(() => SubscriptionModule)],
  providers: [MegapayService],
  controllers: [MegapayController],
  exports: [MegapayService],
})
export class MegapayModule {}
