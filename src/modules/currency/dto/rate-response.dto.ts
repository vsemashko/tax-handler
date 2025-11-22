import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RateResponseDto {
  @ApiProperty({ example: 'USD' })
  currency: string;

  @ApiProperty({ example: 'PLN' })
  base: string;

  @ApiProperty({ example: 4.0234 })
  rate: number;

  @ApiProperty({ example: '2025-01-15' })
  rate_date: string;

  @ApiProperty({ example: 'NBP' })
  source: string;

  @ApiProperty({ example: 'A' })
  table: string;

  @ApiProperty({ example: '2025-01-15T00:00:00.000Z' })
  effective_from: string;

  @ApiPropertyOptional({ example: '2025-01-16T00:00:00.000Z' })
  effective_to?: string | null;
}

export class ConversionResponseDto {
  @ApiProperty({ example: 1000.0 })
  original_amount: number;

  @ApiProperty({ example: 'EUR' })
  original_currency: string;

  @ApiProperty({ example: 4321.5 })
  converted_amount: number;

  @ApiProperty({ example: 'PLN' })
  converted_currency: string;

  @ApiProperty({ example: 4.3215 })
  exchange_rate: number;

  @ApiProperty({ example: '2025-01-14' })
  rate_date: string;

  @ApiProperty({ example: 'NBP' })
  rate_source: string;

  @ApiProperty({ example: '2025-01-15' })
  transaction_date: string;

  @ApiProperty({ example: '2025-01-15T10:30:00.000Z' })
  conversion_timestamp: string;
}

export class BatchConversionItemResponseDto extends ConversionResponseDto {
  @ApiProperty({ example: 'tx-001' })
  id: string;
}

export class BatchConversionResponseDto {
  @ApiProperty({ type: [BatchConversionItemResponseDto] })
  conversions: BatchConversionItemResponseDto[];

  @ApiProperty({ example: 2 })
  total_conversions: number;

  @ApiProperty({ example: 2 })
  successful: number;

  @ApiProperty({ example: 0 })
  failed: number;
}

export class RateSeriesItemDto {
  @ApiProperty({ example: '2025-01-10' })
  date: string;

  @ApiProperty({ example: 4.0156 })
  rate: number;
}

export class RateSeriesResponseDto {
  @ApiProperty({ example: 'USD' })
  currency: string;

  @ApiProperty({ example: 'PLN' })
  base: string;

  @ApiProperty({ type: [RateSeriesItemDto] })
  rates: RateSeriesItemDto[];

  @ApiProperty({ example: 10 })
  count: number;
}

export class CurrencyDto {
  @ApiProperty({ example: 'USD' })
  code: string;

  @ApiProperty({ example: 'US Dollar' })
  name: string;

  @ApiProperty({ example: '$' })
  symbol: string;

  @ApiProperty({ example: ['A', 'C'] })
  available_in_tables: string[];
}

export class CurrenciesResponseDto {
  @ApiProperty({ type: [CurrencyDto] })
  currencies: CurrencyDto[];
}
