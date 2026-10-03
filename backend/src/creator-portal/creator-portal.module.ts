import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { CreatorAuthModule } from '../creator-auth/creator-auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ScheduledLivesModule } from '../scheduled-lives/scheduled-lives.module';
import { FinanceModule } from '../finance/finance.module';
import { CreatorPortalController } from './creator-portal.controller';

@Module({
  imports: [
    AdminModule,
    CreatorAuthModule,
    PrismaModule,
    ScheduledLivesModule,
    FinanceModule,
  ],
  controllers: [CreatorPortalController],
})
export class CreatorPortalModule {}
