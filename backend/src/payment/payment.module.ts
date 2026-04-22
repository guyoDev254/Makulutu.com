import { Module, forwardRef } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { StreamAlertsController } from '../stream-alerts/stream-alerts.controller';
import { CreatorRewardController } from '../creator-reward/creator-reward.controller';
import { MegapayModule } from '../megapay/megapay.module';
import { PaypalModule } from '../paypal/paypal.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { UserModule } from '../user/user.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { ObsAlertsModule } from '../obs-alerts/obs-alerts.module';

@Module({
  imports: [
    PaypalModule,
    forwardRef(() => MegapayModule),
    forwardRef(() => SubscriptionModule),
    UserModule,
    WhatsAppModule,
    ObsAlertsModule,
  ],
  controllers: [PaymentController, StreamAlertsController, CreatorRewardController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
