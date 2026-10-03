import { Module } from '@nestjs/common';
import { FanNotifyModule } from '../fan-portal/fan-notify.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ScheduledLivesService } from './scheduled-lives.service';

@Module({
  imports: [PrismaModule, FanNotifyModule],
  providers: [ScheduledLivesService],
  exports: [ScheduledLivesService],
})
export class ScheduledLivesModule {}
