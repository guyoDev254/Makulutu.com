import { IsNumber, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { User } from '../../user/entities/user.entity';

export class CreateSubscriptionDto {
  @IsNotEmpty()
  user: User;

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
