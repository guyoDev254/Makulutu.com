import { IsIn, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class FanSubscribeDto {
  @IsString()
  @Matches(/^[a-z0-9-]{3,64}$/)
  creatorSlug: string;

  @IsNumber()
  @Min(1)
  @Max(36)
  months: number;

  @IsOptional()
  @IsIn(['mpesa', 'paypal', 'paystack'])
  paymentMethod?: 'mpesa' | 'paypal' | 'paystack';

  @IsOptional()
  @IsString()
  @MaxLength(80)
  giftName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  giftPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  giftNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  mpesaMobile?: string;

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
