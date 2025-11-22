import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsISO8601,
  IsBoolean,
  IsOptional,
  IsIn,
  Length,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ConvertAmountDto {
  @ApiProperty({
    description: 'Amount to convert',
    example: 1000.0,
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: 'Source currency code (ISO 4217)',
    example: 'EUR',
  })
  @IsString()
  @Length(3, 3)
  from_currency: string;

  @ApiProperty({
    description: 'Target currency code (ISO 4217)',
    example: 'PLN',
  })
  @IsString()
  @Length(3, 3)
  to_currency: string;

  @ApiProperty({
    description: 'Transaction date in YYYY-MM-DD format',
    example: '2025-01-15',
  })
  @IsISO8601({ strict: true })
  transaction_date: string;

  @ApiPropertyOptional({
    description: 'Use rate from last working day before transaction date (Polish tax regulation)',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  use_rate_before_date?: boolean = true;

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

export class ConversionItemDto {
  @ApiProperty({
    description: 'Unique identifier for this conversion',
    example: 'tx-001',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Amount to convert',
    example: 500.0,
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: 'Source currency code',
    example: 'USD',
  })
  @IsString()
  @Length(3, 3)
  from_currency: string;

  @ApiProperty({
    description: 'Target currency code',
    example: 'PLN',
  })
  @IsString()
  @Length(3, 3)
  to_currency: string;

  @ApiProperty({
    description: 'Transaction date in YYYY-MM-DD format',
    example: '2025-01-15',
  })
  @IsISO8601({ strict: true })
  transaction_date: string;
}

export class BatchConvertDto {
  @ApiProperty({
    description: 'Array of conversions to perform',
    type: [ConversionItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConversionItemDto)
  conversions: ConversionItemDto[];

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
