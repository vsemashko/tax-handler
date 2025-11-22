import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, Between } from 'typeorm';
import { ExchangeRate } from '../entities/exchange-rate.entity';
import { NbpApiService } from './nbp-api.service';

@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);

  constructor(
    @InjectRepository(ExchangeRate)
    private readonly exchangeRateRepository: Repository<ExchangeRate>,
    private readonly nbpApiService: NbpApiService,
  ) {}

  /**
   * Get current exchange rate (from cache/DB or fetch from NBP)
   */
  async getCurrentRate(currencyCode: string, table: string = 'A'): Promise<ExchangeRate> {
    const today = new Date().toISOString().split('T')[0];

    // Try to get from database first
    let rate = await this.exchangeRateRepository.findOne({
      where: {
        currencyCode: currencyCode.toUpperCase(),
        baseCurrency: 'PLN',
        rateDate: new Date(today),
        rateSource: 'NBP',
        tableType: table,
      },
    });

    if (!rate) {
      // Fetch from NBP and store
      this.logger.log(`Rate not in database, fetching from NBP for ${currencyCode}`);
      rate = await this.fetchAndStoreRate(currencyCode, table);
    }

    return rate;
  }

  /**
   * Get historical exchange rate for a specific date
   */
  async getHistoricalRate(
    currencyCode: string,
    date: Date,
    table: string = 'A',
  ): Promise<ExchangeRate> {
    const dateStr = date.toISOString().split('T')[0];

    // Try to get from database first
    let rate = await this.exchangeRateRepository.findOne({
      where: {
        currencyCode: currencyCode.toUpperCase(),
        baseCurrency: 'PLN',
        rateDate: new Date(dateStr),
        rateSource: 'NBP',
        tableType: table,
      },
    });

    if (!rate) {
      // Fetch from NBP and store
      this.logger.log(`Historical rate not in database, fetching from NBP for ${currencyCode} on ${dateStr}`);
      rate = await this.fetchAndStoreHistoricalRate(currencyCode, dateStr, table);
    }

    return rate;
  }

  /**
   * Get exchange rates for a date range
   */
  async getRateRange(
    currencyCode: string,
    startDate: Date,
    endDate: Date,
    table: string = 'A',
  ): Promise<ExchangeRate[]> {
    // Try to get from database first
    const rates = await this.exchangeRateRepository.find({
      where: {
        currencyCode: currencyCode.toUpperCase(),
        baseCurrency: 'PLN',
        rateDate: Between(startDate, endDate),
        rateSource: 'NBP',
        tableType: table,
      },
      order: {
        rateDate: 'ASC',
      },
    });

    // If we have all the rates in DB, return them
    // Otherwise, fetch from NBP (simplified - in production, check for gaps)
    if (rates.length > 0) {
      return rates;
    }

    // Fetch from NBP and store
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    return this.fetchAndStoreRateRange(currencyCode, startDateStr, endDateStr, table);
  }

  /**
   * Get the last available rate before a specific date (for Polish tax regulations)
   */
  async getLastWorkingDayRate(
    currencyCode: string,
    beforeDate: Date,
    table: string = 'A',
  ): Promise<ExchangeRate> {
    const dateStr = beforeDate.toISOString().split('T')[0];

    // Try to get from database first
    const rate = await this.exchangeRateRepository.findOne({
      where: {
        currencyCode: currencyCode.toUpperCase(),
        baseCurrency: 'PLN',
        rateDate: LessThanOrEqual(new Date(dateStr)),
        rateSource: 'NBP',
        tableType: table,
      },
      order: {
        rateDate: 'DESC',
      },
    });

    if (rate) {
      return rate;
    }

    // Fetch from NBP
    const nbpResponse = await this.nbpApiService.getLastWorkingDayRate(currencyCode, beforeDate, table);
    return this.storeRateFromNbpResponse(nbpResponse, table);
  }

  /**
   * Fetch current rate from NBP and store in database
   */
  private async fetchAndStoreRate(currencyCode: string, table: string): Promise<ExchangeRate> {
    const nbpResponse = await this.nbpApiService.getCurrentRate(currencyCode, table);
    return this.storeRateFromNbpResponse(nbpResponse, table);
  }

  /**
   * Fetch historical rate from NBP and store in database
   */
  private async fetchAndStoreHistoricalRate(
    currencyCode: string,
    date: string,
    table: string,
  ): Promise<ExchangeRate> {
    const nbpResponse = await this.nbpApiService.getHistoricalRate(currencyCode, date, table);
    return this.storeRateFromNbpResponse(nbpResponse, table);
  }

  /**
   * Fetch rate range from NBP and store in database
   */
  private async fetchAndStoreRateRange(
    currencyCode: string,
    startDate: string,
    endDate: string,
    table: string,
  ): Promise<ExchangeRate[]> {
    const nbpResponse = await this.nbpApiService.getRateRange(currencyCode, startDate, endDate, table);

    const rates: ExchangeRate[] = [];
    for (const nbpRate of nbpResponse.rates) {
      const rate = await this.storeRateFromNbpResponse(
        {
          ...nbpResponse,
          rates: [nbpRate],
        },
        table,
      );
      rates.push(rate);
    }

    return rates;
  }

  /**
   * Store rate from NBP response
   */
  private async storeRateFromNbpResponse(nbpResponse: any, table: string): Promise<ExchangeRate> {
    const nbpRate = nbpResponse.rates[0];

    const exchangeRate = this.exchangeRateRepository.create({
      currencyCode: nbpResponse.code.toUpperCase(),
      baseCurrency: 'PLN',
      rateDate: new Date(nbpRate.effectiveDate),
      rateSource: 'NBP',
      tableType: table,
      midRate: nbpRate.mid,
      bidRate: nbpRate.bid || null,
      askRate: nbpRate.ask || null,
      effectiveFrom: new Date(nbpRate.effectiveDate + 'T00:00:00Z'),
      effectiveTo: null, // Will be set when a new rate becomes available
      rawResponse: nbpResponse,
    });

    // Update effective_to for previous rate
    const previousRate = await this.exchangeRateRepository.findOne({
      where: {
        currencyCode: exchangeRate.currencyCode,
        baseCurrency: 'PLN',
        rateDate: LessThanOrEqual(exchangeRate.rateDate),
        rateSource: 'NBP',
        tableType: table,
        effectiveTo: null as any,
      },
      order: {
        rateDate: 'DESC',
      },
    });

    if (previousRate && previousRate.rateDate < exchangeRate.rateDate) {
      previousRate.effectiveTo = exchangeRate.effectiveFrom;
      await this.exchangeRateRepository.save(previousRate);
    }

    return this.exchangeRateRepository.save(exchangeRate);
  }

  /**
   * Convert amount from one currency to PLN
   */
  async convertToPln(
    amount: number,
    fromCurrency: string,
    transactionDate: Date,
    useRateBeforeDate: boolean = true,
  ): Promise<{ convertedAmount: number; rate: ExchangeRate }> {
    if (fromCurrency.toUpperCase() === 'PLN') {
      return {
        convertedAmount: amount,
        rate: null as any, // No conversion needed
      };
    }

    let rate: ExchangeRate;

    if (useRateBeforeDate) {
      // Per Polish tax regulations: use last working day before transaction date
      rate = await this.getLastWorkingDayRate(fromCurrency, transactionDate);
    } else {
      // Use rate for the transaction date
      rate = await this.getHistoricalRate(fromCurrency, transactionDate);
    }

    const convertedAmount = amount * Number(rate.midRate);

    return {
      convertedAmount: Number(convertedAmount.toFixed(2)),
      rate,
    };
  }

  /**
   * Sync latest rates from NBP for all currencies
   */
  async syncLatestRates(table: string = 'A'): Promise<void> {
    this.logger.log(`Syncing latest rates from NBP table ${table}`);

    try {
      const tableData = await this.nbpApiService.getCurrentTable(table);

      for (const rate of tableData.rates) {
        await this.storeRateFromNbpResponse(
          {
            table: tableData.table,
            no: tableData.no,
            effectiveDate: tableData.effectiveDate,
            code: rate.code,
            currency: rate.currency,
            rates: [
              {
                no: tableData.no,
                effectiveDate: tableData.effectiveDate,
                mid: rate.mid,
                bid: rate.bid,
                ask: rate.ask,
              },
            ],
          },
          table,
        );
      }

      this.logger.log(`Successfully synced rates for ${tableData.rates.length} currencies`);
    } catch (error) {
      this.logger.error(`Failed to sync rates: ${error.message}`, error.stack);
      throw error;
    }
  }
}
