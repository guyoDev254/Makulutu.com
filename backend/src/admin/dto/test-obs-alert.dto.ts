import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const OBS_TEST_PLATFORMS = [
  'tiktok',
  'youtube',
  'facebook',
  'x',
  'twitch',
  'other',
] as const;

export class TestObsAlertDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    const raw = String(value).trim().replace(/^@+/, '');
    return raw.length === 0 ? undefined : raw.slice(0, 64);
  })
  @IsString()
  @MaxLength(64)
  tiktokUsername?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    return String(value);
  })
  @IsIn(['new', 'renewal', 'shoutout', 'account_review', 'creator_reward'])
  kind?: 'new' | 'renewal' | 'shoutout' | 'account_review' | 'creator_reward';

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    const s = String(value).trim().slice(0, 20);
    return s.length === 0 ? undefined : s;
  })
  @IsString()
  @MaxLength(20)
  languageCode?: string;

  /** When true, skip Groq/Gemini AI lines (faster test). */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (value === true || value === 'true' || value === 1 || value === '1') return true;
    if (value === false || value === 'false' || value === 0 || value === '0') return false;
    return undefined;
  })
  @IsBoolean()
  skipGemini?: boolean;

  /** Optional line for OBS / TTS; skips AI when set. */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    const s = String(value).trim().slice(0, 500);
    return s.length === 0 ? undefined : s;
  })
  @IsString()
  @MaxLength(500)
  announcementText?: string;

  @IsOptional()
  @IsString()
  @IsIn([...OBS_TEST_PLATFORMS])
  subscriberPlatform?: string;

  /** For kind new / renewal: subscription total in KES in the player. */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n) : undefined;
  })
  @IsNumber()
  @Min(0)
  @Max(500_000)
  subscriptionAmountKes?: number;

  /** For kind shoutout: shoutout donation in KES in the player. */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n) : undefined;
  })
  @IsNumber()
  @Min(0)
  @Max(500_000)
  shoutoutAmountKes?: number;

  /** Shoutout / reward tier test: optional TikTok clip page URL (same rules as checkout). */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    const s = String(value).trim();
    return s.length === 0 ? undefined : s.slice(0, 500);
  })
  @IsString()
  @MaxLength(500)
  videoUrl?: string;

  /** For kind account_review: game / eFootball account username (same as live coaching checkout). */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    const s = String(value).trim().slice(0, 120);
    return s.length === 0 ? undefined : s;
  })
  @IsString()
  @MaxLength(120)
  coachingAccountUsername?: string;

  /** For kind creator_reward: use this tier’s banner, TTS template, and default KES (amount override still allowed). */
  @IsOptional()
  @IsUUID('4')
  creatorRewardId?: string;
}
