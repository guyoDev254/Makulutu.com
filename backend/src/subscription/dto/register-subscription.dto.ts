import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Matches,
  IsOptional,
  Min,
  IsIn,
} from 'class-validator';

export class RegisterSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  tiktokUsername: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(254|0)[0-9]{9}$/, {
    message: 'M-Pesa mobile number must be in format 254XXXXXXXXX or 0XXXXXXXXX',
  })
  mpesaMobile: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(254|0)[0-9]{9}$/, {
    message: 'WhatsApp number must be in format 254XXXXXXXXX or 0XXXXXXXXX',
  })
  whatsappNumber: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  months: number;

  @IsOptional()
  @IsNumber()
  monthlyPrice?: number;

  /** Optional public creator slug for creator-scoped checkout flows. */
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]{3,64}$/, {
    message: 'creatorSlug must be lowercase letters, numbers, or hyphens',
  })
  creatorSlug?: string;

  /** `mpesa` (default): STK push. `paypal`: redirect to PayPal (requires server env). */
  @IsOptional()
  @IsIn(['mpesa', 'paypal'])
  paymentMethod?: 'mpesa' | 'paypal';
}
