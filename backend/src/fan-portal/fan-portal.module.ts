import { Module } from '@nestjs/common';
import { FanAuthModule } from '../fan-auth/fan-auth.module';
import { PaymentModule } from '../payment/payment.module';
import { PrismaModule } from '../prisma/prisma.module';
import { FanPortalController } from './fan-portal.controller';
import { FanPortalService } from './fan-portal.service';
import { FanNotifyModule } from './fan-notify.module';

@Module({
  imports: [FanAuthModule, PaymentModule, PrismaModule, FanNotifyModule],
  controllers: [FanPortalController],
  providers: [FanPortalService],
})
export class FanPortalModule {}
