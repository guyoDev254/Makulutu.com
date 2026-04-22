import { CoachingBookingStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCoachingBookingAdminDto {
  @IsOptional()
  @IsEnum(CoachingBookingStatus)
  status?: CoachingBookingStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNotes?: string;
}
