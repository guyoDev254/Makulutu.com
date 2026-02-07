import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { PaymentModule } from './payment/payment.module';
import { AdminModule } from './admin/admin.module';
import { MegapayModule } from './megapay/megapay.module';
import { AuthModule } from './auth/auth.module';
import { TasksService } from './tasks/tasks.service';
import { RateLimitMiddleware } from './common/middleware/rate-limit.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    ScheduleModule.forRoot(),
    UserModule,
    SubscriptionModule,
    PaymentModule,
    AdminModule,
    MegapayModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService, TasksService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply rate limiting to all routes except webhook
    consumer
      .apply(RateLimitMiddleware)
      .exclude('megapay/webhook')
      .forRoutes('*');
  }
}
