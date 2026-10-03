import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { LIVE_PLATFORMS } from '../live-platforms';

export class UpdateScheduledLiveDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null ? undefined : String(value).trim() || null,
  )
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsIn([...LIVE_PLATFORMS])
  platform?: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsDateString()
  endsAt?: string | null;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null ? undefined : String(value).trim() || null,
  )
  @IsString()
  @MaxLength(500)
  streamUrl?: string | null;
}
