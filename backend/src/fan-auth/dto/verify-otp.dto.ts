import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @Matches(/^(254|0)[0-9]{9}$/, {
    message: 'Phone must be 254XXXXXXXXX or 0XXXXXXXXX',
  })
  phone: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'OTP must be 6 digits' })
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  tiktokUsername?: string;
}
