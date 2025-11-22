import { Injectable, Logger } from '@nestjs/common';

export interface VatCalculationResult {
  netAmount: number;
  vatRate: number;
  vatAmount: number;
  grossAmount: number;
  isReverseCharge: boolean;
  requiresSplitPayment: boolean;
}

export interface VatCalculationInput {
  amount: number;
  amountType: 'net' | 'gross'; // Is the input amount net or gross?
  transactionType: 'sale' | 'purchase' | 'expense';
  vatRateType?: 'standard' | 'reduced_8' | 'reduced_5' | 'zero' | 'exempt';
  isEuTransaction?: boolean;
  counterpartyCountry?: string;
  counterpartyVatRegistered?: boolean;
  transactionCategory?: string;
}

@Injectable()
export class VatCalculatorService {
  private readonly logger = new Logger(VatCalculatorService.name);

  // Polish VAT rates
  private readonly VAT_RATES = {
    standard: 23.0,
    reduced_8: 8.0,
    reduced_5: 5.0,
    zero: 0.0,
    exempt: 0.0,
  };

  // Categories requiring 8% VAT
  private readonly REDUCED_8_CATEGORIES = [
    'hotel',
    'restaurant',
    'catering',
    'food_general',
    'newspaper',
  ];

  // Categories requiring 5% VAT
  private readonly REDUCED_5_CATEGORIES = ['book', 'food_basic'];

  // Threshold for split payment mechanism (in PLN)
  private readonly SPLIT_PAYMENT_THRESHOLD = 15000;

  /**
   * Calculate VAT for a transaction
   */
  calculate(input: VatCalculationInput): VatCalculationResult {
    this.logger.log(`Calculating VAT for ${input.transactionType} transaction`);

    // Determine VAT rate
    const vatRate = this.determineVatRate(input);

    // Check if reverse charge applies
    const isReverseCharge = this.checkReverseCharge(input);

    // Calculate amounts
    let netAmount: number;
    let grossAmount: number;
    let vatAmount: number;

    if (input.amountType === 'gross') {
      // Calculate from gross amount
      grossAmount = input.amount;
      netAmount = this.calculateNetFromGross(grossAmount, vatRate);
      vatAmount = grossAmount - netAmount;
    } else {
      // Calculate from net amount
      netAmount = input.amount;
      vatAmount = this.calculateVatFromNet(netAmount, vatRate);
      grossAmount = netAmount + vatAmount;
    }

    // Check if split payment is required
    const requiresSplitPayment = this.checkSplitPaymentRequired(grossAmount, input);

    return {
      netAmount: Number(netAmount.toFixed(2)),
      vatRate,
      vatAmount: Number(vatAmount.toFixed(2)),
      grossAmount: Number(grossAmount.toFixed(2)),
      isReverseCharge,
      requiresSplitPayment,
    };
  }

  /**
   * Determine applicable VAT rate based on transaction details
   */
  private determineVatRate(input: VatCalculationInput): number {
    // If rate type is explicitly provided, use it
    if (input.vatRateType) {
      return this.VAT_RATES[input.vatRateType];
    }

    // EU intra-community transactions (B2B) - typically reverse charge (0% initially)
    if (
      input.isEuTransaction &&
      input.counterpartyCountry !== 'PL' &&
      input.counterpartyVatRegistered
    ) {
      return 0.0; // Reverse charge will apply
    }

    // Check category-based rates
    if (input.transactionCategory) {
      if (this.REDUCED_8_CATEGORIES.includes(input.transactionCategory)) {
        return this.VAT_RATES.reduced_8;
      }
      if (this.REDUCED_5_CATEGORIES.includes(input.transactionCategory)) {
        return this.VAT_RATES.reduced_5;
      }
    }

    // Default to standard rate
    return this.VAT_RATES.standard;
  }

  /**
   * Check if reverse charge mechanism applies
   */
  private checkReverseCharge(input: VatCalculationInput): boolean {
    // Reverse charge applies to:
    // 1. EU intra-community B2B transactions
    if (
      input.isEuTransaction &&
      input.counterpartyCountry !== 'PL' &&
      input.counterpartyVatRegistered &&
      input.transactionType === 'purchase'
    ) {
      this.logger.log('Reverse charge applies: EU intra-community B2B purchase');
      return true;
    }

    // 2. Specific services (construction, electronic services, etc.)
    // This would require more detailed category checking
    // For now, we return false for other cases

    return false;
  }

  /**
   * Check if split payment mechanism is required
   */
  private checkSplitPaymentRequired(grossAmount: number, input: VatCalculationInput): boolean {
    // Split payment required for B2B transactions > 15,000 PLN
    // and for specific goods/services categories
    if (grossAmount > this.SPLIT_PAYMENT_THRESHOLD && input.transactionType === 'purchase') {
      this.logger.log(`Split payment required: amount ${grossAmount} PLN exceeds threshold`);
      return true;
    }

    return false;
  }

  /**
   * Calculate net amount from gross amount
   */
  private calculateNetFromGross(grossAmount: number, vatRate: number): number {
    return grossAmount / (1 + vatRate / 100);
  }

  /**
   * Calculate VAT amount from net amount
   */
  private calculateVatFromNet(netAmount: number, vatRate: number): number {
    return netAmount * (vatRate / 100);
  }

  /**
   * Calculate VAT for multiple rates (e.g., mixed basket)
   */
  calculateMultiRate(
    items: Array<{ amount: number; vatRateType: string }>,
  ): {
    totalNet: number;
    totalVat: number;
    totalGross: number;
    byRate: Record<string, { net: number; vat: number; gross: number }>;
  } {
    const byRate: Record<string, { net: number; vat: number; gross: number }> = {};
    let totalNet = 0;
    let totalVat = 0;
    let totalGross = 0;

    for (const item of items) {
      const vatRate = this.VAT_RATES[item.vatRateType] || this.VAT_RATES.standard;
      const vatAmount = this.calculateVatFromNet(item.amount, vatRate);
      const grossAmount = item.amount + vatAmount;

      if (!byRate[item.vatRateType]) {
        byRate[item.vatRateType] = { net: 0, vat: 0, gross: 0 };
      }

      byRate[item.vatRateType].net += item.amount;
      byRate[item.vatRateType].vat += vatAmount;
      byRate[item.vatRateType].gross += grossAmount;

      totalNet += item.amount;
      totalVat += vatAmount;
      totalGross += grossAmount;
    }

    return {
      totalNet: Number(totalNet.toFixed(2)),
      totalVat: Number(totalVat.toFixed(2)),
      totalGross: Number(totalGross.toFixed(2)),
      byRate,
    };
  }

  /**
   * Get available VAT rates
   */
  getAvailableRates() {
    return this.VAT_RATES;
  }
}
