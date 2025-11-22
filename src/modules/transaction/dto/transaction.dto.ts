import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsISO8601,
  IsOptional,
  IsBoolean,
  IsIn,
  IsArray,
  Min,
  Length,
} from 'class-validator';

export class CreateTransactionDto {
  @ApiProperty({
    description: 'Transaction date',
    example: '2025-01-22',
  })
  @IsISO8601({ strict: true })
  transactionDate: string;

  @ApiProperty({
    description: 'Type of transaction',
    example: 'sale',
    enum: ['sale', 'purchase', 'expense', 'refund'],
  })
  @IsIn(['sale', 'purchase', 'expense', 'refund'])
  transactionType: string;

  @ApiProperty({
    description: 'Transaction amount',
    example: 1000.00,
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: 'Currency code (ISO 4217)',
    example: 'EUR',
  })
  @IsString()
  @Length(3, 3)
  currency: string;

  @ApiPropertyOptional({
    description: 'Whether amount is net or gross',
    example: 'net',
    enum: ['net', 'gross'],
    default: 'net',
  })
  @IsOptional()
  @IsIn(['net', 'gross'])
  amountType?: string;

  @ApiPropertyOptional({
    description: 'VAT rate type',
    example: 'standard',
    enum: ['standard', 'reduced_8', 'reduced_5', 'zero', 'exempt'],
  })
  @IsOptional()
  @IsIn(['standard', 'reduced_8', 'reduced_5', 'zero', 'exempt'])
  vatRateType?: string;

  @ApiPropertyOptional({
    description: 'Invoice number',
    example: 'FV/2025/001',
  })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiPropertyOptional({
    description: 'Invoice date',
    example: '2025-01-22',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  invoiceDate?: string;

  @ApiPropertyOptional({
    description: 'Counterparty UUID',
  })
  @IsOptional()
  @IsString()
  counterpartyId?: string;

  @ApiPropertyOptional({
    description: 'Counterparty NIP (if not using counterpartyId)',
    example: '1234563218',
  })
  @IsOptional()
  @IsString()
  counterpartyNip?: string;

  @ApiPropertyOptional({
    description: 'Counterparty name (if not using counterpartyId)',
    example: 'Example Company',
  })
  @IsOptional()
  @IsString()
  counterpartyName?: string;

  @ApiPropertyOptional({
    description: 'Payment method',
    example: 'bank_transfer',
    enum: ['bank_transfer', 'cash', 'card', 'other'],
  })
  @IsOptional()
  @IsIn(['bank_transfer', 'cash', 'card', 'other'])
  paymentMethod?: string;

  @ApiPropertyOptional({
    description: 'Payment status',
    example: 'pending',
    enum: ['pending', 'paid', 'overdue', 'cancelled'],
    default: 'pending',
  })
  @IsOptional()
  @IsIn(['pending', 'paid', 'overdue', 'cancelled'])
  paymentStatus?: string;

  @ApiPropertyOptional({
    description: 'Bank account number',
    example: '12345678901234567890123456',
  })
  @IsOptional()
  @IsString()
  bankAccount?: string;

  @ApiPropertyOptional({
    description: 'Tax category',
    example: 'software_services',
  })
  @IsOptional()
  @IsString()
  taxCategory?: string;

  @ApiPropertyOptional({
    description: 'Is this expense tax deductible?',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isTaxDeductible?: boolean;

  @ApiPropertyOptional({
    description: 'Tax deduction percentage',
    example: 100.0,
    default: 100.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deductionPercentage?: number;

  @ApiPropertyOptional({
    description: 'Transaction description',
    example: 'Software development services',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Additional notes',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Tags for categorization',
    example: ['software', 'b2b'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {}
