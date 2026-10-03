import { Module } from '@nestjs/common';
import { GoogleTokenService } from './google-token.service';

@Module({
  providers: [GoogleTokenService],
  exports: [GoogleTokenService],
})
export class GoogleAuthModule {}
