import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  MAX_STREAM_ALERT_MESSAGE_LENGTH,
  STREAM_ALERT_PLATFORMS,
} from '../../common/constants/stream-alert';

export class FanShoutoutDto {
  @IsString()
  creatorSlug: string;

  @IsNumber()
  @Min(1)
  @Max(10_000_000)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  displayHandle?: string;

  @IsOptional()
  @IsIn([...STREAM_ALERT_PLATFORMS])
  platform?: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_STREAM_ALERT_MESSAGE_LENGTH)
  message?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  videoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  mpesaMobile?: string;

  @IsOptional()
  @IsIn(['mpesa', 'paystack'])
  paymentMethod?: 'mpesa' | 'paystack';
}
