import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class AdminRevenueTransactionsQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.trim().toLowerCase() === 'thisweek'
        ? 'thisWeek'
        : value.trim().toLowerCase()
      : value,
  )
  @IsIn(['today', 'yesterday', 'thisWeek', 'last7', 'last30', 'custom'])
  preset?: string;

  @IsOptional()
  @IsString()
  creatorId?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  settlementStatus?: string;
}

export class AdminRevenueChartQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;

  @IsOptional()
  @IsIn(['today', 'yesterday', 'thisWeek', 'last7', 'last30', 'custom'])
  preset?: string;

  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  bucket?: string;

  @IsOptional()
  @IsString()
  creatorId?: string;
}
