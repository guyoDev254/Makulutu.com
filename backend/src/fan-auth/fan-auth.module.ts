import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import * as jwt from 'jsonwebtoken';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { GoogleAuthModule } from '../common/google-auth/google-auth.module';
import { MediaStorageModule } from '../common/media/media-storage.module';
import { FanAuthController } from './fan-auth.controller';
import { FanAuthService } from './fan-auth.service';
import { FanJwtStrategy } from './strategies/fan-jwt.strategy';
import { FanJwtAuthGuard } from './guards/fan-jwt-auth.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'fan-jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('FAN_JWT_SECRET') ||
          configService.get<string>('JWT_SECRET') ||
          'your-secret-key-change-in-production',
        signOptions: {
          expiresIn: configService.get<string>('FAN_JWT_EXPIRES_IN') || '30d',
        } as jwt.SignOptions,
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    WhatsAppModule,
    GoogleAuthModule,
    MediaStorageModule,
  ],
  controllers: [FanAuthController],
  providers: [FanAuthService, FanJwtStrategy, FanJwtAuthGuard],
  exports: [FanAuthService, FanJwtAuthGuard],
})
export class FanAuthModule {}
