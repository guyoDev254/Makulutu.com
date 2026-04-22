import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const PAYOUT_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'PAID'] as const;

export class AdminPayoutRequestsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(PAYOUT_STATUSES as unknown as string[])
  status?: (typeof PAYOUT_STATUSES)[number];
}
