import { Type } from 'class-transformer';
import {
  IsIn,
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

  @IsOptional()
  @IsIn(['MPESA', 'BANK'])
  channel?: 'MPESA' | 'BANK';

  @IsOptional()
  @IsString()
  @MaxLength(32)
  bankCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  bankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  accountNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  accountName?: string;
}
