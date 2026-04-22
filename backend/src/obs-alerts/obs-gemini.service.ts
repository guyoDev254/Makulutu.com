import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Gemini timeout')), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

function sanitizeAnnouncement(raw: string): string {
  return raw
    .replace(/\r?\n/g, ' ')
    .replace(/^[\s"'`*]+|[\s"'`*]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 280);
}

@Injectable()
export class ObsGeminiService {
  private readonly logger = new Logger(ObsGeminiService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return !!this.config.get<string>('GOOGLE_GEMINI_API_KEY')?.trim();
  }

  /**
   * One short line for live TTS + on-screen subtitle. Optional; failures return null.
   */
  async generateSubscriberAnnouncement(params: {
    tiktokUsername: string;
    kind: 'new' | 'renewal';
    languageCode?: string;
  }): Promise<string | null> {
    const key = this.config.get<string>('GOOGLE_GEMINI_API_KEY')?.trim();
    if (!key) {
      return null;
    }

    const modelName =
      this.config.get<string>('GEMINI_MODEL')?.trim() || 'gemini-1.5-flash';
    const locale = params.languageCode?.trim() || 'en-US';
    const user = params.tiktokUsername.trim().slice(0, 64) || 'viewer';
    const eventLabel =
      params.kind === 'renewal'
        ? 'returning subscriber (renewal / resub)'
        : 'brand-new subscriber';

    const prompt = `You write ONE short line for a live stream "new subscriber" alert (gaming / eFootball creator).

Facts:
- TikTok handle: @${user}
- Event: ${eventLabel}
- Stream brand: MohaGamer — welcome the subscriber into the MohaGamer community (use their handle or name).
- Spoken / written language locale: ${locale} (match this locale's primary language; e.g. sw-KE → Kiswahili, en-US → English)

Hard rules:
- Output ONLY that single line. No quotes, no markdown, no bullet points, no preamble.
- Max 110 characters if possible (hard cap 200).
- Family-friendly, hype but not cringe. You may end with one emoji max.
- Must clearly reference the subscriber (@${user} or their name) and welcome them to MohaGamer when it fits.

Line:`;

    try {
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          maxOutputTokens: 128,
          temperature: 0.95,
        },
      });

      const result = await withTimeout(
        model.generateContent(prompt),
        GEMINI_TIMEOUT_MS,
      );

      const text = result.response.text();
      const line = sanitizeAnnouncement(text);
      if (!line) {
        return null;
      }
      return line;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Gemini announcement skipped: ${msg}`);
      return null;
    }
  }
}
