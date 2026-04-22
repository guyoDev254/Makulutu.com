import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/** Google Cloud Text-to-Speech `input.text` limit is 5000 bytes (UTF-8). */
const MAX_TTS_UTF8_BYTES = 5000;

function truncateToUtf8Bytes(s: string, maxBytes: number): string {
  const buf = Buffer.from(s, 'utf8');
  if (buf.length <= maxBytes) return s;
  let end = maxBytes;
  while (end > 0 && (buf[end - 1] & 0xc0) === 0x80) end--;
  return buf.subarray(0, end).toString('utf8');
}

@Injectable()
export class ObsTtsService {
  private readonly logger = new Logger(ObsTtsService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return !!this.config.get<string>('GOOGLE_CLOUD_TTS_API_KEY')?.trim();
  }

  /**
   * Google Cloud Text-to-Speech (REST). Enable "Cloud Text-to-Speech API" and set GOOGLE_CLOUD_TTS_API_KEY.
   * @see https://cloud.google.com/text-to-speech/docs/voices
   */
  async synthesizeMp3(
    text: string,
    languageCode: string,
    requestVoiceName?: string,
  ): Promise<Buffer> {
    const key = this.config.get<string>('GOOGLE_CLOUD_TTS_API_KEY')?.trim();
    if (!key) {
      throw new BadRequestException('Google TTS is not configured');
    }

    const trimmed = truncateToUtf8Bytes(text.trim(), MAX_TTS_UTF8_BYTES);
    if (!trimmed) {
      throw new BadRequestException('Empty text');
    }

    const lang = (languageCode || 'en-US').trim().slice(0, 20) || 'en-US';
    const reqVoice = requestVoiceName?.trim();
    const customVoice =
      reqVoice && /^[A-Za-z0-9._-]+$/.test(reqVoice) && reqVoice.length <= 64
        ? reqVoice
        : this.config.get<string>('GOOGLE_TTS_VOICE_NAME')?.trim();
    const genderRaw =
      this.config.get<string>('GOOGLE_TTS_SSML_GENDER')?.trim().toUpperCase() ||
      '';
    const ssmlGender =
      genderRaw === 'MALE' || genderRaw === 'NEUTRAL' || genderRaw === 'FEMALE'
        ? genderRaw
        : 'FEMALE';

    const voice: { languageCode: string; name?: string; ssmlGender?: string } =
      {
        languageCode: lang,
        /** Without an explicit voice name, this pins a female voice per locale (NEUTRAL was inconsistent). */
        ssmlGender,
      };
    if (customVoice) {
      voice.name = customVoice;
    }

    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`;

    try {
      const { data } = await axios.post<{ audioContent: string }>(
        url,
        {
          input: { text: trimmed },
          voice,
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: Math.min(
              1.25,
              Math.max(
                0.75,
                parseFloat(
                  this.config.get<string>('GOOGLE_TTS_SPEAKING_RATE') || '1',
                ) || 1,
              ),
            ),
            pitch: 0,
          },
        },
        { timeout: 30000 },
      );

      if (!data?.audioContent) {
        throw new Error('No audio in TTS response');
      }

      return Buffer.from(data.audioContent, 'base64');
    } catch (err: any) {
      const apiMsg = err.response?.data?.error?.message || err.message;
      this.logger.warn(`Google TTS request failed: ${apiMsg}`);
      throw new BadRequestException(
        apiMsg || 'Text-to-speech failed. Check language code and API key.',
      );
    }
  }
}
