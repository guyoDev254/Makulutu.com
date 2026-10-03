import { Module } from '@nestjs/common';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { PayoutNotifyService } from './payout-notify.service';

@Module({
  imports: [WhatsAppModule],
  providers: [PayoutNotifyService],
  exports: [PayoutNotifyService],
})
export class PayoutNotifyModule {}
