import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, Min, Max, Matches } from 'class-validator';

export class PeriodQueryDto {
  @ApiProperty({
    description: 'Start date (YYYY-MM-DD)',
    example: '2025-01-01',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Start date must be in YYYY-MM-DD format',
  })
  startDate: string;

  @ApiProperty({
    description: 'End date (YYYY-MM-DD)',
    example: '2025-12-31',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'End date must be in YYYY-MM-DD format',
  })
  endDate: string;
}

export class TaxSummaryQueryDto {
  @ApiProperty({
    description: 'Tax year',
    example: 2025,
  })
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @ApiPropertyOptional({
    description: 'Month (optional, 1-12)',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;
}

export class YearQueryDto {
  @ApiProperty({
    description: 'Year',
    example: 2025,
  })
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;
}

export class TopCounterpartiesQueryDto extends PeriodQueryDto {
  @ApiPropertyOptional({
    description: 'Number of top counterparties to return',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class DashboardQueryDto {
  @ApiProperty({
    description: 'Year',
    example: 2025,
  })
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @ApiPropertyOptional({
    description: 'Month (optional, 1-12)',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;
}
