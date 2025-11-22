import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, Length, IsISO8601 } from 'class-validator';

export class GetCurrentRateDto {
  @ApiPropertyOptional({
    description: 'Base currency (default: PLN)',
    example: 'PLN',
    default: 'PLN',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  base?: string = 'PLN';

  @ApiPropertyOptional({
    description: 'NBP table type (A, B, or C)',
    example: 'A',
    default: 'A',
    enum: ['A', 'B', 'C'],
  })
  @IsOptional()
  @IsIn(['A', 'B', 'C'])
  table?: string = 'A';

  @ApiPropertyOptional({
    description: 'Rate source (NBP or ECB)',
    example: 'NBP',
    default: 'NBP',
    enum: ['NBP', 'ECB'],
  })
  @IsOptional()
  @IsIn(['NBP', 'ECB'])
  source?: string = 'NBP';
}

export class GetHistoricalRateDto extends GetCurrentRateDto {
  @ApiProperty({
    description: 'Date in YYYY-MM-DD format',
    example: '2025-01-15',
  })
  @IsISO8601({ strict: true })
  date: string;
}

export class GetRateRangeDto extends GetCurrentRateDto {
  @ApiProperty({
    description: 'Start date in YYYY-MM-DD format',
    example: '2025-01-01',
  })
  @IsISO8601({ strict: true })
  start_date: string;

  @ApiProperty({
    description: 'End date in YYYY-MM-DD format',
    example: '2025-01-31',
  })
  @IsISO8601({ strict: true })
  end_date: string;
}
