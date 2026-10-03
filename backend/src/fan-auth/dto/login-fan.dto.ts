import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginFanDto {
  /** Email or Kenyan mobile (254… / 07…). */
  @IsOptional()
  @IsString()
  @MaxLength(190)
  identifier?: string;

  /** @deprecated Prefer `identifier`. Kept for older app builds. */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsString()
  @MinLength(6)
  @MaxLength(120)
  password: string;
}
