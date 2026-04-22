import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { STREAM_ALERT_PLATFORMS } from '../../common/constants/stream-alert';

export class CheckoutCreatorRewardDto {
  @IsString()
  @MaxLength(64)
  displayName: string;

  @Matches(/^(254|0)[0-9]{9}$/, {
    message: 'M-Pesa number must be 254XXXXXXXXX or 0XXXXXXXXX',
  })
  mpesaMobile: string;

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
}
