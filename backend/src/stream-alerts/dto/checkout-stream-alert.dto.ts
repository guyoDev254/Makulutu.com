import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  MAX_STREAM_ALERT_MESSAGE_LENGTH,
  STREAM_ALERT_PLATFORMS,
} from '../../common/constants/stream-alert';

export class CheckoutStreamAlertDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  displayHandle: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(254|0)[0-9]{9}$/, {
    message: 'M-Pesa number must be 254XXXXXXXXX or 0XXXXXXXXX',
  })
  mpesaMobile: string;

  @IsString()
  @IsNotEmpty()
  @IsIn([...STREAM_ALERT_PLATFORMS])
  platform: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_STREAM_ALERT_MESSAGE_LENGTH)
  message?: string;

  /** Optional TikTok video/photo URL (https only; validated in service). */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  videoUrl?: string;

  /** KES amount; exact min/max enforced in service from platform settings. */
  @IsNumber()
  @Min(1)
  @Max(10_000_000)
  amount: number;

  /** Optional public creator slug so checkout is scoped to one creator. */
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]{3,64}$/, {
    message: 'creatorSlug must be lowercase letters, numbers, or hyphens',
  })
  creatorSlug?: string;
}
