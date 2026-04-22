import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

const GROQ_TIMEOUT_MS = 8000;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Groq timeout')), ms);
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
export class ObsGroqService {
  private readonly logger = new Logger(ObsGroqService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Groq Cloud: generous free tier, fast Llama inference (no credit card for signup).
   * @see https://console.groq.com/
   */
  isConfigured(): boolean {
    return !!this.config.get<string>('GROQ_API_KEY')?.trim();
  }

  async generateSubscriberAnnouncement(params: {
    tiktokUsername: string;
    kind: 'new' | 'renewal';
    languageCode?: string;
  }): Promise<string | null> {
    const key = this.config.get<string>('GROQ_API_KEY')?.trim();
    if (!key) {
      return null;
    }

    const model =
      this.config.get<string>('GROQ_MODEL')?.trim() ||
      'llama-3.3-70b-versatile';
    const locale = params.languageCode?.trim() || 'en-US';
    const user = params.tiktokUsername.trim().slice(0, 64) || 'viewer';
    const eventLabel =
      params.kind === 'renewal'
        ? 'returning subscriber (renewal / resub)'
        : 'brand-new subscriber';

    const content = `Write ONE short line for a live stream "subscriber alert" (gaming / eFootball creator).

Facts:
- TikTok handle: @${user}
- Event: ${eventLabel}
- Stream brand: MohaGamer — welcome the subscriber into the MohaGamer community (use their handle or name).
- Locale for language: ${locale} (write in that locale's primary language, e.g. sw-KE → Kiswahili)

Rules:
- Output ONLY that single line. No quotes, no markdown, no bullets, no preamble.
- Max 110 characters if possible (hard cap 200).
- Family-friendly, hype but not cringe. At most one emoji at the end.
- Must reference @${user} or the subscriber clearly and welcome them to MohaGamer when it fits.

Line:`;

    try {
      const { data } = await withTimeout(
        axios.post<{
          choices?: Array<{ message?: { content?: string } }>;
        }>(
          GROQ_URL,
          {
            model,
            messages: [{ role: 'user', content }],
            max_tokens: 128,
            temperature: 0.9,
          },
          {
            headers: {
              Authorization: `Bearer ${key}`,
              'Content-Type': 'application/json',
            },
            timeout: GROQ_TIMEOUT_MS,
          },
        ),
        GROQ_TIMEOUT_MS + 1000,
      );

      const raw = data?.choices?.[0]?.message?.content;
      const line = sanitizeAnnouncement(raw || '');
      return line || null;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Groq announcement skipped: ${msg}`);
      return null;
    }
  }
}
