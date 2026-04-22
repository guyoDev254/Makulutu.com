import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const PRESETS = ['today', 'yesterday', 'last7', 'last30', 'custom'] as const;

export class AdminRevenueQueryDto {
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsIn([...PRESETS])
  preset?: (typeof PRESETS)[number];

  /** Required when preset=custom (YYYY-MM-DD, Nairobi calendar). */
  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  /** Required when preset=custom */
  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}
