import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentModule } from '../payment/payment.module';
import { CoachingBookingController } from './coaching-booking.controller';
import { CoachingBookingService } from './coaching-booking.service';

@Module({
  imports: [PrismaModule, PaymentModule],
  controllers: [CoachingBookingController],
  providers: [CoachingBookingService],
})
export class CoachingBookingModule {}
