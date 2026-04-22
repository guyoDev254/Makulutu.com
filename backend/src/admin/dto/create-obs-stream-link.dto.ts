import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateObsStreamLinkDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  label?: string;
}
