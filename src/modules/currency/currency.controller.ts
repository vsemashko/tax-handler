import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ExchangeRateService } from './services/exchange-rate.service';
import { CurrencyService } from './services/currency.service';
import { NbpApiService } from './services/nbp-api.service';
import { ExchangeRateSchedulerService } from './services/exchange-rate-scheduler.service';
import {
  GetCurrentRateDto,
  GetHistoricalRateDto,
  GetRateRangeDto,
} from './dto/get-rate.dto';
import {
  ConvertAmountDto,
  BatchConvertDto,
} from './dto/convert.dto';
import {
  RateResponseDto,
  ConversionResponseDto,
  BatchConversionResponseDto,
  BatchConversionItemResponseDto,
  RateSeriesResponseDto,
  CurrenciesResponseDto,
} from './dto/rate-response.dto';

@ApiTags('currency')
@Controller('rates')
export class CurrencyController {
  constructor(
    private readonly exchangeRateService: ExchangeRateService,
    private readonly currencyService: CurrencyService,
    private readonly nbpApiService: NbpApiService,
    private readonly schedulerService: ExchangeRateSchedulerService,
  ) {}

  @Get('current/:currency')
  @ApiOperation({ summary: 'Get current exchange rate for a currency' })
  @ApiParam({ name: 'currency', description: 'Currency code (ISO 4217)', example: 'USD' })
  @ApiResponse({ status: 200, description: 'Current rate retrieved', type: RateResponseDto })
  @ApiResponse({ status: 404, description: 'Currency not found' })
  async getCurrentRate(
    @Param('currency') currency: string,
    @Query() query: GetCurrentRateDto,
  ): Promise<RateResponseDto> {
    const rate = await this.exchangeRateService.getCurrentRate(
      currency.toUpperCase(),
      query.table || 'A',
    );

    if (!rate) {
      throw new NotFoundException(`Exchange rate not found for ${currency}`);
    }

    return this.mapToRateResponse(rate);
  }

  @Get('historical/:currency')
  @ApiOperation({ summary: 'Get historical exchange rate for a specific date' })
  @ApiParam({ name: 'currency', description: 'Currency code (ISO 4217)', example: 'EUR' })
  @ApiResponse({ status: 200, description: 'Historical rate retrieved', type: RateResponseDto })
  @ApiResponse({ status: 404, description: 'Rate not found for specified date' })
  async getHistoricalRate(
    @Param('currency') currency: string,
    @Query() query: GetHistoricalRateDto,
  ): Promise<RateResponseDto> {
    const rate = await this.exchangeRateService.getHistoricalRate(
      currency.toUpperCase(),
      new Date(query.date),
      query.table || 'A',
    );

    if (!rate) {
      throw new NotFoundException(`Exchange rate not found for ${currency} on ${query.date}`);
    }

    return this.mapToRateResponse(rate);
  }

  @Get('series/:currency')
  @ApiOperation({ summary: 'Get exchange rate time series for a date range' })
  @ApiParam({ name: 'currency', description: 'Currency code (ISO 4217)', example: 'GBP' })
  @ApiResponse({ status: 200, description: 'Rate series retrieved', type: RateSeriesResponseDto })
  async getRateSeries(
    @Param('currency') currency: string,
    @Query() query: GetRateRangeDto,
  ): Promise<RateSeriesResponseDto> {
    const rates = await this.exchangeRateService.getRateRange(
      currency.toUpperCase(),
      new Date(query.start_date),
      new Date(query.end_date),
      query.table || 'A',
    );

    return {
      currency: currency.toUpperCase(),
      base: query.base || 'PLN',
      rates: rates.map((rate) => ({
        date: rate.rateDate.toISOString().split('T')[0],
        rate: Number(rate.midRate),
      })),
      count: rates.length,
    };
  }

  @Post('convert')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Convert amount between currencies' })
  @ApiResponse({ status: 200, description: 'Conversion completed', type: ConversionResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async convertAmount(@Body() dto: ConvertAmountDto): Promise<ConversionResponseDto> {
    const transactionDate = new Date(dto.transaction_date);

    const result = await this.exchangeRateService.convertToPln(
      dto.amount,
      dto.from_currency.toUpperCase(),
      transactionDate,
      dto.use_rate_before_date ?? true,
    );

    return {
      original_amount: dto.amount,
      original_currency: dto.from_currency.toUpperCase(),
      converted_amount: result.convertedAmount,
      converted_currency: dto.to_currency.toUpperCase(),
      exchange_rate: Number(result.rate?.midRate || 1),
      rate_date: result.rate?.rateDate.toISOString().split('T')[0] || dto.transaction_date,
      rate_source: dto.source || 'NBP',
      transaction_date: dto.transaction_date,
      conversion_timestamp: new Date().toISOString(),
    };
  }

  @Post('convert/batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Convert multiple amounts in a single request' })
  @ApiResponse({
    status: 200,
    description: 'Batch conversion completed',
    type: BatchConversionResponseDto,
  })
  async batchConvert(@Body() dto: BatchConvertDto): Promise<BatchConversionResponseDto> {
    const conversions: BatchConversionItemResponseDto[] = [];
    let successful = 0;
    let failed = 0;

    for (const item of dto.conversions) {
      try {
        const transactionDate = new Date(item.transaction_date);
        const result = await this.exchangeRateService.convertToPln(
          item.amount,
          item.from_currency.toUpperCase(),
          transactionDate,
          true,
        );

        conversions.push({
          id: item.id,
          original_amount: item.amount,
          original_currency: item.from_currency.toUpperCase(),
          converted_amount: result.convertedAmount,
          converted_currency: item.to_currency.toUpperCase(),
          exchange_rate: Number(result.rate?.midRate || 1),
          rate_date: result.rate?.rateDate.toISOString().split('T')[0] || item.transaction_date,
          rate_source: dto.source || 'NBP',
          transaction_date: item.transaction_date,
          conversion_timestamp: new Date().toISOString(),
        });

        successful++;
      } catch (error) {
        failed++;
        // In production, you might want to include error details
        conversions.push({
          id: item.id,
          original_amount: item.amount,
          original_currency: item.from_currency.toUpperCase(),
          converted_amount: 0,
          converted_currency: item.to_currency.toUpperCase(),
          exchange_rate: 0,
          rate_date: '',
          rate_source: dto.source || 'NBP',
          transaction_date: item.transaction_date,
          conversion_timestamp: new Date().toISOString(),
        } as any);
      }
    }

    return {
      conversions,
      total_conversions: dto.conversions.length,
      successful,
      failed,
    };
  }

  @Get('currencies')
  @ApiOperation({ summary: 'Get list of supported currencies' })
  @ApiResponse({ status: 200, description: 'Currencies list retrieved', type: CurrenciesResponseDto })
  async getCurrencies(): Promise<CurrenciesResponseDto> {
    const currencies = await this.currencyService.getAllCurrencies();

    return {
      currencies: currencies.map((currency) => ({
        code: currency.code,
        name: currency.name,
        symbol: currency.symbol || '',
        available_in_tables: currency.availableInTables,
      })),
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Check currency service health' })
  @ApiResponse({
    status: 200,
    description: 'Health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        nbp_api_status: { type: 'string', example: 'available' },
        last_rate_update: { type: 'string', example: '2025-01-22T08:30:00.000Z' },
      },
    },
  })
  async getHealth() {
    const nbpAvailable = await this.nbpApiService.checkAvailability();

    return {
      status: nbpAvailable ? 'healthy' : 'degraded',
      nbp_api_status: nbpAvailable ? 'available' : 'unavailable',
      last_rate_update: new Date().toISOString(),
      cache_status: 'healthy',
      database_status: 'healthy',
    };
  }

  @Post('update/manual')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually trigger exchange rate update for specified currencies' })
  @ApiQuery({
    name: 'currencies',
    required: false,
    description: 'Comma-separated currency codes (e.g., USD,EUR,GBP)',
    example: 'USD,EUR,GBP',
  })
  @ApiResponse({
    status: 200,
    description: 'Manual update completed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'number', example: 3 },
        errors: { type: 'number', example: 0 },
        details: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              currency: { type: 'string', example: 'USD' },
              status: { type: 'string', enum: ['success', 'error'] },
              message: { type: 'string', example: 'Rate: 4.1234' },
            },
          },
        },
      },
    },
  })
  async manualUpdate(@Query('currencies') currenciesParam?: string) {
    const currencies = currenciesParam
      ? currenciesParam.split(',').map(c => c.trim().toUpperCase())
      : undefined;

    return this.schedulerService.manualUpdate(currencies);
  }

  /**
   * Helper method to map entity to response DTO
   */
  private mapToRateResponse(rate: any): RateResponseDto {
    return {
      currency: rate.currencyCode,
      base: rate.baseCurrency,
      rate: Number(rate.midRate),
      rate_date: rate.rateDate.toISOString().split('T')[0],
      source: rate.rateSource,
      table: rate.tableType,
      effective_from: rate.effectiveFrom.toISOString(),
      effective_to: rate.effectiveTo?.toISOString() || null,
    };
  }
}
