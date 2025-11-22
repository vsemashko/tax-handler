import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../entities/invoice.entity';
import { CounterpartyService } from '../../counterparty/services/counterparty.service';
import { ExchangeRateService } from '../../currency/services/exchange-rate.service';
import { VatCalculatorService } from '../../transaction/services/vat-calculator.service';
import { CreateInvoiceDto, UpdateInvoiceDto } from '../dto/invoice.dto';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    private readonly counterpartyService: CounterpartyService,
    private readonly exchangeRateService: ExchangeRateService,
    private readonly vatCalculatorService: VatCalculatorService,
  ) {}

  /**
   * Create a new invoice
   */
  async create(dto: CreateInvoiceDto, userId?: string): Promise<Invoice> {
    this.logger.log(`Creating invoice: ${dto.invoiceNumber}`);

    // Check if invoice number already exists
    const existing = await this.invoiceRepository.findOne({
      where: { invoiceNumber: dto.invoiceNumber },
    });

    if (existing) {
      throw new BadRequestException(`Invoice number ${dto.invoiceNumber} already exists`);
    }

    // Get counterparty
    const counterparty = await this.counterpartyService.findById(dto.counterpartyId);

    // Calculate line items and totals
    const { lineItems, totals, isReverseCharge, requiresSplitPayment } =
      await this.calculateInvoiceTotals(dto.lineItems, dto.currency, dto.issueDate, counterparty);

    // Get exchange rate if not PLN
    let exchangeRate = null;
    let exchangeRateDate = null;

    if (dto.currency.toUpperCase() !== 'PLN') {
      const rate = await this.exchangeRateService.getLastWorkingDayRate(
        dto.currency,
        new Date(dto.issueDate),
      );
      exchangeRate = Number(rate.midRate);
      exchangeRateDate = rate.rateDate;
    }

    // Calculate due date if not provided
    let dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (!dueDate && dto.paymentTermsDays) {
      dueDate = new Date(dto.issueDate);
      dueDate.setDate(dueDate.getDate() + dto.paymentTermsDays);
    }

    // Create invoice
    const invoice = this.invoiceRepository.create({
      invoiceNumber: dto.invoiceNumber,
      invoiceType: dto.invoiceType || 'standard',
      issueDate: new Date(dto.issueDate),
      saleDate: dto.saleDate ? new Date(dto.saleDate) : new Date(dto.issueDate),
      dueDate,
      paymentTermsDays: dto.paymentTermsDays || null,
      sellerName: dto.sellerName,
      sellerNip: dto.sellerNip,
      sellerAddress: dto.sellerAddress,
      counterpartyId: counterparty.id,
      buyerName: counterparty.name,
      buyerNip: counterparty.nip,
      buyerAddress: this.formatAddress(counterparty),
      currency: dto.currency.toUpperCase(),
      exchangeRate,
      exchangeRateDate,
      netAmount: totals.netAmount,
      vatAmount: totals.vatAmount,
      grossAmount: totals.grossAmount,
      netAmountPln: totals.netAmountPln,
      vatAmountPln: totals.vatAmountPln,
      grossAmountPln: totals.grossAmountPln,
      lineItems,
      isReverseCharge,
      requiresSplitPayment,
      paymentMethod: dto.paymentMethod,
      notes: dto.notes,
      internalNotes: dto.internalNotes,
      status: 'draft',
      createdBy: userId || null,
    });

    return this.invoiceRepository.save(invoice);
  }

  /**
   * Calculate invoice totals from line items
   */
  private async calculateInvoiceTotals(
    lineItems: any[],
    currency: string,
    issueDate: string,
    counterparty: any,
  ): Promise<{
    lineItems: any[];
    totals: any;
    isReverseCharge: boolean;
    requiresSplitPayment: boolean;
  }> {
    let netAmount = 0;
    let vatAmount = 0;
    let grossAmount = 0;
    let netAmountPln = 0;
    let vatAmountPln = 0;
    let grossAmountPln = 0;

    const processedLineItems = [];
    let isReverseCharge = false;

    for (const item of lineItems) {
      const itemNetAmount = item.quantity * item.unitPrice;

      // Calculate VAT for this line item
      const vatCalc = this.vatCalculatorService.calculate({
        amount: itemNetAmount,
        amountType: 'net',
        transactionType: 'sale',
        vatRateType: item.vatRateType || 'standard',
        isEuTransaction: counterparty.isEuEntity,
        counterpartyCountry: counterparty.country,
        counterpartyVatRegistered: counterparty.isVatRegistered,
      });

      if (vatCalc.isReverseCharge) {
        isReverseCharge = true;
      }

      processedLineItems.push({
        description: item.description,
        quantity: item.quantity,
        unit: item.unit || 'szt',
        unitPrice: item.unitPrice,
        netAmount: vatCalc.netAmount,
        vatRate: vatCalc.vatRate,
        vatAmount: vatCalc.vatAmount,
        grossAmount: vatCalc.grossAmount,
      });

      netAmount += vatCalc.netAmount;
      vatAmount += vatCalc.vatAmount;
      grossAmount += vatCalc.grossAmount;
    }

    // Convert to PLN if needed
    if (currency.toUpperCase() !== 'PLN') {
      const conversion = await this.exchangeRateService.convertToPln(
        netAmount,
        currency,
        new Date(issueDate),
        true,
      );
      netAmountPln = conversion.convertedAmount;

      // VAT must be in PLN per Polish regulations
      const vatConversion = await this.exchangeRateService.convertToPln(
        vatAmount,
        currency,
        new Date(issueDate),
        true,
      );
      vatAmountPln = vatConversion.convertedAmount;
      grossAmountPln = netAmountPln + vatAmountPln;
    } else {
      netAmountPln = netAmount;
      vatAmountPln = vatAmount;
      grossAmountPln = grossAmount;
    }

    // Check split payment requirement
    const requiresSplitPayment = grossAmountPln > 15000;

    return {
      lineItems: processedLineItems,
      totals: {
        netAmount: Number(netAmount.toFixed(2)),
        vatAmount: Number(vatAmount.toFixed(2)),
        grossAmount: Number(grossAmount.toFixed(2)),
        netAmountPln: Number(netAmountPln.toFixed(2)),
        vatAmountPln: Number(vatAmountPln.toFixed(2)),
        grossAmountPln: Number(grossAmountPln.toFixed(2)),
      },
      isReverseCharge,
      requiresSplitPayment,
    };
  }

  /**
   * Format counterparty address
   */
  private formatAddress(counterparty: any): string {
    const parts = [counterparty.street, counterparty.postalCode, counterparty.city, counterparty.country];
    return parts.filter(Boolean).join(', ');
  }

  /**
   * Find invoice by ID
   */
  async findById(id: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: ['counterparty'],
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    return invoice;
  }

  /**
   * Find invoice by number
   */
  async findByNumber(invoiceNumber: string): Promise<Invoice | null> {
    return this.invoiceRepository.findOne({
      where: { invoiceNumber },
      relations: ['counterparty'],
    });
  }

  /**
   * Get all invoices with filtering
   */
  async findAll(filters?: {
    status?: string;
    startDate?: string;
    endDate?: string;
    counterpartyId?: string;
    invoiceType?: string;
  }): Promise<Invoice[]> {
    const query = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.counterparty', 'counterparty');

    if (filters?.status) {
      query.andWhere('invoice.status = :status', { status: filters.status });
    }

    if (filters?.startDate && filters?.endDate) {
      query.andWhere('invoice.issueDate BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    if (filters?.counterpartyId) {
      query.andWhere('invoice.counterpartyId = :counterpartyId', {
        counterpartyId: filters.counterpartyId,
      });
    }

    if (filters?.invoiceType) {
      query.andWhere('invoice.invoiceType = :invoiceType', {
        invoiceType: filters.invoiceType,
      });
    }

    query.orderBy('invoice.issueDate', 'DESC');

    return query.getMany();
  }

  /**
   * Update invoice
   */
  async update(id: string, dto: UpdateInvoiceDto, userId?: string): Promise<Invoice> {
    const invoice = await this.findById(id);

    if (invoice.status !== 'draft') {
      throw new BadRequestException('Only draft invoices can be updated');
    }

    Object.assign(invoice, {
      ...dto,
      updatedBy: userId,
    });

    return this.invoiceRepository.save(invoice);
  }

  /**
   * Issue invoice (change status from draft to issued)
   */
  async issue(id: string, userId?: string): Promise<Invoice> {
    const invoice = await this.findById(id);

    if (invoice.status !== 'draft') {
      throw new BadRequestException('Only draft invoices can be issued');
    }

    invoice.status = 'issued';
    invoice.updatedBy = userId || null;

    return this.invoiceRepository.save(invoice);
  }

  /**
   * Cancel invoice
   */
  async cancel(id: string, reason: string, userId?: string): Promise<Invoice> {
    const invoice = await this.findById(id);

    if (invoice.status === 'cancelled') {
      throw new BadRequestException('Invoice is already cancelled');
    }

    invoice.status = 'cancelled';
    invoice.cancelledAt = new Date();
    invoice.cancellationReason = reason;
    invoice.updatedBy = userId || null;

    return this.invoiceRepository.save(invoice);
  }

  /**
   * Record payment
   */
  async recordPayment(
    id: string,
    amount: number,
    paymentDate: Date,
    userId?: string,
  ): Promise<Invoice> {
    const invoice = await this.findById(id);

    const newPaidAmount = Number(invoice.paidAmount) + amount;

    if (newPaidAmount > Number(invoice.grossAmountPln)) {
      throw new BadRequestException('Payment amount exceeds invoice total');
    }

    invoice.paidAmount = newPaidAmount;

    if (newPaidAmount >= Number(invoice.grossAmountPln)) {
      invoice.paymentStatus = 'paid';
      invoice.paidAt = paymentDate;
    } else if (newPaidAmount > 0) {
      invoice.paymentStatus = 'partially_paid';
    }

    invoice.updatedBy = userId || null;

    return this.invoiceRepository.save(invoice);
  }

  /**
   * Delete invoice (only drafts)
   */
  async delete(id: string): Promise<void> {
    const invoice = await this.findById(id);

    if (invoice.status !== 'draft') {
      throw new BadRequestException('Only draft invoices can be deleted');
    }

    await this.invoiceRepository.remove(invoice);
  }
}
