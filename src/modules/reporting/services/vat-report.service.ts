import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { VatReport } from '../entities/vat-report.entity';
import { TransactionService } from '../../transaction/services/transaction.service';

@Injectable()
export class VatReportService {
  private readonly logger = new Logger(VatReportService.name);

  constructor(
    @InjectRepository(VatReport)
    private readonly vatReportRepository: Repository<VatReport>,
    private readonly transactionService: TransactionService,
  ) {}

  /**
   * Generate VAT report for a period
   */
  async generateReport(
    year: number,
    month: number,
    periodType: 'monthly' | 'quarterly' = 'monthly',
    userId?: string,
  ): Promise<VatReport> {
    this.logger.log(`Generating ${periodType} VAT report for ${year}-${month}`);

    // Calculate period dates
    const { startDate, endDate, reportingPeriod } = this.calculatePeriodDates(
      year,
      month,
      periodType,
    );

    // Check if report already exists
    const existing = await this.vatReportRepository.findOne({
      where: {
        reportingPeriod,
        periodType,
      },
    });

    if (existing && existing.status !== 'draft') {
      throw new BadRequestException(
        `VAT report for ${year}-${month} already exists and is ${existing.status}`,
      );
    }

    // Get transactions for the period
    const transactions = await this.transactionService.findAll({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    });

    // Calculate report data
    const reportData = this.calculateReportData(transactions);

    // Create or update report
    const report = existing
      ? Object.assign(existing, reportData)
      : this.vatReportRepository.create({
          reportingPeriod,
          periodType,
          ...reportData,
          status: 'draft',
          createdBy: userId || null,
        });

    return this.vatReportRepository.save(report);
  }

  /**
   * Calculate report data from transactions
   */
  private calculateReportData(transactions: any[]): Partial<VatReport> {
    let totalSalesNet = 0;
    let totalSalesVat = 0;
    let totalPurchasesNet = 0;
    let totalPurchasesVat = 0;

    const vatByRatesMap = new Map<
      number,
      { salesNet: number; salesVat: number; purchasesNet: number; purchasesVat: number }
    >();

    for (const transaction of transactions) {
      const netAmount = Number(transaction.plnAmount);
      const vatAmount = Number(transaction.vatAmountPln);
      const vatRate = Number(transaction.vatRate);

      if (transaction.transactionType === 'sale') {
        totalSalesNet += netAmount;
        totalSalesVat += vatAmount;

        const rateData = vatByRatesMap.get(vatRate) || {
          salesNet: 0,
          salesVat: 0,
          purchasesNet: 0,
          purchasesVat: 0,
        };
        rateData.salesNet += netAmount;
        rateData.salesVat += vatAmount;
        vatByRatesMap.set(vatRate, rateData);
      } else if (transaction.transactionType === 'purchase' || transaction.transactionType === 'expense') {
        totalPurchasesNet += netAmount;
        totalPurchasesVat += vatAmount;

        const rateData = vatByRatesMap.get(vatRate) || {
          salesNet: 0,
          salesVat: 0,
          purchasesNet: 0,
          purchasesVat: 0,
        };
        rateData.purchasesNet += netAmount;
        rateData.purchasesVat += vatAmount;
        vatByRatesMap.set(vatRate, rateData);
      }
    }

    const vatBalance = totalSalesVat - totalPurchasesVat;
    const vatPayable = vatBalance > 0 ? vatBalance : 0;
    const vatRefund = vatBalance < 0 ? Math.abs(vatBalance) : 0;

    const vatByRates = Array.from(vatByRatesMap.entries()).map(([rate, data]) => ({
      rate,
      ...data,
    }));

    return {
      totalSalesNet: Number(totalSalesNet.toFixed(2)),
      totalSalesVat: Number(totalSalesVat.toFixed(2)),
      totalSalesGross: Number((totalSalesNet + totalSalesVat).toFixed(2)),
      totalPurchasesNet: Number(totalPurchasesNet.toFixed(2)),
      totalPurchasesVat: Number(totalPurchasesVat.toFixed(2)),
      totalPurchasesGross: Number((totalPurchasesNet + totalPurchasesVat).toFixed(2)),
      vatPayable: Number(vatPayable.toFixed(2)),
      vatRefund: Number(vatRefund.toFixed(2)),
      vatByRates,
      transactionCount: transactions.length,
    };
  }

  /**
   * Calculate period dates
   */
  private calculatePeriodDates(
    year: number,
    month: number,
    periodType: 'monthly' | 'quarterly',
  ): { startDate: Date; endDate: Date; reportingPeriod: Date } {
    if (periodType === 'monthly') {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      return { startDate, endDate, reportingPeriod: startDate };
    } else {
      // Quarterly
      const quarter = Math.ceil(month / 3);
      const quarterStartMonth = (quarter - 1) * 3 + 1;
      const quarterEndMonth = quarter * 3;

      const startDate = new Date(year, quarterStartMonth - 1, 1);
      const endDate = new Date(year, quarterEndMonth, 0, 23, 59, 59);
      return { startDate, endDate, reportingPeriod: startDate };
    }
  }

  /**
   * Finalize report (lock it from further changes)
   */
  async finalizeReport(id: string, userId?: string): Promise<VatReport> {
    const report = await this.findById(id);

    if (report.status !== 'draft') {
      throw new BadRequestException(`Report is already ${report.status}`);
    }

    report.status = 'finalized';
    report.finalizedAt = new Date();
    report.finalizedBy = userId || null;

    return this.vatReportRepository.save(report);
  }

  /**
   * Generate JPK_VAT XML for report
   */
  async generateJpkVat(id: string): Promise<VatReport> {
    const report = await this.findById(id);

    if (report.status === 'draft') {
      throw new BadRequestException('Report must be finalized before generating JPK_VAT');
    }

    // Generate XML (simplified version - full implementation would require proper XML generation library)
    const xml = this.generateJpkVatXml(report);

    report.jpkVatXml = xml;
    report.jpkVatFilename = `JPK_VAT_${this.formatDate(report.reportingPeriod)}.xml`;
    report.jpkVatGeneratedAt = new Date();

    return this.vatReportRepository.save(report);
  }

  /**
   * Generate JPK_VAT XML (stub implementation)
   */
  private generateJpkVatXml(report: VatReport): string {
    const date = this.formatDate(report.reportingPeriod);

    // This is a simplified stub. Real implementation would use proper XML generation
    return `<?xml version="1.0" encoding="UTF-8"?>
<JPK xmlns="http://jpk.mf.gov.pl/wzor/2022/02/17/02171/">
  <Naglowek>
    <KodFormularza kodSystemowy="JPK_V7M" wersjaSchemy="1-2">JPK_VAT</KodFormularza>
    <WariantFormularza>2</WariantFormularza>
    <DataWytworzeniaJPK>${new Date().toISOString()}</DataWytworzeniaJPK>
    <NazwaSystemu>Polish B2B Tax Handler</NazwaSystemu>
  </Naglowek>
  <Podmiot1>
    <IdentyfikatorPodmiotu>
      <NIP><!-- Seller NIP --></NIP>
    </IdentyfikatorPodmiotu>
    <AdresPodmiotu>
      <KodKraju>PL</KodKraju>
    </AdresPodmiotu>
  </Podmiot1>
  <Deklaracja>
    <Naglowek>
      <KodFormularza>VAT-7</KodFormularza>
    </Naglowek>
    <PozycjeSzczegolowe>
      <P_10>${report.totalSalesNet.toFixed(2)}</P_10>
      <P_11>${report.totalSalesVat.toFixed(2)}</P_11>
      <P_50>${report.vatPayable.toFixed(2)}</P_50>
      <P_51>${report.vatRefund.toFixed(2)}</P_51>
    </PozycjeSzczegolowe>
  </Deklaracja>
</JPK>`;
  }

  /**
   * Find report by ID
   */
  async findById(id: string): Promise<VatReport> {
    const report = await this.vatReportRepository.findOne({ where: { id } });

    if (!report) {
      throw new NotFoundException(`VAT report with ID ${id} not found`);
    }

    return report;
  }

  /**
   * Get all reports
   */
  async findAll(filters?: {
    year?: number;
    periodType?: string;
    status?: string;
  }): Promise<VatReport[]> {
    const query = this.vatReportRepository.createQueryBuilder('report');

    if (filters?.year) {
      query.andWhere("EXTRACT(YEAR FROM report.reportingPeriod) = :year", {
        year: filters.year,
      });
    }

    if (filters?.periodType) {
      query.andWhere('report.periodType = :periodType', {
        periodType: filters.periodType,
      });
    }

    if (filters?.status) {
      query.andWhere('report.status = :status', { status: filters.status });
    }

    query.orderBy('report.reportingPeriod', 'DESC');

    return query.getMany();
  }

  /**
   * Delete report (only if draft)
   */
  async delete(id: string): Promise<void> {
    const report = await this.findById(id);

    if (report.status !== 'draft') {
      throw new BadRequestException('Only draft reports can be deleted');
    }

    await this.vatReportRepository.remove(report);
  }

  /**
   * Format date as YYYY-MM
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
}
