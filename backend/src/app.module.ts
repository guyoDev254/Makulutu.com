import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { PaymentModule } from './payment/payment.module';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { TasksService } from './tasks/tasks.service';
import { MailModule } from './mail/mail.module';
import { FanNotifyModule } from './fan-portal/fan-notify.module';
import { RateLimitMiddleware } from './common/middleware/rate-limit.middleware';
import { CoachingBookingModule } from './coaching-booking/coaching-booking.module';
import { CreatorAuthModule } from './creator-auth/creator-auth.module';
import { CreatorPortalModule } from './creator-portal/creator-portal.module';
import { FanAuthModule } from './fan-auth/fan-auth.module';
import { FanPortalModule } from './fan-portal/fan-portal.module';
import { FinanceModule } from './finance/finance.module';
import { StorageModule } from './storage/storage.module';
import { PaystackModule } from './paystack/paystack.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    StorageModule,
    PrismaModule,
    MailModule,
    ScheduleModule.forRoot(),
    UserModule,
    SubscriptionModule,
    PaymentModule,
    AdminModule,
    AuthModule,
    CreatorAuthModule,
    CreatorPortalModule,
    FanAuthModule,
    FanPortalModule,
    CoachingBookingModule,
    FanNotifyModule,
    FinanceModule,
    PaystackModule,
  ],
  controllers: [AppController],
  providers: [AppService, TasksService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply rate limiting to all routes except webhook
    consumer
      .apply(RateLimitMiddleware)
      .exclude(
        'paystack/webhook',
        'payments/paypal/capture',
        { path: 'media', method: RequestMethod.GET },
        { path: 'obs/alerts/stream', method: RequestMethod.GET },
        { path: 'obs/player', method: RequestMethod.GET },
        { path: 'obs/tts/synthesize', method: RequestMethod.POST },
      )
      .forRoutes('*');
  }
}
