import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Transaction } from '../transaction/entities/transaction.entity';
import { VatReport } from '../reporting/entities/vat-report.entity';
import { CitReport } from '../reporting/entities/cit-report.entity';
import { Invoice } from '../invoice/entities/invoice.entity';
import { Counterparty } from '../counterparty/entities/counterparty.entity';

export interface FinancialOverview {
  period: string;
  totalRevenue: number;
  totalCosts: number;
  profit: number;
  profitMargin: number;
  totalTransactions: number;
  totalInvoices: number;
}

export interface TaxSummary {
  period: string;
  vatCollected: number;
  vatPaid: number;
  vatDue: number;
  citAmount: number;
  totalTaxLiability: number;
}

export interface MonthlyTrend {
  month: string;
  revenue: number;
  costs: number;
  profit: number;
  vatDue: number;
}

export interface CurrencyExposure {
  currency: string;
  totalAmount: number;
  transactionCount: number;
  percentageOfTotal: number;
}

export interface TopCounterparty {
  id: string;
  name: string;
  nip: string;
  totalTransactionValue: number;
  transactionCount: number;
  type: 'customer' | 'supplier';
}

export interface UpcomingObligation {
  type: 'vat' | 'cit' | 'advance_payment';
  dueDate: string;
  amount: number;
  description: string;
  status: 'upcoming' | 'overdue';
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(VatReport)
    private readonly vatReportRepository: Repository<VatReport>,
    @InjectRepository(CitReport)
    private readonly citReportRepository: Repository<CitReport>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Counterparty)
    private readonly counterpartyRepository: Repository<Counterparty>,
  ) {}

  /**
   * Get financial overview for a period
   */
  async getFinancialOverview(
    startDate: string,
    endDate: string,
  ): Promise<FinancialOverview> {
    this.logger.log(`Getting financial overview for ${startDate} to ${endDate}`);

    const transactions = await this.transactionRepository.find({
      where: {
        transactionDate: Between(new Date(startDate), new Date(endDate)),
      },
    });

    const invoices = await this.invoiceRepository.find({
      where: {
        issueDate: Between(new Date(startDate), new Date(endDate)),
      },
    });

    let totalRevenue = 0;
    let totalCosts = 0;

    for (const transaction of transactions) {
      const amount = Number(transaction.plnAmount);
      if (transaction.transactionType === 'sale') {
        totalRevenue += amount;
      } else if (['purchase', 'expense'].includes(transaction.transactionType)) {
        totalCosts += amount;
      }
    }

    const profit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    return {
      period: `${startDate} to ${endDate}`,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalCosts: Number(totalCosts.toFixed(2)),
      profit: Number(profit.toFixed(2)),
      profitMargin: Number(profitMargin.toFixed(2)),
      totalTransactions: transactions.length,
      totalInvoices: invoices.length,
    };
  }

  /**
   * Get tax summary for a period
   */
  async getTaxSummary(year: number, month?: number): Promise<TaxSummary> {
    this.logger.log(`Getting tax summary for ${year}${month ? `-${month}` : ''}`);

    let period = `${year}`;
    let vatWhere: any = { year };

    if (month) {
      period = `${year}-${month.toString().padStart(2, '0')}`;
      vatWhere = { year, month };
    }

    // Get VAT reports
    const vatReports = await this.vatReportRepository.find({
      where: vatWhere,
    });

    let vatCollected = 0;
    let vatPaid = 0;
    let vatDue = 0;

    for (const report of vatReports) {
      vatCollected += Number(report.outputVat || 0);
      vatPaid += Number(report.inputVat || 0);
      vatDue += Number(report.vatDue || 0);
    }

    // Get CIT data for the year
    let citAmount = 0;
    if (!month) {
      const citReport = await this.citReportRepository.findOne({
        where: { taxYear: year },
      });
      if (citReport) {
        citAmount = Number(citReport.citAmount || 0);
      }
    }

    const totalTaxLiability = vatDue + citAmount;

    return {
      period,
      vatCollected: Number(vatCollected.toFixed(2)),
      vatPaid: Number(vatPaid.toFixed(2)),
      vatDue: Number(vatDue.toFixed(2)),
      citAmount: Number(citAmount.toFixed(2)),
      totalTaxLiability: Number(totalTaxLiability.toFixed(2)),
    };
  }

  /**
   * Get monthly trends for a year
   */
  async getMonthlyTrends(year: number): Promise<MonthlyTrend[]> {
    this.logger.log(`Getting monthly trends for ${year}`);

    const trends: MonthlyTrend[] = [];

    for (let month = 1; month <= 12; month++) {
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      const transactions = await this.transactionRepository.find({
        where: {
          transactionDate: Between(new Date(startDate), new Date(endDate)),
        },
      });

      let revenue = 0;
      let costs = 0;

      for (const transaction of transactions) {
        const amount = Number(transaction.plnAmount);
        if (transaction.transactionType === 'sale') {
          revenue += amount;
        } else if (['purchase', 'expense'].includes(transaction.transactionType)) {
          costs += amount;
        }
      }

      // Get VAT due for the month
      const vatReport = await this.vatReportRepository.findOne({
        where: { year, month },
      });
      const vatDue = vatReport ? Number(vatReport.vatDue || 0) : 0;

      trends.push({
        month: `${year}-${month.toString().padStart(2, '0')}`,
        revenue: Number(revenue.toFixed(2)),
        costs: Number(costs.toFixed(2)),
        profit: Number((revenue - costs).toFixed(2)),
        vatDue: Number(vatDue.toFixed(2)),
      });
    }

    return trends;
  }

  /**
   * Get currency exposure analysis
   */
  async getCurrencyExposure(
    startDate: string,
    endDate: string,
  ): Promise<CurrencyExposure[]> {
    this.logger.log(`Getting currency exposure for ${startDate} to ${endDate}`);

    const transactions = await this.transactionRepository.find({
      where: {
        transactionDate: Between(new Date(startDate), new Date(endDate)),
      },
    });

    const currencyMap = new Map<string, { total: number; count: number }>();
    let grandTotal = 0;

    for (const transaction of transactions) {
      const currency = transaction.originalCurrency;
      const amount = Number(transaction.originalAmount);

      if (!currencyMap.has(currency)) {
        currencyMap.set(currency, { total: 0, count: 0 });
      }

      const data = currencyMap.get(currency)!;
      data.total += amount;
      data.count += 1;

      grandTotal += Number(transaction.plnAmount);
    }

    const exposures: CurrencyExposure[] = [];

    for (const [currency, data] of currencyMap.entries()) {
      const plnEquivalent = transactions
        .filter(t => t.originalCurrency === currency)
        .reduce((sum, t) => sum + Number(t.plnAmount), 0);

      exposures.push({
        currency,
        totalAmount: Number(data.total.toFixed(2)),
        transactionCount: data.count,
        percentageOfTotal: grandTotal > 0
          ? Number(((plnEquivalent / grandTotal) * 100).toFixed(2))
          : 0,
      });
    }

    // Sort by percentage descending
    return exposures.sort((a, b) => b.percentageOfTotal - a.percentageOfTotal);
  }

  /**
   * Get top counterparties by transaction volume
   */
  async getTopCounterparties(
    startDate: string,
    endDate: string,
    limit: number = 10,
  ): Promise<TopCounterparty[]> {
    this.logger.log(`Getting top ${limit} counterparties for ${startDate} to ${endDate}`);

    const transactions = await this.transactionRepository.find({
      where: {
        transactionDate: Between(new Date(startDate), new Date(endDate)),
      },
      relations: ['counterparty'],
    });

    const counterpartyMap = new Map<string, {
      counterparty: Counterparty;
      total: number;
      count: number;
      type: 'customer' | 'supplier';
    }>();

    for (const transaction of transactions) {
      if (!transaction.counterparty) continue;

      const id = transaction.counterparty.id;
      const amount = Number(transaction.plnAmount);
      const type = transaction.transactionType === 'sale' ? 'customer' : 'supplier';

      if (!counterpartyMap.has(id)) {
        counterpartyMap.set(id, {
          counterparty: transaction.counterparty,
          total: 0,
          count: 0,
          type,
        });
      }

      const data = counterpartyMap.get(id)!;
      data.total += amount;
      data.count += 1;
    }

    const topCounterparties: TopCounterparty[] = Array.from(counterpartyMap.values())
      .map(data => ({
        id: data.counterparty.id,
        name: data.counterparty.name,
        nip: data.counterparty.nip,
        totalTransactionValue: Number(data.total.toFixed(2)),
        transactionCount: data.count,
        type: data.type,
      }))
      .sort((a, b) => b.totalTransactionValue - a.totalTransactionValue)
      .slice(0, limit);

    return topCounterparties;
  }

  /**
   * Get upcoming tax obligations
   */
  async getUpcomingObligations(): Promise<UpcomingObligation[]> {
    this.logger.log('Getting upcoming tax obligations');

    const obligations: UpcomingObligation[] = [];
    const now = new Date();

    // Get VAT reports that need to be submitted
    const vatReports = await this.vatReportRepository.find({
      where: { status: 'finalized' },
      order: { year: 'DESC', month: 'DESC' },
      take: 6,
    });

    for (const report of vatReports) {
      // VAT is due by 25th of the following month
      const dueDate = new Date(report.year, report.month, 25);
      const status = dueDate < now ? 'overdue' : 'upcoming';

      obligations.push({
        type: 'vat',
        dueDate: dueDate.toISOString().split('T')[0],
        amount: Number(report.vatDue),
        description: `VAT payment for ${report.year}-${report.month.toString().padStart(2, '0')}`,
        status,
      });
    }

    // Get CIT reports
    const citReports = await this.citReportRepository.find({
      where: { status: 'finalized' },
      order: { taxYear: 'DESC' },
      take: 3,
    });

    for (const report of citReports) {
      // CIT annual declaration due by March 31st of following year
      const dueDate = new Date(report.taxYear + 1, 2, 31);
      const status = dueDate < now ? 'overdue' : 'upcoming';

      if (Number(report.taxDue) > 0) {
        obligations.push({
          type: 'cit',
          dueDate: dueDate.toISOString().split('T')[0],
          amount: Number(report.taxDue),
          description: `CIT annual payment for ${report.taxYear}`,
          status,
        });
      }

      // Monthly advance payments (simplified - assuming monthly)
      const monthlyAdvance = Number(report.citAmount) / 12;
      if (monthlyAdvance > 0) {
        for (let month = 1; month <= 12; month++) {
          const advanceDueDate = new Date(report.taxYear, month, 20);
          if (advanceDueDate > now) {
            obligations.push({
              type: 'advance_payment',
              dueDate: advanceDueDate.toISOString().split('T')[0],
              amount: Number(monthlyAdvance.toFixed(2)),
              description: `CIT advance payment for ${report.taxYear}-${month.toString().padStart(2, '0')}`,
              status: 'upcoming',
            });
          }
        }
      }
    }

    // Sort by due date
    return obligations.sort((a, b) =>
      new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
  }

  /**
   * Get dashboard summary - combines multiple metrics
   */
  async getDashboardSummary(year: number, month?: number) {
    const startDate = month
      ? `${year}-${month.toString().padStart(2, '0')}-01`
      : `${year}-01-01`;

    const endDate = month
      ? new Date(year, month, 0).toISOString().split('T')[0]
      : `${year}-12-31`;

    const [
      financial,
      tax,
      currencyExposure,
      topCounterparties,
      obligations,
    ] = await Promise.all([
      this.getFinancialOverview(startDate, endDate),
      this.getTaxSummary(year, month),
      this.getCurrencyExposure(startDate, endDate),
      this.getTopCounterparties(startDate, endDate, 5),
      this.getUpcomingObligations(),
    ]);

    return {
      financial,
      tax,
      currencyExposure,
      topCounterparties,
      upcomingObligations: obligations.slice(0, 10),
    };
  }
}
