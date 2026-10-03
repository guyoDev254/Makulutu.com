import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { LIVE_PLATFORMS } from '../live-platforms';

export class CreateScheduledLiveDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null ? undefined : String(value).trim() || undefined,
  )
  @IsString()
  @MaxLength(1000)
  description?: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsIn([...LIVE_PLATFORMS])
  platform: string;

  @IsDateString()
  startsAt: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null ? undefined : String(value).trim() || undefined,
  )
  @IsString()
  @MaxLength(500)
  streamUrl?: string;
}
