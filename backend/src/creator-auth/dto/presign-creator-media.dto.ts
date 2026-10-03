import { IsIn, IsString, MaxLength } from 'class-validator';

export class PresignCreatorMediaDto {
  @IsString()
  @IsIn(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
  contentType: string;
}

export class ConfirmCreatorMediaDto {
  @IsString()
  @MaxLength(800)
  key: string;
}
