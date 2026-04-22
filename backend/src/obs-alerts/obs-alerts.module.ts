import { Module } from '@nestjs/common';
import { ObsAlertsService } from './obs-alerts.service';
import { ObsAlertsController } from './obs-alerts.controller';
import { ObsTtsService } from './obs-tts.service';
import { ObsGeminiService } from './obs-gemini.service';
import { ObsGroqService } from './obs-groq.service';

@Module({
  controllers: [ObsAlertsController],
  providers: [
    ObsAlertsService,
    ObsTtsService,
    ObsGeminiService,
    ObsGroqService,
  ],
  exports: [
    ObsAlertsService,
    ObsTtsService,
    ObsGeminiService,
    ObsGroqService,
  ],
})
export class ObsAlertsModule {}
