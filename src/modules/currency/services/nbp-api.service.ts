import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { NbpRateResponse, NbpTableListResponse } from '../interfaces/nbp-api.interface';

@Injectable()
export class NbpApiService {
  private readonly logger = new Logger(NbpApiService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly baseUrl: string;
  private readonly defaultTable: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('NBP_API_URL') || 'https://api.nbp.pl/api';
    this.defaultTable = this.configService.get<string>('NBP_DEFAULT_TABLE') || 'A';

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        Accept: 'application/json',
      },
    });

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        this.logger.error(`NBP API error: ${error.message}`, error.stack);
        throw new HttpException(
          {
            statusCode: error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Failed to fetch data from NBP API',
            error: error.message,
          },
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      },
    );
  }

  /**
   * Get current exchange rate for a specific currency
   */
  async getCurrentRate(currencyCode: string, table: string = this.defaultTable): Promise<NbpRateResponse> {
    this.logger.log(`Fetching current rate for ${currencyCode} from table ${table}`);

    try {
      const response = await this.axiosInstance.get<NbpRateResponse>(
        `/exchangerates/rates/${table.toLowerCase()}/${currencyCode.toLowerCase()}/today/`,
      );
      return response.data;
    } catch (error) {
      // If today's rate is not available (e.g., weekend/holiday), get last available
      this.logger.warn(`Today's rate not available for ${currencyCode}, fetching last available`);
      return this.getLastAvailableRate(currencyCode, table);
    }
  }

  /**
   * Get last available exchange rate for a specific currency
   */
  async getLastAvailableRate(currencyCode: string, table: string = this.defaultTable): Promise<NbpRateResponse> {
    this.logger.log(`Fetching last available rate for ${currencyCode} from table ${table}`);

    const response = await this.axiosInstance.get<NbpRateResponse>(
      `/exchangerates/rates/${table.toLowerCase()}/${currencyCode.toLowerCase()}/last/1/`,
    );
    return response.data;
  }

  /**
   * Get historical exchange rate for a specific date
   */
  async getHistoricalRate(
    currencyCode: string,
    date: string,
    table: string = this.defaultTable,
  ): Promise<NbpRateResponse> {
    this.logger.log(`Fetching historical rate for ${currencyCode} on ${date} from table ${table}`);

    const response = await this.axiosInstance.get<NbpRateResponse>(
      `/exchangerates/rates/${table.toLowerCase()}/${currencyCode.toLowerCase()}/${date}/`,
    );
    return response.data;
  }

  /**
   * Get exchange rates for a date range
   */
  async getRateRange(
    currencyCode: string,
    startDate: string,
    endDate: string,
    table: string = this.defaultTable,
  ): Promise<NbpRateResponse> {
    this.logger.log(`Fetching rate range for ${currencyCode} from ${startDate} to ${endDate}`);

    const response = await this.axiosInstance.get<NbpRateResponse>(
      `/exchangerates/rates/${table.toLowerCase()}/${currencyCode.toLowerCase()}/${startDate}/${endDate}/`,
    );
    return response.data;
  }

  /**
   * Get last N rates for a currency
   */
  async getLastNRates(
    currencyCode: string,
    count: number,
    table: string = this.defaultTable,
  ): Promise<NbpRateResponse> {
    this.logger.log(`Fetching last ${count} rates for ${currencyCode}`);

    const response = await this.axiosInstance.get<NbpRateResponse>(
      `/exchangerates/rates/${table.toLowerCase()}/${currencyCode.toLowerCase()}/last/${count}/`,
    );
    return response.data;
  }

  /**
   * Get entire exchange rate table for a specific date
   */
  async getTableForDate(date: string, table: string = this.defaultTable): Promise<NbpTableListResponse> {
    this.logger.log(`Fetching table ${table} for date ${date}`);

    const response = await this.axiosInstance.get<NbpTableListResponse[]>(
      `/exchangerates/tables/${table.toLowerCase()}/${date}/`,
    );
    return response.data[0];
  }

  /**
   * Get current/today's exchange rate table
   */
  async getCurrentTable(table: string = this.defaultTable): Promise<NbpTableListResponse> {
    this.logger.log(`Fetching current table ${table}`);

    try {
      const response = await this.axiosInstance.get<NbpTableListResponse[]>(
        `/exchangerates/tables/${table.toLowerCase()}/today/`,
      );
      return response.data[0];
    } catch (error) {
      this.logger.warn(`Today's table not available, fetching last available`);
      return this.getLastAvailableTable(table);
    }
  }

  /**
   * Get last available exchange rate table
   */
  async getLastAvailableTable(table: string = this.defaultTable): Promise<NbpTableListResponse> {
    this.logger.log(`Fetching last available table ${table}`);

    const response = await this.axiosInstance.get<NbpTableListResponse[]>(
      `/exchangerates/tables/${table.toLowerCase()}/last/1/`,
    );
    return response.data[0];
  }

  /**
   * Find the last working day rate before a specific date
   * Useful for invoice date calculation per Polish tax regulations
   */
  async getLastWorkingDayRate(
    currencyCode: string,
    beforeDate: Date,
    table: string = this.defaultTable,
  ): Promise<NbpRateResponse> {
    const dateStr = this.formatDate(beforeDate);
    this.logger.log(`Fetching last working day rate for ${currencyCode} before ${dateStr}`);

    try {
      // Try to get the rate for the day before
      const previousDate = new Date(beforeDate);
      previousDate.setDate(previousDate.getDate() - 1);

      return await this.getHistoricalRate(currencyCode, this.formatDate(previousDate), table);
    } catch (error) {
      // If not available, get last available rate
      this.logger.warn(`Rate not available for previous day, fetching last available`);
      return this.getLastAvailableRate(currencyCode, table);
    }
  }

  /**
   * Helper method to format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Check NBP API availability
   */
  async checkAvailability(): Promise<boolean> {
    try {
      await this.axiosInstance.get('/exchangerates/tables/A/last/1/');
      return true;
    } catch (error) {
      this.logger.error('NBP API is not available', error);
      return false;
    }
  }
}
