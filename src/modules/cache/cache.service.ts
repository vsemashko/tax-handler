import { Injectable, Logger } from '@nestjs/common';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly defaultTTL = 3600; // 1 hour in seconds

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const entry = this.cache.get(key);

      if (!entry) {
        this.logger.debug(`Cache MISS for key: ${key}`);
        return undefined;
      }

      // Check if expired
      if (Date.now() > entry.expiresAt) {
        this.cache.delete(key);
        this.logger.debug(`Cache MISS (expired) for key: ${key}`);
        return undefined;
      }

      this.logger.debug(`Cache HIT for key: ${key}`);
      return entry.value as T;
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
      const ttl = (options?.ttl || this.defaultTTL) * 1000; // Convert to milliseconds
      const expiresAt = Date.now() + ttl;

      this.cache.set(key, { value, expiresAt });
      this.logger.debug(`Cache SET for key: ${key}, TTL: ${options?.ttl || this.defaultTTL}s`);
    } catch (error) {
      this.logger.error(`Cache SET error for key ${key}:`, error.message);
    }
  }

  /**
   * Delete a value from cache
   */
  async del(key: string): Promise<void> {
    try {
      this.cache.delete(key);
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
      const regex = new RegExp(pattern);
      const keysToDelete = Array.from(this.cache.keys()).filter(key => regex.test(key));

      for (const key of keysToDelete) {
        this.cache.delete(key);
      }

      this.logger.debug(`Cache DEL pattern: ${pattern}, deleted ${keysToDelete.length} keys`);
    } catch (error) {
      this.logger.error(`Cache DEL pattern error for ${pattern}:`, error.message);
    }
  }

  /**
   * Clear all cache
   */
  async reset(): Promise<void> {
    try {
      this.cache.clear();
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
    await this.delPattern('^analytics:');
    this.logger.log('Invalidated analytics cache');
  }

  /**
   * Get cache size (for monitoring)
   */
  getSize(): number {
    return this.cache.size;
  }

  /**
   * Clean up expired entries
   */
  async cleanup(): Promise<void> {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cache cleanup: removed ${cleaned} expired entries`);
    }
  }
}
