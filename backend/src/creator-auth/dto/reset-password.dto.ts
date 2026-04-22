import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  token: string;

  @IsString()
  @MinLength(6)
  @MaxLength(120)
  password: string;
}
