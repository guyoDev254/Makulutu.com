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
  ValidateIf,
} from 'class-validator';

export class UpdateCreatorRewardDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null ? undefined : String(value).trim() || undefined,
  )
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @Transform(({ value }) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  })
  @IsNumber()
  @Min(1)
  @Max(500_000)
  amountKes?: number;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  alertBannerLabel?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null ? undefined : String(value).trim() || undefined,
  )
  @IsString()
  @MaxLength(600)
  ttsScript?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    return value === true || value === 'true' || value === 1 || value === '1';
  })
  @IsBoolean()
  allowSupporterMessage?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    return value === true || value === 'true' || value === 1 || value === '1';
  })
  @IsBoolean()
  allowVideoClip?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    const n = Math.round(Number(value));
    return Number.isFinite(n) ? n : undefined;
  })
  @IsNumber()
  @Min(0)
  @Max(500)
  maxMessageLength?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    return !(value === false || value === 'false' || value === 0 || value === '0');
  })
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    const n = Math.round(Number(value));
    return Number.isFinite(n) ? n : undefined;
  })
  @IsNumber()
  @Min(0)
  @Max(9999)
  sortOrder?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    const s = String(value).trim();
    if (!s) return null;
    const h = s.startsWith('#') ? s : `#${s}`;
    return /^#[0-9A-Fa-f]{6}$/.test(h) ? h.toLowerCase() : undefined;
  })
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsString()
  @Matches(/^#[0-9a-f]{6}$/)
  accentColor?: string | null;
}
