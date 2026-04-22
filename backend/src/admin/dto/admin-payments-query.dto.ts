import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class AdminPaymentsQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsIn(['SUBSCRIPTION', 'STREAM_ALERT', 'CREATOR_REWARD', 'COACHING_BOOKING'])
  purpose?: string;

  /** When true, only payments where an OBS alert was recorded (subscriberAlertEmittedAt set). */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true' || value === '1' || value === 'yes') {
      return true;
    }
    if (value === false || value === 'false' || value === '0' || value === 'no') {
      return false;
    }
    return undefined;
  })
  @IsBoolean()
  alertEmitted?: boolean;

  /** Filter to checkouts for this reward tier (`creator_reward_purchases.reward_id`). */
  @IsOptional()
  @IsUUID()
  rewardId?: string;
}
