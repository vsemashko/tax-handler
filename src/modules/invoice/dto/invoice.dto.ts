import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsISO8601,
  IsOptional,
  IsInt,
  IsArray,
  ValidateNested,
  IsIn,
  Min,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InvoiceLineItemDto {
  @ApiProperty({
    description: 'Item description',
    example: 'Software development services',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Quantity',
    example: 160,
  })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({
    description: 'Unit of measure',
    example: 'hours',
    default: 'szt',
  })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({
    description: 'Unit price',
    example: 100.00,
  })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({
    description: 'VAT rate type',
    example: 'standard',
    enum: ['standard', 'reduced_8', 'reduced_5', 'zero', 'exempt'],
  })
  @IsOptional()
  @IsIn(['standard', 'reduced_8', 'reduced_5', 'zero', 'exempt'])
  vatRateType?: string;
}

export class CreateInvoiceDto {
  @ApiProperty({
    description: 'Invoice number',
    example: 'FV/2025/001',
  })
  @IsString()
  invoiceNumber: string;

  @ApiPropertyOptional({
    description: 'Invoice type',
    example: 'standard',
    enum: ['standard', 'proforma', 'credit_note', 'debit_note'],
    default: 'standard',
  })
  @IsOptional()
  @IsIn(['standard', 'proforma', 'credit_note', 'debit_note'])
  invoiceType?: string;

  @ApiProperty({
    description: 'Issue date',
    example: '2025-01-22',
  })
  @IsISO8601({ strict: true })
  issueDate: string;

  @ApiPropertyOptional({
    description: 'Sale date (defaults to issue date)',
    example: '2025-01-22',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  saleDate?: string;

  @ApiPropertyOptional({
    description: 'Due date',
    example: '2025-02-22',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  dueDate?: string;

  @ApiPropertyOptional({
    description: 'Payment terms in days (used to calculate due date if not provided)',
    example: 30,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  paymentTermsDays?: number;

  @ApiProperty({
    description: 'Seller (your company) name',
    example: 'My Company Sp. z o.o.',
  })
  @IsString()
  sellerName: string;

  @ApiProperty({
    description: 'Seller NIP',
    example: '1234563218',
  })
  @IsString()
  @Length(10, 10)
  sellerNip: string;

  @ApiProperty({
    description: 'Seller address',
    example: 'ul. Przykładowa 123, 00-001 Warszawa, PL',
  })
  @IsString()
  sellerAddress: string;

  @ApiProperty({
    description: 'Buyer (counterparty) UUID',
  })
  @IsString()
  counterpartyId: string;

  @ApiProperty({
    description: 'Currency code (ISO 4217)',
    example: 'PLN',
  })
  @IsString()
  @Length(3, 3)
  currency: string;

  @ApiProperty({
    description: 'Invoice line items',
    type: [InvoiceLineItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineItemDto)
  lineItems: InvoiceLineItemDto[];

  @ApiPropertyOptional({
    description: 'Payment method',
    example: 'bank_transfer',
  })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({
    description: 'Notes visible on invoice',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Internal notes (not visible on invoice)',
  })
  @IsOptional()
  @IsString()
  internalNotes?: string;
}

export class UpdateInvoiceDto extends PartialType(CreateInvoiceDto) {}

export class RecordPaymentDto {
  @ApiProperty({
    description: 'Payment amount',
    example: 1230.00,
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: 'Payment date',
    example: '2025-01-22',
  })
  @IsISO8601({ strict: true })
  paymentDate: string;
}

export class CancelInvoiceDto {
  @ApiProperty({
    description: 'Cancellation reason',
    example: 'Customer request',
  })
  @IsString()
  reason: string;
}
