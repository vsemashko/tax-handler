import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsBoolean,
  IsOptional,
  IsIn,
  Length,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BankAccountDto {
  @ApiProperty({ example: '12345678901234567890123456' })
  @IsString()
  accountNumber: string;

  @ApiPropertyOptional({ example: 'PKO BP' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class CreateCounterpartyDto {
  @ApiPropertyOptional({
    description: 'Polish NIP (Tax Identification Number)',
    example: '1234563218',
  })
  @IsOptional()
  @IsString()
  @Length(10, 13) // Allow for dashes
  nip?: string;

  @ApiProperty({
    description: 'Company or person name',
    example: 'Example Sp. z o.o.',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Legal form of the entity',
    example: 'Sp. z o.o.',
  })
  @IsOptional()
  @IsString()
  legalForm?: string;

  @ApiPropertyOptional({ example: 'ul. Przykładowa 123' })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiPropertyOptional({ example: 'Warszawa' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: '00-001' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({
    description: 'ISO 3166-1 alpha-2 country code',
    example: 'PL',
    default: 'PL',
  })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;

  @ApiPropertyOptional({ example: 'contact@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+48 123 456 789' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Type of counterparty',
    example: 'customer',
    enum: ['customer', 'supplier', 'both'],
    default: 'customer',
  })
  @IsOptional()
  @IsIn(['customer', 'supplier', 'both'])
  counterpartyType?: string;

  @ApiPropertyOptional({
    description: 'Is this an EU entity?',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isEuEntity?: boolean;

  @ApiPropertyOptional({
    description: 'Is this entity VAT registered?',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isVatRegistered?: boolean;

  @ApiPropertyOptional({
    description: 'Bank accounts',
    type: [BankAccountDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BankAccountDto)
  bankAccounts?: BankAccountDto[];

  @ApiPropertyOptional({ example: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCounterpartyDto extends PartialType(CreateCounterpartyDto) {}

export class AddBankAccountDto {
  @ApiProperty({ example: '12345678901234567890123456' })
  @IsString()
  accountNumber: string;

  @ApiPropertyOptional({ example: 'PKO BP' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
