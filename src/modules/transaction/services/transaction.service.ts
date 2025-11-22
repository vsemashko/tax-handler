import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { VatCalculatorService } from './vat-calculator.service';
import { ExchangeRateService } from '../../currency/services/exchange-rate.service';
import { CounterpartyService } from '../../counterparty/services/counterparty.service';
import { CreateTransactionDto, UpdateTransactionDto } from '../dto/transaction.dto';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly vatCalculatorService: VatCalculatorService,
    private readonly exchangeRateService: ExchangeRateService,
    private readonly counterpartyService: CounterpartyService,
  ) {}

  /**
   * Create a new transaction with automatic VAT calculation and currency conversion
   */
  async create(dto: CreateTransactionDto, userId?: string): Promise<Transaction> {
    this.logger.log(`Creating transaction: ${dto.transactionType}`);

    // Get counterparty if provided
    let counterparty = null;
    if (dto.counterpartyId) {
      counterparty = await this.counterpartyService.findById(dto.counterpartyId);
    }

    // Convert to PLN if necessary
    let plnAmount = dto.amount;
    let exchangeRateId = null;

    if (dto.currency.toUpperCase() !== 'PLN') {
      const conversion = await this.exchangeRateService.convertToPln(
        dto.amount,
        dto.currency,
        new Date(dto.transactionDate),
        true, // Use last working day rate per Polish regulations
      );
      plnAmount = conversion.convertedAmount;
      exchangeRateId = conversion.rate?.id || null;
    }

    // Calculate VAT
    const vatCalculation = this.vatCalculatorService.calculate({
      amount: dto.amountType === 'gross' ? dto.amount : plnAmount,
      amountType: dto.amountType || 'net',
      transactionType: dto.transactionType as any,
      vatRateType: dto.vatRateType,
      isEuTransaction: counterparty?.isEuEntity || false,
      counterpartyCountry: counterparty?.country || 'PL',
      counterpartyVatRegistered: counterparty?.isVatRegistered ?? true,
      transactionCategory: dto.taxCategory,
    });

    // Create transaction
    const transaction = this.transactionRepository.create({
      transactionDate: new Date(dto.transactionDate),
      transactionType: dto.transactionType,
      originalCurrency: dto.currency.toUpperCase(),
      originalAmount: dto.amount,
      plnAmount: dto.amountType === 'gross' ? vatCalculation.netAmount : plnAmount,
      exchangeRateId,
      vatRate: vatCalculation.vatRate,
      vatAmountPln: vatCalculation.vatAmount,
      isReverseCharge: vatCalculation.isReverseCharge,
      requiresSplitPayment: vatCalculation.requiresSplitPayment,
      invoiceNumber: dto.invoiceNumber,
      invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : null,
      counterpartyId: dto.counterpartyId || null,
      counterpartyNip: counterparty?.nip || dto.counterpartyNip || null,
      counterpartyName: counterparty?.name || dto.counterpartyName || null,
      paymentMethod: dto.paymentMethod,
      paymentStatus: dto.paymentStatus || 'pending',
      bankAccount: dto.bankAccount,
      taxCategory: dto.taxCategory,
      isTaxDeductible: dto.isTaxDeductible ?? true,
      deductionPercentage: dto.deductionPercentage || 100.0,
      description: dto.description,
      notes: dto.notes,
      tags: dto.tags || [],
      createdBy: userId || null,
    });

    const saved = await this.transactionRepository.save(transaction);
    this.logger.log(`Transaction created: ${saved.id}`);

    return this.findById(saved.id);
  }

  /**
   * Find transaction by ID
   */
  async findById(id: string): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id },
      relations: ['counterparty', 'exchangeRate'],
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    return transaction;
  }

  /**
   * Get all transactions with optional filtering
   */
  async findAll(filters?: {
    type?: string;
    startDate?: string;
    endDate?: string;
    counterpartyId?: string;
    paymentStatus?: string;
    minAmount?: number;
    maxAmount?: number;
  }): Promise<Transaction[]> {
    const where: FindOptionsWhere<Transaction> = {};

    if (filters?.type) {
      where.transactionType = filters.type;
    }

    if (filters?.startDate && filters?.endDate) {
      where.transactionDate = Between(new Date(filters.startDate), new Date(filters.endDate));
    }

    if (filters?.counterpartyId) {
      where.counterpartyId = filters.counterpartyId;
    }

    if (filters?.paymentStatus) {
      where.paymentStatus = filters.paymentStatus;
    }

    const query = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.counterparty', 'counterparty')
      .leftJoinAndSelect('transaction.exchangeRate', 'exchangeRate');

    if (Object.keys(where).length > 0) {
      query.where(where);
    }

    if (filters?.minAmount) {
      query.andWhere('transaction.plnAmount >= :minAmount', { minAmount: filters.minAmount });
    }

    if (filters?.maxAmount) {
      query.andWhere('transaction.plnAmount <= :maxAmount', { maxAmount: filters.maxAmount });
    }

    query.orderBy('transaction.transactionDate', 'DESC');

    return query.getMany();
  }

  /**
   * Update transaction
   */
  async update(id: string, dto: UpdateTransactionDto, userId?: string): Promise<Transaction> {
    const transaction = await this.findById(id);

    // Recalculate if amount or related fields change
    if (dto.amount || dto.currency || dto.vatRateType) {
      const amount = dto.amount || transaction.originalAmount;
      const currency = dto.currency || transaction.originalCurrency;

      // Convert to PLN
      let plnAmount = amount;
      let exchangeRateId = transaction.exchangeRateId;

      if (currency.toUpperCase() !== 'PLN') {
        const conversion = await this.exchangeRateService.convertToPln(
          amount,
          currency,
          new Date(dto.transactionDate || transaction.transactionDate),
          true,
        );
        plnAmount = conversion.convertedAmount;
        exchangeRateId = conversion.rate?.id || null;
      }

      // Recalculate VAT
      const counterparty = transaction.counterparty ||
        (transaction.counterpartyId ? await this.counterpartyService.findById(transaction.counterpartyId) : null);

      const vatCalculation = this.vatCalculatorService.calculate({
        amount: plnAmount,
        amountType: 'net',
        transactionType: (dto.transactionType || transaction.transactionType) as any,
        vatRateType: dto.vatRateType,
        isEuTransaction: counterparty?.isEuEntity || false,
        counterpartyCountry: counterparty?.country || 'PL',
        counterpartyVatRegistered: counterparty?.isVatRegistered ?? true,
      });

      Object.assign(transaction, {
        ...dto,
        plnAmount,
        exchangeRateId,
        vatRate: vatCalculation.vatRate,
        vatAmountPln: vatCalculation.vatAmount,
        isReverseCharge: vatCalculation.isReverseCharge,
        requiresSplitPayment: vatCalculation.requiresSplitPayment,
        updatedBy: userId,
      });
    } else {
      Object.assign(transaction, {
        ...dto,
        updatedBy: userId,
      });
    }

    return this.transactionRepository.save(transaction);
  }

  /**
   * Delete transaction
   */
  async delete(id: string): Promise<void> {
    const transaction = await this.findById(id);
    await this.transactionRepository.remove(transaction);
    this.logger.log(`Transaction deleted: ${id}`);
  }

  /**
   * Get transactions summary for a period
   */
  async getSummary(startDate: string, endDate: string): Promise<{
    totalSales: number;
    totalPurchases: number;
    totalVatCollected: number;
    totalVatPaid: number;
    vatBalance: number;
    transactionCount: number;
  }> {
    const transactions = await this.findAll({ startDate, endDate });

    const summary = transactions.reduce(
      (acc, transaction) => {
        if (transaction.transactionType === 'sale') {
          acc.totalSales += Number(transaction.plnAmount);
          acc.totalVatCollected += Number(transaction.vatAmountPln);
        } else if (transaction.transactionType === 'purchase' || transaction.transactionType === 'expense') {
          acc.totalPurchases += Number(transaction.plnAmount);
          acc.totalVatPaid += Number(transaction.vatAmountPln);
        }
        acc.transactionCount++;
        return acc;
      },
      {
        totalSales: 0,
        totalPurchases: 0,
        totalVatCollected: 0,
        totalVatPaid: 0,
        vatBalance: 0,
        transactionCount: 0,
      },
    );

    summary.vatBalance = summary.totalVatCollected - summary.totalVatPaid;

    return {
      totalSales: Number(summary.totalSales.toFixed(2)),
      totalPurchases: Number(summary.totalPurchases.toFixed(2)),
      totalVatCollected: Number(summary.totalVatCollected.toFixed(2)),
      totalVatPaid: Number(summary.totalVatPaid.toFixed(2)),
      vatBalance: Number(summary.vatBalance.toFixed(2)),
      transactionCount: summary.transactionCount,
    };
  }
}
