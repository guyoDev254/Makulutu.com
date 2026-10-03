import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSettingsDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  defaultMonthlyPrice?: number;

  /** Minimum shoutout amount (KES) without a clip URL. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10_000_000)
  shoutoutMinKes?: number;

  /** Minimum shoutout amount (KES) when a TikTok clip URL is included. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10_000_000)
  shoutoutMinKesWithVideo?: number;

  /** Maximum shoutout amount (KES). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10_000_000)
  shoutoutMaxKes?: number;

  /** Paid account review / “both” bundle checkout amount (KES). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10_000_000)
  coachingAccountReviewKes?: number;

  /** OBS overlay: new subscriber card visible time (seconds). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(3)
  @Max(600)
  obsAlertSecsNew?: number;

  /** OBS overlay: renewal card visible time (seconds). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(3)
  @Max(600)
  obsAlertSecsRenewal?: number;

  /** OBS overlay: text-only shoutout visible time (seconds). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(3)
  @Max(600)
  obsAlertSecsShoutout?: number;

  /** OBS overlay: shoutout with clip embed visible time (seconds). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(3)
  @Max(600)
  obsAlertSecsShoutoutVideo?: number;

  /** Platform fee percent charged on each completed transaction (e.g. 5 = 5%). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  platformFeePercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(720)
  settlementPeriodHours?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10_000_000)
  minWithdrawalKes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10_000_000)
  withdrawalFeeKes?: number;

  /** Display order on public subscribe: `membership`, `shoutout`, and/or creator reward UUIDs. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportCatalogOrder?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  supportTierMembershipTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  supportTierMembershipDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  supportTierShoutoutTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  supportTierShoutoutDescription?: string;

  /** OBS template for new/renewal subscription messages. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  obsSubscriptionMessageTemplate?: string;

  /** OBS template for shoutout messages. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  obsShoutoutMessageTemplate?: string;
}
