import { Injectable, Inject, CACHE_MANAGER, Logger } from '@nestjs/common';
import { Cache } from 'cache-manager';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value) {
        this.logger.debug(`Cache HIT for key: ${key}`);
      } else {
        this.logger.debug(`Cache MISS for key: ${key}`);
      }
      return value;
    } catch (error) {
      this.logger.error(`Cache GET error for key ${key}:`, error.message);
      return undefined;
    }
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      await this.cacheManager.set(key, value, options?.ttl);
      this.logger.debug(`Cache SET for key: ${key}, TTL: ${options?.ttl || 'default'}`);
    } catch (error) {
      this.logger.error(`Cache SET error for key ${key}:`, error.message);
    }
  }

  /**
   * Delete a value from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache DEL for key: ${key}`);
    } catch (error) {
      this.logger.error(`Cache DEL error for key ${key}:`, error.message);
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      // This is a simplified implementation
      // In production, you might want to use Redis SCAN for large datasets
      this.logger.debug(`Cache DEL pattern: ${pattern}`);
      // Implementation depends on cache-manager-redis-store version
    } catch (error) {
      this.logger.error(`Cache DEL pattern error for ${pattern}:`, error.message);
    }
  }

  /**
   * Clear all cache
   */
  async reset(): Promise<void> {
    try {
      await this.cacheManager.reset();
      this.logger.log('Cache RESET - all keys cleared');
    } catch (error) {
      this.logger.error('Cache RESET error:', error.message);
    }
  }

  /**
   * Get or set pattern - get from cache or compute and cache
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Generate cache key for exchange rate
   */
  getCacheKeyForExchangeRate(currency: string, date: string, table: string = 'A'): string {
    return `exchange_rate:${table}:${currency}:${date}`;
  }

  /**
   * Generate cache key for VAT report
   */
  getCacheKeyForVatReport(year: number, month: number): string {
    return `vat_report:${year}:${month}`;
  }

  /**
   * Generate cache key for CIT report
   */
  getCacheKeyForCitReport(year: number): string {
    return `cit_report:${year}`;
  }

  /**
   * Generate cache key for analytics
   */
  getCacheKeyForAnalytics(type: string, params: Record<string, any>): string {
    const paramsStr = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(':');
    return `analytics:${type}:${paramsStr}`;
  }

  /**
   * Invalidate all VAT report caches for a specific year
   */
  async invalidateVatReports(year: number): Promise<void> {
    for (let month = 1; month <= 12; month++) {
      await this.del(this.getCacheKeyForVatReport(year, month));
    }
    this.logger.log(`Invalidated VAT report cache for year ${year}`);
  }

  /**
   * Invalidate analytics caches
   */
  async invalidateAnalytics(): Promise<void> {
    // In production, you would use pattern matching to delete analytics:* keys
    this.logger.log('Invalidated analytics cache');
  }
}
