import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const PAYOUT_ACTIONS = ['APPROVED', 'REJECTED', 'PAID', 'FAILED', 'CANCELLED'] as const;

export class ReviewPayoutRequestDto {
  @IsIn(PAYOUT_ACTIONS as unknown as string[])
  status: (typeof PAYOUT_ACTIONS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  payoutReference?: string;
}
