import { Module, forwardRef } from '@nestjs/common';
import { MegapayService } from './megapay.service';
import { MegapayController } from './megapay.controller';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [forwardRef(() => PaymentModule)],
  providers: [MegapayService],
  controllers: [MegapayController],
  exports: [MegapayService],
})
export class MegapayModule {}
