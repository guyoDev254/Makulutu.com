import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { STREAM_ALERT_PLATFORMS } from '../../common/constants/stream-alert';

export class FanRewardCheckoutDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  displayName?: string;

  @IsOptional()
  @IsIn([...STREAM_ALERT_PLATFORMS])
  platform?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
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
