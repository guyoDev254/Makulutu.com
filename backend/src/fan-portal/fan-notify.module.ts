import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { FanNotifyService } from './fan-notify.service';

@Module({
  imports: [PrismaModule, WhatsAppModule],
  providers: [FanNotifyService],
  exports: [FanNotifyService],
})
export class FanNotifyModule {}
