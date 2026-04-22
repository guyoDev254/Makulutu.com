import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCreatorRewardDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null ? undefined : String(value).trim() || undefined,
  )
  @IsString()
  @MaxLength(4000)
  description?: string;

  @Transform(({ value }) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : NaN;
  })
  @IsNumber()
  @Min(1)
  @Max(500_000)
  amountKes: number;

  @IsString()
  @MinLength(2)
  @MaxLength(40)
  alertBannerLabel: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null ? undefined : String(value).trim() || undefined,
  )
  @IsString()
  @MaxLength(600)
  ttsScript?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === 1 || value === '1')
  @IsBoolean()
  allowSupporterMessage?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === 1 || value === '1')
  @IsBoolean()
  allowVideoClip?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    const n = Math.round(Number(value));
    return Number.isFinite(n) ? n : 200;
  })
  @IsNumber()
  @Min(0)
  @Max(500)
  maxMessageLength?: number;

  @IsOptional()
  @Transform(({ value }) => value === false || value === 'false' || value === 0 || value === '0')
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    const n = Math.round(Number(value));
    return Number.isFinite(n) ? n : 0;
  })
  @IsNumber()
  @Min(0)
  @Max(9999)
  sortOrder?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    const s = String(value).trim();
    if (!s) return undefined;
    const h = s.startsWith('#') ? s : `#${s}`;
    return /^#[0-9A-Fa-f]{6}$/.test(h) ? h.toLowerCase() : undefined;
  })
  @IsString()
  @Matches(/^#[0-9a-f]{6}$/)
  accentColor?: string;
}
