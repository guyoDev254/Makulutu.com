import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSettingsDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  defaultMonthlyPrice?: number;
}
