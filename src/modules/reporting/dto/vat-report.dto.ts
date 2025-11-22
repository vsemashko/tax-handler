import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsIn, IsOptional, Min, Max } from 'class-validator';

export class GenerateVatReportDto {
  @ApiProperty({
    description: 'Year',
    example: 2025,
  })
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @ApiProperty({
    description: 'Month (1-12)',
    example: 1,
  })
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiPropertyOptional({
    description: 'Period type',
    example: 'monthly',
    enum: ['monthly', 'quarterly'],
    default: 'monthly',
  })
  @IsOptional()
  @IsIn(['monthly', 'quarterly'])
  periodType?: 'monthly' | 'quarterly';
}
