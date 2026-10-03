import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Matches,
  IsOptional,
  Min,
  IsIn,
  IsEmail,
  ValidateIf,
} from 'class-validator';

export class RegisterSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  tiktokUsername: string;

  @ValidateIf((o) => (o.paymentMethod || 'mpesa') === 'mpesa')
  @IsString()
  @IsNotEmpty()
  @Matches(/^(254|0)[0-9]{9}$/, {
    message: 'M-Pesa mobile number must be in format 254XXXXXXXXX or 0XXXXXXXXX',
  })
  mpesaMobile?: string;

  @ValidateIf((o) => (o.paymentMethod || 'mpesa') === 'mpesa')
  @IsString()
  @IsNotEmpty()
  @Matches(/^(254|0)[0-9]{9}$/, {
    message: 'WhatsApp number must be in format 254XXXXXXXXX or 0XXXXXXXXX',
  })
  whatsappNumber?: string;

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

  /** `mpesa` (default): STK. `paypal`: PayPal. `paystack`: hosted card / international (KES). */
  @IsOptional()
  @IsIn(['mpesa', 'paypal', 'paystack'])
  paymentMethod?: 'mpesa' | 'paypal' | 'paystack';

  @ValidateIf((o) => o.paymentMethod === 'paystack')
  @IsEmail()
  email?: string;

  /** Fan country at checkout (KES vs USD labels). Stored on payment + membership. */
  @IsOptional()
  @IsIn([
    'KE',
    'NG',
    'GH',
    'ZA',
    'TZ',
    'UG',
    'RW',
    'ET',
    'EG',
    'SN',
    'CM',
    'DZ',
    'US',
    'GB',
    'CA',
    'OTHER',
  ])
  checkoutCountry?: string;
}
