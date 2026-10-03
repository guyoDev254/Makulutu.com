import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpsertPayoutDestinationDto {
  @IsOptional()
  @IsIn(['MPESA', 'BANK'])
  channel?: 'MPESA' | 'BANK';

  @IsOptional()
  @IsString()
  @MaxLength(80)
  payoutChannel?: string;

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
