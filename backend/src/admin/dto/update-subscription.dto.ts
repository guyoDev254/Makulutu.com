import { IsNumber, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { SubscriptionStatus } from '@prisma/client';

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  months?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  amount?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  discountAmount?: number; // Discount in KES (e.g., 5 KES discount)

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  discountPercentage?: number; // Discount percentage (e.g., 10 for 10%)

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;
}
