import { IsIn, IsOptional, IsString } from 'class-validator';

const PAYOUT_EXPORT_STATUSES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'PAID',
  'ALL',
] as const;

export class AdminPayoutExportQueryDto {
  @IsOptional()
  @IsIn(PAYOUT_EXPORT_STATUSES as unknown as string[])
  status?: (typeof PAYOUT_EXPORT_STATUSES)[number] = 'APPROVED';

  @IsOptional()
  @IsString()
  search?: string;
}
