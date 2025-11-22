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
import { InvoiceService } from './services/invoice.service';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  RecordPaymentDto,
  CancelInvoiceDto,
} from './dto/invoice.dto';
import { Invoice } from './entities/invoice.entity';

@ApiTags('invoices')
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new invoice' })
  @ApiResponse({ status: 201, description: 'Invoice created successfully', type: Invoice })
  @ApiResponse({ status: 400, description: 'Invalid input or invoice number already exists' })
  async create(@Body() dto: CreateInvoiceDto): Promise<Invoice> {
    return this.invoiceService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all invoices' })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'issued', 'sent', 'cancelled'] })
  @ApiQuery({ name: 'startDate', required: false, example: '2025-01-01' })
  @ApiQuery({ name: 'endDate', required: false, example: '2025-01-31' })
  @ApiQuery({ name: 'counterpartyId', required: false })
  @ApiQuery({
    name: 'invoiceType',
    required: false,
    enum: ['standard', 'proforma', 'credit_note', 'debit_note'],
  })
  @ApiResponse({ status: 200, description: 'List of invoices', type: [Invoice] })
  async findAll(
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('counterpartyId') counterpartyId?: string,
    @Query('invoiceType') invoiceType?: string,
  ): Promise<Invoice[]> {
    return this.invoiceService.findAll({
      status,
      startDate,
      endDate,
      counterpartyId,
      invoiceType,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  @ApiParam({ name: 'id', description: 'Invoice UUID' })
  @ApiResponse({ status: 200, description: 'Invoice found', type: Invoice })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async findById(@Param('id') id: string): Promise<Invoice> {
    return this.invoiceService.findById(id);
  }

  @Get('number/:invoiceNumber')
  @ApiOperation({ summary: 'Get invoice by number' })
  @ApiParam({ name: 'invoiceNumber', description: 'Invoice number' })
  @ApiResponse({ status: 200, description: 'Invoice found', type: Invoice })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async findByNumber(@Param('invoiceNumber') invoiceNumber: string): Promise<Invoice | null> {
    return this.invoiceService.findByNumber(invoiceNumber);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update invoice (only drafts)' })
  @ApiParam({ name: 'id', description: 'Invoice UUID' })
  @ApiResponse({ status: 200, description: 'Invoice updated', type: Invoice })
  @ApiResponse({ status: 400, description: 'Only draft invoices can be updated' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto): Promise<Invoice> {
    return this.invoiceService.update(id, dto);
  }

  @Post(':id/issue')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Issue invoice (change status from draft to issued)' })
  @ApiParam({ name: 'id', description: 'Invoice UUID' })
  @ApiResponse({ status: 200, description: 'Invoice issued', type: Invoice })
  @ApiResponse({ status: 400, description: 'Only draft invoices can be issued' })
  async issue(@Param('id') id: string): Promise<Invoice> {
    return this.invoiceService.issue(id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel invoice' })
  @ApiParam({ name: 'id', description: 'Invoice UUID' })
  @ApiResponse({ status: 200, description: 'Invoice cancelled', type: Invoice })
  async cancel(@Param('id') id: string, @Body() dto: CancelInvoiceDto): Promise<Invoice> {
    return this.invoiceService.cancel(id, dto.reason);
  }

  @Post(':id/payments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record payment for invoice' })
  @ApiParam({ name: 'id', description: 'Invoice UUID' })
  @ApiResponse({ status: 200, description: 'Payment recorded', type: Invoice })
  @ApiResponse({ status: 400, description: 'Payment amount exceeds invoice total' })
  async recordPayment(@Param('id') id: string, @Body() dto: RecordPaymentDto): Promise<Invoice> {
    return this.invoiceService.recordPayment(id, dto.amount, new Date(dto.paymentDate));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete invoice (only drafts)' })
  @ApiParam({ name: 'id', description: 'Invoice UUID' })
  @ApiResponse({ status: 204, description: 'Invoice deleted' })
  @ApiResponse({ status: 400, description: 'Only draft invoices can be deleted' })
  async delete(@Param('id') id: string): Promise<void> {
    await this.invoiceService.delete(id);
  }
}
