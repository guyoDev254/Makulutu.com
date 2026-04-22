import { Global, Module } from '@nestjs/common';
import { OutboundMailService } from './outbound-mail.service';

@Global()
@Module({
  providers: [OutboundMailService],
  exports: [OutboundMailService],
})
export class MailModule {}
