import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const PRESETS = ['today', 'yesterday', 'thisWeek', 'last7', 'last30', 'custom'] as const;

function normalizeRevenuePreset(value: unknown) {
  if (typeof value !== 'string') return value;
  const lower = value.trim().toLowerCase();
  if (lower === 'thisweek') return 'thisWeek';
  return lower;
}

export class AdminRevenueQueryDto {
  @IsOptional()
  @Transform(({ value }) => normalizeRevenuePreset(value))
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
