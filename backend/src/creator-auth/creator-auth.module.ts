import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';
import { GoogleAuthModule } from '../common/google-auth/google-auth.module';
import { ScheduledLivesModule } from '../scheduled-lives/scheduled-lives.module';
import { CreatorAuthController } from './creator-auth.controller';
import { CreatorAuthService } from './creator-auth.service';
import { CreatorJwtStrategy } from './strategies/creator-jwt.strategy';
import { CreatorJwtAuthGuard } from './guards/creator-jwt-auth.guard';
import { MediaStorageModule } from '../common/media/media-storage.module';
import * as jwt from 'jsonwebtoken';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'creator-jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('CREATOR_JWT_SECRET') ||
          configService.get<string>('JWT_SECRET') ||
          'your-secret-key-change-in-production',
        signOptions: {
          expiresIn: configService.get<string>('CREATOR_JWT_EXPIRES_IN') || '7d',
        } as jwt.SignOptions,
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    GoogleAuthModule,
    ScheduledLivesModule,
    MediaStorageModule,
  ],
  controllers: [CreatorAuthController],
  providers: [CreatorAuthService, CreatorJwtStrategy, CreatorJwtAuthGuard],
  exports: [CreatorAuthService, CreatorJwtAuthGuard],
})
export class CreatorAuthModule {}
