import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CitReport } from '../entities/cit-report.entity';
import { TransactionService } from '../../transaction/services/transaction.service';

@Injectable()
export class CitReportService {
  private readonly logger = new Logger(CitReportService.name);

  // Tax thresholds
  private readonly SMALL_TAXPAYER_THRESHOLD_EUR = 2000000; // EUR 2M
  private readonly EUR_TO_PLN_RATE = 4.5; // Approximate, should use actual rate
  private readonly SMALL_TAXPAYER_RATE = 9.0;
  private readonly STANDARD_RATE = 19.0;
  private readonly MINIMUM_TAX_RATE = 0.02; // 2% of revenue

  constructor(
    @InjectRepository(CitReport)
    private readonly citReportRepository: Repository<CitReport>,
    private readonly transactionService: TransactionService,
  ) {}

  /**
   * Generate CIT report for a tax year
   */
  async generateReport(taxYear: number, userId?: string): Promise<CitReport> {
    this.logger.log(`Generating CIT report for tax year ${taxYear}`);

    // Check if report already exists
    const existing = await this.citReportRepository.findOne({
      where: { taxYear },
    });

    if (existing && existing.status !== 'draft') {
      throw new BadRequestException(
        `CIT report for ${taxYear} already exists and is ${existing.status}`,
      );
    }

    // Get all transactions for the year
    const startDate = `${taxYear}-01-01`;
    const endDate = `${taxYear}-12-31`;

    const transactions = await this.transactionService.findAll({
      startDate,
      endDate,
    });

    // Calculate report data
    const reportData = this.calculateCitData(transactions, taxYear);

    // Create or update report
    const report = existing
      ? Object.assign(existing, reportData)
      : this.citReportRepository.create({
          taxYear,
          ...reportData,
          status: 'draft',
          createdBy: userId || null,
        });

    return this.citReportRepository.save(report);
  }

  /**
   * Calculate CIT data from transactions
   */
  private calculateCitData(transactions: any[], taxYear: number): Partial<CitReport> {
    let totalRevenue = 0;
    let totalCosts = 0;

    for (const transaction of transactions) {
      const amount = Number(transaction.plnAmount);

      if (transaction.transactionType === 'sale') {
        totalRevenue += amount;
      } else if (
        (transaction.transactionType === 'purchase' || transaction.transactionType === 'expense') &&
        transaction.isTaxDeductible
      ) {
        // Apply deduction percentage
        const deductionRate = Number(transaction.deductionPercentage || 100) / 100;
        totalCosts += amount * deductionRate;
      }
    }

    // Calculate taxable income
    const taxableIncome = totalRevenue - totalCosts;

    // Determine tax rate (small taxpayer vs standard)
    const smallTaxpayerThresholdPln = this.SMALL_TAXPAYER_THRESHOLD_EUR * this.EUR_TO_PLN_RATE;
    const isSmallTaxpayer = totalRevenue < smallTaxpayerThresholdPln;
    const taxRate = isSmallTaxpayer ? this.SMALL_TAXPAYER_RATE : this.STANDARD_RATE;

    // Calculate CIT amount
    let citAmount = 0;
    if (taxableIncome > 0) {
      citAmount = taxableIncome * (taxRate / 100);
    }

    // Calculate minimum tax (applies if loss or low income)
    const minimumTaxApplicable = taxableIncome <= totalRevenue * this.MINIMUM_TAX_RATE;
    let minimumTaxAmount = null;

    if (minimumTaxApplicable && totalRevenue > 0) {
      // Minimum tax is complex - simplified calculation
      // Real calculation involves multiple factors
      minimumTaxAmount = totalRevenue * 0.01; // 1% of revenue (simplified)
    }

    // Tax due (CIT or minimum tax, whichever is higher)
    const taxDue = minimumTaxApplicable && minimumTaxAmount
      ? Math.max(citAmount, minimumTaxAmount)
      : citAmount;

    this.logger.log(`CIT calculation for ${taxYear}: Revenue=${totalRevenue}, Costs=${totalCosts}, Taxable=${taxableIncome}, Rate=${taxRate}%, CIT=${citAmount}`);

    return {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      taxDeductibleCosts: Number(totalCosts.toFixed(2)),
      taxableIncome: Number(taxableIncome.toFixed(2)),
      taxRate,
      citAmount: Number(citAmount.toFixed(2)),
      advancePaymentsMade: 0, // Would need to be tracked separately
      taxDue: Number(taxDue.toFixed(2)),
      minimumTaxApplicable,
      minimumTaxAmount: minimumTaxAmount ? Number(minimumTaxAmount.toFixed(2)) : null,
    };
  }

  /**
   * Record advance payment
   */
  async recordAdvancePayment(id: string, amount: number): Promise<CitReport> {
    const report = await this.findById(id);

    const newAdvancePayments = Number(report.advancePaymentsMade) + amount;
    report.advancePaymentsMade = newAdvancePayments;

    // Recalculate tax due
    report.taxDue = Number(report.citAmount) - newAdvancePayments;

    return this.citReportRepository.save(report);
  }

  /**
   * Finalize report
   */
  async finalizeReport(id: string, userId?: string): Promise<CitReport> {
    const report = await this.findById(id);

    if (report.status !== 'draft') {
      throw new BadRequestException(`Report is already ${report.status}`);
    }

    report.status = 'finalized';
    report.finalizedAt = new Date();

    return this.citReportRepository.save(report);
  }

  /**
   * Generate JPK_CIT XML (for large companies)
   */
  async generateJpkCit(id: string): Promise<CitReport> {
    const report = await this.findById(id);

    if (report.status === 'draft') {
      throw new BadRequestException('Report must be finalized before generating JPK_CIT');
    }

    // Generate XML (stub - real implementation would use proper XML library)
    const xml = this.generateJpkCitXml(report);

    report.jpkCitXml = xml;
    report.jpkCitFilename = `JPK_CIT_${report.taxYear}.xml`;
    report.jpkCitGeneratedAt = new Date();

    return this.citReportRepository.save(report);
  }

  /**
   * Generate JPK_CIT XML (stub implementation)
   */
  private generateJpkCitXml(report: CitReport): string {
    // This is a simplified stub. Real implementation would follow JPK_CIT schema
    return `<?xml version="1.0" encoding="UTF-8"?>
<JPK_CIT xmlns="http://cit.mf.gov.pl/">
  <Naglowek>
    <KodFormularza>JPK_CIT</KodFormularza>
    <RokPodatkowy>${report.taxYear}</RokPodatkowy>
    <DataWytworzeniaJPK>${new Date().toISOString()}</DataWytworzeniaJPK>
  </Naglowek>
  <Deklaracja>
    <Przychody>${report.totalRevenue.toFixed(2)}</Przychody>
    <KosztyUzyskaniaPrzychodu>${report.taxDeductibleCosts.toFixed(2)}</KosztyUzyskaniaPrzychodu>
    <DochodDoOpodatkowania>${report.taxableIncome.toFixed(2)}</DochodDoOpodatkowania>
    <StawkaPodatku>${report.taxRate}</StawkaPodatku>
    <PodatekNalezny>${report.citAmount.toFixed(2)}</PodatekNalezny>
    <ZaliczkaWplacona>${report.advancePaymentsMade.toFixed(2)}</ZaliczkaWplacona>
    <PodatekDoZaplaty>${report.taxDue.toFixed(2)}</PodatekDoZaplaty>
  </Deklaracja>
</JPK_CIT>`;
  }

  /**
   * Find report by ID
   */
  async findById(id: string): Promise<CitReport> {
    const report = await this.citReportRepository.findOne({ where: { id } });

    if (!report) {
      throw new NotFoundException(`CIT report with ID ${id} not found`);
    }

    return report;
  }

  /**
   * Find report by tax year
   */
  async findByYear(taxYear: number): Promise<CitReport | null> {
    return this.citReportRepository.findOne({ where: { taxYear } });
  }

  /**
   * Get all reports
   */
  async findAll(): Promise<CitReport[]> {
    return this.citReportRepository.find({
      order: { taxYear: 'DESC' },
    });
  }

  /**
   * Delete report (only drafts)
   */
  async delete(id: string): Promise<void> {
    const report = await this.findById(id);

    if (report.status !== 'draft') {
      throw new BadRequestException('Only draft reports can be deleted');
    }

    await this.citReportRepository.remove(report);
  }

  /**
   * Get CIT analysis summary
   */
  async getAnalysis(taxYear: number): Promise<{
    taxYear: number;
    revenue: number;
    costs: number;
    profitMargin: number;
    effectiveTaxRate: number;
    smallTaxpayerEligible: boolean;
    savingsIfSmallTaxpayer: number;
  }> {
    const report = await this.findByYear(taxYear);

    if (!report) {
      throw new NotFoundException(`No CIT report found for year ${taxYear}`);
    }

    const profitMargin = report.totalRevenue > 0
      ? (Number(report.taxableIncome) / Number(report.totalRevenue)) * 100
      : 0;

    const effectiveTaxRate = report.totalRevenue > 0
      ? (Number(report.citAmount) / Number(report.totalRevenue)) * 100
      : 0;

    const smallTaxpayerThresholdPln = this.SMALL_TAXPAYER_THRESHOLD_EUR * this.EUR_TO_PLN_RATE;
    const smallTaxpayerEligible = Number(report.totalRevenue) < smallTaxpayerThresholdPln;

    // Calculate savings if using small taxpayer rate
    const standardTax = Number(report.taxableIncome) * (this.STANDARD_RATE / 100);
    const smallTax = Number(report.taxableIncome) * (this.SMALL_TAXPAYER_RATE / 100);
    const savingsIfSmallTaxpayer = smallTaxpayerEligible ? standardTax - smallTax : 0;

    return {
      taxYear,
      revenue: Number(report.totalRevenue),
      costs: Number(report.taxDeductibleCosts),
      profitMargin: Number(profitMargin.toFixed(2)),
      effectiveTaxRate: Number(effectiveTaxRate.toFixed(2)),
      smallTaxpayerEligible,
      savingsIfSmallTaxpayer: Number(savingsIfSmallTaxpayer.toFixed(2)),
    };
  }
}
