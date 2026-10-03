import { IsEmail, IsString, Matches, MaxLength } from 'class-validator';

export class VerifyEmailOtpDto {
  @IsEmail()
  @MaxLength(190)
  email: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'Enter the 6-digit code from your email' })
  code: string;
}
