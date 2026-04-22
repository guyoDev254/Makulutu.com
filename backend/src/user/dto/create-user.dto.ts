import {
  IsString,
  IsNotEmpty,
  Matches,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  tiktokUsername: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(254|0)[0-9]{9}$/, {
    message: 'M-Pesa mobile number must be in format 254XXXXXXXXX or 0XXXXXXXXX',
  })
  mpesaMobile: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(254|0)[0-9]{9}$/, {
    message: 'WhatsApp number must be in format 254XXXXXXXXX or 0XXXXXXXXX',
  })
  whatsappNumber: string;

  @IsOptional()
  @IsUUID()
  creatorId?: string;
}
