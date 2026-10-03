import { IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { IsAdultDateOfBirth } from '../../common/utils/is-adult-date-of-birth.decorator';

export class GoogleAuthDto {
  @IsString()
  @MinLength(20)
  @MaxLength(4096)
  idToken: string;

  @IsOptional()
  @ValidateIf((_, v) => v != null && String(v).trim() !== '')
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Enter a valid date of birth as YYYY-MM-DD.',
  })
  @IsAdultDateOfBirth()
  dateOfBirth?: string;
}
