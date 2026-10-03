import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { UserModule } from '../user/user.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { PaymentModule } from '../payment/payment.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ObsAlertsModule } from '../obs-alerts/obs-alerts.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { PayoutNotifyModule } from './payout-notify.module';
import { FanNotifyModule } from '../fan-portal/fan-notify.module';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [
    UserModule,
    SubscriptionModule,
    PaymentModule,
    PrismaModule,
    ObsAlertsModule,
    WhatsAppModule,
    FanNotifyModule,
    FinanceModule,
    PayoutNotifyModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, RolesGuard],
  exports: [AdminService],
})
export class AdminModule {}
