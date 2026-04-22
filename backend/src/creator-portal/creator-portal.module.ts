import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { CreatorAuthModule } from '../creator-auth/creator-auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CreatorPortalController } from './creator-portal.controller';

@Module({
  imports: [AdminModule, CreatorAuthModule, PrismaModule],
  controllers: [CreatorPortalController],
})
export class CreatorPortalModule {}
