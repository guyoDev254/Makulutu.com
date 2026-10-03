import { IsEmail, MaxLength } from 'class-validator';

export class ResendVerificationEmailDto {
  @IsEmail()
  @MaxLength(190)
  email: string;
}
