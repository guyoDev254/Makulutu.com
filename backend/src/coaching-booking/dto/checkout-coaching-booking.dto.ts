import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const CHECKOUT_SERVICES = [
  'ACCOUNT_REVIEW',
  'BOTH',
  'account_review',
  'both',
] as const;

/** Paid M-Pesa checkout for account review or review+rank bundle (100 KES). */
export class CheckoutCoachingBookingDto {
  @IsIn(CHECKOUT_SERVICES as unknown as string[])
  service: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  contact: string;

  @Matches(/^(254|0)[0-9]{9}$/, {
    message: 'M-Pesa number must be 254XXXXXXXXX or 0XXXXXXXXX',
  })
  mpesaMobile: string;

  /** Game / eFootball account username to review. */
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  accountUsername: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  availability?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]{3,64}$/)
  creatorSlug?: string;
}
