import { Module, forwardRef } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { StreamAlertsController } from '../stream-alerts/stream-alerts.controller';
import { CreatorRewardController } from '../creator-reward/creator-reward.controller';
import { PaystackModule } from '../paystack/paystack.module';
import { PaypalModule } from '../paypal/paypal.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { UserModule } from '../user/user.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { ObsAlertsModule } from '../obs-alerts/obs-alerts.module';
import { FanNotifyModule } from '../fan-portal/fan-notify.module';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [
    forwardRef(() => PaystackModule),
    PaypalModule,
    forwardRef(() => SubscriptionModule),
    UserModule,
    WhatsAppModule,
    ObsAlertsModule,
    FanNotifyModule,
    FinanceModule,
  ],
  controllers: [PaymentController, StreamAlertsController, CreatorRewardController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
