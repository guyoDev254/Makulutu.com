import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginCreatorDto {
  @IsString()
  @MaxLength(190)
  identifier: string;

  @IsString()
  @MinLength(6)
  @MaxLength(120)
  password: string;
}
