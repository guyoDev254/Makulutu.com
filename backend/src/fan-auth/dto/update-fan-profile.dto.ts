import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateFanProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  tiktokUsername?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(190)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsIn(['en', 'sw'])
  locale?: string;

  @IsOptional()
  @IsBoolean()
  showOnLeaderboard?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  expoPushToken?: string;
}
