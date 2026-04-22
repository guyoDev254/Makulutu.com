import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const SERVICES = [
  'ACCOUNT_REVIEW',
  'RANK_PUSH',
  'BOTH',
  'account_review',
  'rank_push',
  'both',
] as const;

export class CreateCoachingBookingDto {
  @IsIn(SERVICES as unknown as string[])
  service: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  contact: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  availability?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]{3,64}$/)
  creatorSlug?: string;
}
