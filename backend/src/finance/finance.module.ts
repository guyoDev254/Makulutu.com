import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PayoutNotifyModule } from '../admin/payout-notify.module';
import { PaystackModule } from '../paystack/paystack.module';
import { FinanceService } from './finance.service';

@Module({
  imports: [
    PrismaModule,
    PayoutNotifyModule,
    forwardRef(() => PaystackModule),
  ],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
