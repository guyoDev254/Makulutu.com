import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaypalService } from './paypal.service';

@Module({
  imports: [ConfigModule],
  providers: [PaypalService],
  exports: [PaypalService],
})
export class PaypalModule {}
