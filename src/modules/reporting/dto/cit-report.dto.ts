import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, Min, Max, IsOptional } from 'class-validator';

export class GenerateCitReportDto {
  @ApiProperty({
    description: 'Tax year',
    example: 2025,
  })
  @IsInt()
  @Min(2000)
  @Max(2100)
  taxYear: number;
}

export class RecordAdvancePaymentDto {
  @ApiProperty({
    description: 'Advance payment amount',
    example: 5000.00,
  })
  @IsNumber()
  @Min(0)
  amount: number;
}
