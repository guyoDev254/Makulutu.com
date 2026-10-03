import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class FanCoachDto {
  @IsString()
  @Matches(/^[a-z0-9-]{3,64}$/)
  creatorSlug: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  accountUsername: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  mpesaMobile?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;
}
