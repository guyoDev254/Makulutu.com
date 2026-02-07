import { IsNumber, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class RenewSubscriptionDto {
  @IsNumber()
  @IsNotEmpty()
  months: number;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsOptional()
  @IsUUID()
  paymentId?: string;
}
