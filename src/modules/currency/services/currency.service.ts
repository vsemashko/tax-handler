import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Currency } from '../entities/currency.entity';

@Injectable()
export class CurrencyService {
  constructor(
    @InjectRepository(Currency)
    private readonly currencyRepository: Repository<Currency>,
  ) {}

  /**
   * Get all active currencies
   */
  async getAllCurrencies(): Promise<Currency[]> {
    return this.currencyRepository.find({
      where: { isActive: true },
      order: { code: 'ASC' },
    });
  }

  /**
   * Get currency by code
   */
  async getCurrencyByCode(code: string): Promise<Currency | null> {
    return this.currencyRepository.findOne({
      where: { code: code.toUpperCase(), isActive: true },
    });
  }

  /**
   * Check if currency exists and is active
   */
  async isCurrencySupported(code: string): Promise<boolean> {
    const currency = await this.getCurrencyByCode(code);
    return currency !== null;
  }
}
