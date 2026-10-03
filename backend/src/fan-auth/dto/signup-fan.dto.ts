import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { IsAdultDateOfBirth } from '../../common/utils/is-adult-date-of-birth.decorator';

export class SignupFanDto {
  @IsEmail()
  @MaxLength(190)
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(120)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Enter a valid date of birth as YYYY-MM-DD.',
  })
  @IsAdultDateOfBirth()
  dateOfBirth: string;
}
