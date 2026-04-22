import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateCreatorAdminDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  supportEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  onboardingComplete?: boolean;
}
