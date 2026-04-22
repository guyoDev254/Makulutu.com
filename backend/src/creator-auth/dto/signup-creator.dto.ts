import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SignupCreatorDto {
  @IsEmail()
  @MaxLength(190)
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(120)
  password: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  displayName: string;

  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/, {
    message:
      'Slug must be lowercase letters, numbers, hyphens (3-64 chars, cannot start/end with hyphen)',
  })
  slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  whatIDo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  packagesSummary?: string;
}
