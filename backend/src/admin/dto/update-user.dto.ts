import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  tiktokUsername?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  mpesaMobile?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  whatsappNumber?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  addedToWhatsApp?: boolean;
}
