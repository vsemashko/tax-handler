import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import {
  PeriodQueryDto,
  TaxSummaryQueryDto,
  YearQueryDto,
  TopCounterpartiesQueryDto,
  DashboardQueryDto,
} from './dto/analytics.dto';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get comprehensive dashboard summary' })
  @ApiQuery({ name: 'year', type: Number, required: true, example: 2025 })
  @ApiQuery({ name: 'month', type: Number, required: false, example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Dashboard summary with financial, tax, and analytics data',
    schema: {
      type: 'object',
      properties: {
        financial: {
          type: 'object',
          properties: {
            period: { type: 'string', example: '2025-01-01 to 2025-12-31' },
            totalRevenue: { type: 'number', example: 5000000.00 },
            totalCosts: { type: 'number', example: 3500000.00 },
            profit: { type: 'number', example: 1500000.00 },
            profitMargin: { type: 'number', example: 30.00 },
            totalTransactions: { type: 'number', example: 250 },
            totalInvoices: { type: 'number', example: 180 },
          },
        },
        tax: {
          type: 'object',
          properties: {
            period: { type: 'string', example: '2025' },
            vatCollected: { type: 'number', example: 1150000.00 },
            vatPaid: { type: 'number', example: 805000.00 },
            vatDue: { type: 'number', example: 345000.00 },
            citAmount: { type: 'number', example: 285000.00 },
            totalTaxLiability: { type: 'number', example: 630000.00 },
          },
        },
        currencyExposure: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              currency: { type: 'string', example: 'EUR' },
              totalAmount: { type: 'number', example: 500000.00 },
              transactionCount: { type: 'number', example: 45 },
              percentageOfTotal: { type: 'number', example: 45.50 },
            },
          },
        },
        topCounterparties: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'uuid' },
              name: { type: 'string', example: 'Example Corp' },
              nip: { type: 'string', example: '1234567890' },
              totalTransactionValue: { type: 'number', example: 850000.00 },
              transactionCount: { type: 'number', example: 25 },
              type: { type: 'string', enum: ['customer', 'supplier'] },
            },
          },
        },
        upcomingObligations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['vat', 'cit', 'advance_payment'] },
              dueDate: { type: 'string', example: '2025-02-25' },
              amount: { type: 'number', example: 28750.00 },
              description: { type: 'string', example: 'VAT payment for 2025-01' },
              status: { type: 'string', enum: ['upcoming', 'overdue'] },
            },
          },
        },
      },
    },
  })
  async getDashboard(
    @Query('year') year: number,
    @Query('month') month?: number,
  ) {
    return this.analyticsService.getDashboardSummary(
      Number(year),
      month ? Number(month) : undefined,
    );
  }

  @Get('financial-overview')
  @ApiOperation({ summary: 'Get financial overview for a period' })
  @ApiQuery({ name: 'startDate', type: String, required: true, example: '2025-01-01' })
  @ApiQuery({ name: 'endDate', type: String, required: true, example: '2025-12-31' })
  @ApiResponse({
    status: 200,
    description: 'Financial overview',
    schema: {
      type: 'object',
      properties: {
        period: { type: 'string', example: '2025-01-01 to 2025-12-31' },
        totalRevenue: { type: 'number', example: 5000000.00 },
        totalCosts: { type: 'number', example: 3500000.00 },
        profit: { type: 'number', example: 1500000.00 },
        profitMargin: { type: 'number', example: 30.00 },
        totalTransactions: { type: 'number', example: 250 },
        totalInvoices: { type: 'number', example: 180 },
      },
    },
  })
  async getFinancialOverview(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.analyticsService.getFinancialOverview(startDate, endDate);
  }

  @Get('tax-summary')
  @ApiOperation({ summary: 'Get tax summary for a period' })
  @ApiQuery({ name: 'year', type: Number, required: true, example: 2025 })
  @ApiQuery({ name: 'month', type: Number, required: false, example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Tax summary',
    schema: {
      type: 'object',
      properties: {
        period: { type: 'string', example: '2025' },
        vatCollected: { type: 'number', example: 1150000.00 },
        vatPaid: { type: 'number', example: 805000.00 },
        vatDue: { type: 'number', example: 345000.00 },
        citAmount: { type: 'number', example: 285000.00 },
        totalTaxLiability: { type: 'number', example: 630000.00 },
      },
    },
  })
  async getTaxSummary(
    @Query('year') year: number,
    @Query('month') month?: number,
  ) {
    return this.analyticsService.getTaxSummary(
      Number(year),
      month ? Number(month) : undefined,
    );
  }

  @Get('monthly-trends')
  @ApiOperation({ summary: 'Get monthly trends for a year' })
  @ApiQuery({ name: 'year', type: Number, required: true, example: 2025 })
  @ApiResponse({
    status: 200,
    description: 'Monthly trends',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          month: { type: 'string', example: '2025-01' },
          revenue: { type: 'number', example: 416666.67 },
          costs: { type: 'number', example: 291666.67 },
          profit: { type: 'number', example: 125000.00 },
          vatDue: { type: 'number', example: 28750.00 },
        },
      },
    },
  })
  async getMonthlyTrends(@Query('year') year: number) {
    return this.analyticsService.getMonthlyTrends(Number(year));
  }

  @Get('currency-exposure')
  @ApiOperation({ summary: 'Get currency exposure analysis' })
  @ApiQuery({ name: 'startDate', type: String, required: true, example: '2025-01-01' })
  @ApiQuery({ name: 'endDate', type: String, required: true, example: '2025-12-31' })
  @ApiResponse({
    status: 200,
    description: 'Currency exposure analysis',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          currency: { type: 'string', example: 'EUR' },
          totalAmount: { type: 'number', example: 500000.00 },
          transactionCount: { type: 'number', example: 45 },
          percentageOfTotal: { type: 'number', example: 45.50 },
        },
      },
    },
  })
  async getCurrencyExposure(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.analyticsService.getCurrencyExposure(startDate, endDate);
  }

  @Get('top-counterparties')
  @ApiOperation({ summary: 'Get top counterparties by transaction volume' })
  @ApiQuery({ name: 'startDate', type: String, required: true, example: '2025-01-01' })
  @ApiQuery({ name: 'endDate', type: String, required: true, example: '2025-12-31' })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Top counterparties',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'uuid' },
          name: { type: 'string', example: 'Example Corp' },
          nip: { type: 'string', example: '1234567890' },
          totalTransactionValue: { type: 'number', example: 850000.00 },
          transactionCount: { type: 'number', example: 25 },
          type: { type: 'string', enum: ['customer', 'supplier'] },
        },
      },
    },
  })
  async getTopCounterparties(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('limit') limit?: number,
  ) {
    return this.analyticsService.getTopCounterparties(
      startDate,
      endDate,
      limit ? Number(limit) : 10,
    );
  }

  @Get('upcoming-obligations')
  @ApiOperation({ summary: 'Get upcoming tax obligations and deadlines' })
  @ApiResponse({
    status: 200,
    description: 'Upcoming tax obligations',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['vat', 'cit', 'advance_payment'] },
          dueDate: { type: 'string', example: '2025-02-25' },
          amount: { type: 'number', example: 28750.00 },
          description: { type: 'string', example: 'VAT payment for 2025-01' },
          status: { type: 'string', enum: ['upcoming', 'overdue'] },
        },
      },
    },
  })
  async getUpcomingObligations() {
    return this.analyticsService.getUpcomingObligations();
  }
}
