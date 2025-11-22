import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { TransactionService } from './services/transaction.service';
import { VatCalculatorService } from './services/vat-calculator.service';
import { CreateTransactionDto, UpdateTransactionDto } from './dto/transaction.dto';
import { Transaction } from './entities/transaction.entity';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionController {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly vatCalculatorService: VatCalculatorService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new transaction' })
  @ApiResponse({ status: 201, description: 'Transaction created successfully', type: Transaction })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(@Body() dto: CreateTransactionDto): Promise<Transaction> {
    return this.transactionService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all transactions' })
  @ApiQuery({ name: 'type', required: false, enum: ['sale', 'purchase', 'expense', 'refund'] })
  @ApiQuery({ name: 'startDate', required: false, example: '2025-01-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2025-01-31' })
  @ApiQuery({ name: 'counterpartyId', required: false })
  @ApiQuery({ name: 'paymentStatus', required: false, enum: ['pending', 'paid', 'overdue', 'cancelled'] })
  @ApiQuery({ name: 'minAmount', required: false, type: Number })
  @ApiQuery({ name: 'maxAmount', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of transactions', type: [Transaction] })
  async findAll(
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('counterpartyId') counterpartyId?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('minAmount') minAmount?: number,
    @Query('maxAmount') maxAmount?: number,
  ): Promise<Transaction[]> {
    return this.transactionService.findAll({
      type,
      startDate,
      endDate,
      counterpartyId,
      paymentStatus,
      minAmount,
      maxAmount,
    });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get transactions summary for a period' })
  @ApiQuery({ name: 'startDate', required: true, example: '2025-01-01' })
  @ApiQuery({ name: 'endDate', required: true, example: '2025-01-31' })
  @ApiResponse({
    status: 200,
    description: 'Transactions summary',
    schema: {
      type: 'object',
      properties: {
        totalSales: { type: 'number', example: 50000.00 },
        totalPurchases: { type: 'number', example: 30000.00 },
        totalVatCollected: { type: 'number', example: 11500.00 },
        totalVatPaid: { type: 'number', example: 6900.00 },
        vatBalance: { type: 'number', example: 4600.00 },
        transactionCount: { type: 'number', example: 42 },
      },
    },
  })
  async getSummary(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.transactionService.getSummary(startDate, endDate);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by ID' })
  @ApiParam({ name: 'id', description: 'Transaction UUID' })
  @ApiResponse({ status: 200, description: 'Transaction found', type: Transaction })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async findById(@Param('id') id: string): Promise<Transaction> {
    return this.transactionService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update transaction' })
  @ApiParam({ name: 'id', description: 'Transaction UUID' })
  @ApiResponse({ status: 200, description: 'Transaction updated', type: Transaction })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateTransactionDto): Promise<Transaction> {
    return this.transactionService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete transaction' })
  @ApiParam({ name: 'id', description: 'Transaction UUID' })
  @ApiResponse({ status: 204, description: 'Transaction deleted' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async delete(@Param('id') id: string): Promise<void> {
    await this.transactionService.delete(id);
  }

  @Get('vat/rates')
  @ApiOperation({ summary: 'Get available VAT rates' })
  @ApiResponse({
    status: 200,
    description: 'VAT rates',
    schema: {
      type: 'object',
      properties: {
        standard: { type: 'number', example: 23.0 },
        reduced_8: { type: 'number', example: 8.0 },
        reduced_5: { type: 'number', example: 5.0 },
        zero: { type: 'number', example: 0.0 },
        exempt: { type: 'number', example: 0.0 },
      },
    },
  })
  getVatRates() {
    return this.vatCalculatorService.getAvailableRates();
  }
}
