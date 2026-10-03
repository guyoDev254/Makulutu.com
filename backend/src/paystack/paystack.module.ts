import { Module, forwardRef } from '@nestjs/common';
import { FinanceModule } from '../finance/finance.module';
import { PaymentModule } from '../payment/payment.module';
import { PaystackController } from './paystack.controller';
import { PaystackService } from './paystack.service';

@Module({
  imports: [forwardRef(() => PaymentModule), forwardRef(() => FinanceModule)],
  providers: [PaystackService],
  controllers: [PaystackController],
  exports: [PaystackService],
})
export class PaystackModule {}
