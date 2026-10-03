import { IsString, MaxLength, MinLength } from 'class-validator';

export class SetFanPasswordDto {
  @IsString()
  @MinLength(6)
  @MaxLength(120)
  password: string;
}
