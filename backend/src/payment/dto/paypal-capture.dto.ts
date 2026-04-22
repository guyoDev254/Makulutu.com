import { IsNotEmpty, IsString } from 'class-validator';

export class PaypalCaptureDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;
}
