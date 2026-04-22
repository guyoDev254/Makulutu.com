import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePayoutRequestDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10_000_000)
  amountKes: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  payoutChannel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
