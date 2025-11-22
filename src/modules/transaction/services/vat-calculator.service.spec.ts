import { Test, TestingModule } from '@nestjs/testing';
import { VatCalculatorService } from './vat-calculator.service';

describe('VatCalculatorService', () => {
  let service: VatCalculatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VatCalculatorService],
    }).compile();

    service = module.get<VatCalculatorService>(VatCalculatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Standard VAT calculation', () => {
    it('should calculate 23% VAT from net amount', () => {
      const result = service.calculate({
        amount: 1000,
        amountType: 'net',
        transactionType: 'sale',
        vatRateType: 'standard',
      });

      expect(result.netAmount).toBe(1000);
      expect(result.vatRate).toBe(23);
      expect(result.vatAmount).toBe(230);
      expect(result.grossAmount).toBe(1230);
      expect(result.isReverseCharge).toBe(false);
      expect(result.requiresSplitPayment).toBe(false);
    });

    it('should calculate 23% VAT from gross amount', () => {
      const result = service.calculate({
        amount: 1230,
        amountType: 'gross',
        transactionType: 'sale',
        vatRateType: 'standard',
      });

      expect(result.netAmount).toBe(1000);
      expect(result.vatRate).toBe(23);
      expect(result.vatAmount).toBe(230);
      expect(result.grossAmount).toBe(1230);
    });
  });

  describe('Reduced VAT rates', () => {
    it('should apply 8% reduced rate', () => {
      const result = service.calculate({
        amount: 1000,
        amountType: 'net',
        transactionType: 'sale',
        vatRateType: 'reduced_8',
      });

      expect(result.vatRate).toBe(8);
      expect(result.vatAmount).toBe(80);
      expect(result.grossAmount).toBe(1080);
    });

    it('should apply 5% reduced rate', () => {
      const result = service.calculate({
        amount: 1000,
        amountType: 'net',
        transactionType: 'sale',
        vatRateType: 'reduced_5',
      });

      expect(result.vatRate).toBe(5);
      expect(result.vatAmount).toBe(50);
      expect(result.grossAmount).toBe(1050);
    });
  });

  describe('Reverse charge mechanism', () => {
    it('should apply reverse charge for EU intra-community B2B purchase', () => {
      const result = service.calculate({
        amount: 1000,
        amountType: 'net',
        transactionType: 'purchase',
        isEuTransaction: true,
        counterpartyCountry: 'DE',
        counterpartyVatRegistered: true,
      });

      expect(result.vatRate).toBe(0);
      expect(result.isReverseCharge).toBe(true);
      expect(result.vatAmount).toBe(0);
    });

    it('should not apply reverse charge for domestic transactions', () => {
      const result = service.calculate({
        amount: 1000,
        amountType: 'net',
        transactionType: 'purchase',
        isEuTransaction: false,
        counterpartyCountry: 'PL',
        counterpartyVatRegistered: true,
      });

      expect(result.isReverseCharge).toBe(false);
    });
  });

  describe('Split payment mechanism', () => {
    it('should require split payment for purchases > 15,000 PLN', () => {
      const result = service.calculate({
        amount: 20000,
        amountType: 'net',
        transactionType: 'purchase',
        vatRateType: 'standard',
      });

      // Gross amount = 20000 * 1.23 = 24600
      expect(result.grossAmount).toBe(24600);
      expect(result.requiresSplitPayment).toBe(true);
    });

    it('should not require split payment for purchases <= 15,000 PLN', () => {
      const result = service.calculate({
        amount: 10000,
        amountType: 'net',
        transactionType: 'purchase',
        vatRateType: 'standard',
      });

      // Gross amount = 10000 * 1.23 = 12300
      expect(result.grossAmount).toBe(12300);
      expect(result.requiresSplitPayment).toBe(false);
    });

    it('should not require split payment for sales (only purchases)', () => {
      const result = service.calculate({
        amount: 20000,
        amountType: 'net',
        transactionType: 'sale',
        vatRateType: 'standard',
      });

      expect(result.requiresSplitPayment).toBe(false);
    });
  });

  describe('Category-based VAT rates', () => {
    it('should apply 8% rate for hotel category', () => {
      const result = service.calculate({
        amount: 1000,
        amountType: 'net',
        transactionType: 'sale',
        transactionCategory: 'hotel',
      });

      expect(result.vatRate).toBe(8);
    });

    it('should apply 5% rate for book category', () => {
      const result = service.calculate({
        amount: 1000,
        amountType: 'net',
        transactionType: 'sale',
        transactionCategory: 'book',
      });

      expect(result.vatRate).toBe(5);
    });

    it('should apply standard rate for unrecognized category', () => {
      const result = service.calculate({
        amount: 1000,
        amountType: 'net',
        transactionType: 'sale',
        transactionCategory: 'software',
      });

      expect(result.vatRate).toBe(23);
    });
  });

  describe('Multi-rate calculation', () => {
    it('should calculate total for items with different VAT rates', () => {
      const result = service.calculateMultiRate([
        { amount: 1000, vatRateType: 'standard' },
        { amount: 500, vatRateType: 'reduced_8' },
        { amount: 200, vatRateType: 'reduced_5' },
      ]);

      // Standard: 1000 * 1.23 = 1230
      // Reduced 8%: 500 * 1.08 = 540
      // Reduced 5%: 200 * 1.05 = 210
      expect(result.totalNet).toBe(1700);
      expect(result.totalVat).toBe(280); // 230 + 40 + 10
      expect(result.totalGross).toBe(1980);
      expect(result.byRate.standard).toBeDefined();
      expect(result.byRate.reduced_8).toBeDefined();
      expect(result.byRate.reduced_5).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle zero amount', () => {
      const result = service.calculate({
        amount: 0,
        amountType: 'net',
        transactionType: 'sale',
        vatRateType: 'standard',
      });

      expect(result.netAmount).toBe(0);
      expect(result.vatAmount).toBe(0);
      expect(result.grossAmount).toBe(0);
    });

    it('should handle exempt VAT', () => {
      const result = service.calculate({
        amount: 1000,
        amountType: 'net',
        transactionType: 'sale',
        vatRateType: 'exempt',
      });

      expect(result.vatRate).toBe(0);
      expect(result.vatAmount).toBe(0);
      expect(result.grossAmount).toBe(1000);
    });
  });

  describe('Available rates', () => {
    it('should return all available VAT rates', () => {
      const rates = service.getAvailableRates();

      expect(rates).toEqual({
        standard: 23.0,
        reduced_8: 8.0,
        reduced_5: 5.0,
        zero: 0.0,
        exempt: 0.0,
      });
    });
  });
});
