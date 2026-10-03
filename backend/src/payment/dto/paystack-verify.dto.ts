import { IsNotEmpty, IsString } from 'class-validator';

export class PaystackVerifyDto {
  @IsString()
  @IsNotEmpty()
  reference: string;
}
