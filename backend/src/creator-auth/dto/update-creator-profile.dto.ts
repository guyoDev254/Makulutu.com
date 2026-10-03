import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateCreatorProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  displayName?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsString()
  @MaxLength(300)
  bio?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsString()
  @MaxLength(1200)
  whatIDo?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsString()
  @MaxLength(1200)
  packagesSummary?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsString()
  @MaxLength(200)
  tiktokUrl?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsString()
  @MaxLength(200)
  instagramUrl?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsString()
  @MaxLength(200)
  youtubeUrl?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsString()
  @MaxLength(800)
  avatarUrl?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsString()
  @MaxLength(80)
  primaryCategory?: string;

  @IsOptional()
  @ValidateIf((_, v) => typeof v === 'string' && v.trim().length > 0)
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/, {
    message:
      'Slug must be lowercase letters, numbers, hyphens (3-64 chars, cannot start/end with hyphen)',
  })
  slug?: string;

  @IsOptional()
  @IsBoolean()
  onboardingComplete?: boolean;

  @IsOptional()
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsString()
  @MaxLength(280)
  fanThankYouMessage?: string;
}
