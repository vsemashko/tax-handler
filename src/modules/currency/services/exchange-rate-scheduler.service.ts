import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ExchangeRateService } from './exchange-rate.service';

@Injectable()
export class ExchangeRateSchedulerService {
  private readonly logger = new Logger(ExchangeRateSchedulerService.name);

  constructor(
    private readonly exchangeRateService: ExchangeRateService,
  ) {}

  /**
   * Update exchange rates daily at 2:00 PM (NBP publishes rates around noon)
   */
  @Cron('0 14 * * 1-5', {
    name: 'update-daily-exchange-rates',
    timeZone: 'Europe/Warsaw',
  })
  async updateDailyExchangeRates() {
    this.logger.log('Starting scheduled update of daily exchange rates');

    try {
      const today = new Date().toISOString().split('T')[0];

      // Update rates for commonly used currencies
      const currencies = ['USD', 'EUR', 'GBP', 'CHF', 'CZK', 'SEK', 'NOK', 'DKK'];

      let successCount = 0;
      let errorCount = 0;

      for (const currency of currencies) {
        try {
          const rate = await this.exchangeRateService.getExchangeRate(currency, today);
          this.logger.log(`Updated ${currency}: ${rate}`);
          successCount++;
        } catch (error) {
          this.logger.warn(`Failed to update ${currency}: ${error.message}`);
          errorCount++;
        }
      }

      this.logger.log(
        `Daily exchange rate update completed. Success: ${successCount}, Errors: ${errorCount}`,
      );
    } catch (error) {
      this.logger.error('Error during scheduled exchange rate update', error.stack);
    }
  }

  /**
   * Clean up old exchange rate cache entries weekly
   * Runs every Sunday at 3:00 AM
   */
  @Cron('0 3 * * 0', {
    name: 'cleanup-exchange-rate-cache',
    timeZone: 'Europe/Warsaw',
  })
  async cleanupOldCacheEntries() {
    this.logger.log('Starting cleanup of old exchange rate cache entries');

    try {
      // This is a placeholder for cache cleanup logic
      // In a real implementation, you would:
      // 1. Remove cache entries older than X days
      // 2. Remove exchange rate records older than X years (if needed)

      this.logger.log('Cache cleanup completed');
    } catch (error) {
      this.logger.error('Error during cache cleanup', error.stack);
    }
  }

  /**
   * Pre-fetch next day's exchange rates (if available)
   * Runs every weekday at 5:00 PM
   */
  @Cron('0 17 * * 1-5', {
    name: 'prefetch-next-day-rates',
    timeZone: 'Europe/Warsaw',
  })
  async prefetchNextDayRates() {
    this.logger.log('Attempting to pre-fetch next day exchange rates');

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const currencies = ['USD', 'EUR', 'GBP', 'CHF'];
      let prefetchCount = 0;

      for (const currency of currencies) {
        try {
          await this.exchangeRateService.getExchangeRate(currency, tomorrowStr);
          prefetchCount++;
        } catch (error) {
          // Expected to fail if rates aren't published yet
          this.logger.debug(`Rates for ${currency} not available yet for ${tomorrowStr}`);
        }
      }

      if (prefetchCount > 0) {
        this.logger.log(`Pre-fetched rates for ${prefetchCount} currencies`);
      } else {
        this.logger.debug('No rates available for pre-fetching');
      }
    } catch (error) {
      this.logger.error('Error during rate pre-fetching', error.stack);
    }
  }

  /**
   * Health check for exchange rate service
   * Runs every hour to ensure the NBP API is accessible
   */
  @Cron(CronExpression.EVERY_HOUR, {
    name: 'exchange-rate-health-check',
  })
  async healthCheck() {
    try {
      // Try to fetch EUR rate for today to verify API connectivity
      const today = new Date().toISOString().split('T')[0];
      await this.exchangeRateService.getExchangeRate('EUR', today);
      this.logger.debug('Exchange rate service health check: OK');
    } catch (error) {
      this.logger.warn('Exchange rate service health check failed', error.message);
    }
  }

  /**
   * Update rates on-demand (can be called via API)
   */
  async manualUpdate(currencies?: string[]): Promise<{
    success: number;
    errors: number;
    details: { currency: string; status: 'success' | 'error'; message?: string }[];
  }> {
    this.logger.log('Manual exchange rate update triggered');

    const currenciesToUpdate = currencies || ['USD', 'EUR', 'GBP', 'CHF', 'CZK'];
    const today = new Date().toISOString().split('T')[0];

    const results = {
      success: 0,
      errors: 0,
      details: [] as { currency: string; status: 'success' | 'error'; message?: string }[],
    };

    for (const currency of currenciesToUpdate) {
      try {
        const rate = await this.exchangeRateService.getExchangeRate(currency, today);
        results.success++;
        results.details.push({
          currency,
          status: 'success',
          message: `Rate: ${rate}`,
        });
      } catch (error) {
        results.errors++;
        results.details.push({
          currency,
          status: 'error',
          message: error.message,
        });
      }
    }

    return results;
  }
}
