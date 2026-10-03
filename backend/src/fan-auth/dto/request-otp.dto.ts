import { IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';
import { IsAdultDateOfBirth } from '../../common/utils/is-adult-date-of-birth.decorator';

export class RequestOtpDto {
  @IsString()
  @Matches(/^(254|0)[0-9]{9}$/, {
    message: 'Phone must be 254XXXXXXXXX or 0XXXXXXXXX',
  })
  phone: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @ValidateIf((_, v) => v != null && String(v).trim() !== '')
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Enter a valid date of birth as YYYY-MM-DD.',
  })
  @IsAdultDateOfBirth()
  dateOfBirth?: string;
}
