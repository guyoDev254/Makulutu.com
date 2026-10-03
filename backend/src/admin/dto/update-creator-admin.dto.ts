import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return undefined;
}

export class UpdateCreatorAdminDto {
  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  supportEnabled?: boolean;

  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  onboardingComplete?: boolean;

  /** Prefer `streamReviewAction` — implicit boolean conversion can turn `false` into verify. */
  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  streamVerified?: boolean;

  @IsOptional()
  @IsIn(['approve', 'reject'])
  streamReviewAction?: 'approve' | 'reject';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  streamReviewNote?: string;
}
