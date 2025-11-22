import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExchangeRateService } from './exchange-rate.service';
import { ExchangeRate } from '../entities/exchange-rate.entity';
import { NbpApiService } from './nbp-api.service';

describe('ExchangeRateService', () => {
  let service: ExchangeRateService;
  let repository: Repository<ExchangeRate>;
  let nbpApiService: NbpApiService;

  const mockRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockNbpApiService = {
    getCurrentRate: jest.fn(),
    getHistoricalRate: jest.fn(),
    getRateRange: jest.fn(),
    getLastWorkingDayRate: jest.fn(),
    getCurrentTable: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExchangeRateService,
        {
          provide: getRepositoryToken(ExchangeRate),
          useValue: mockRepository,
        },
        {
          provide: NbpApiService,
          useValue: mockNbpApiService,
        },
      ],
    }).compile();

    service = module.get<ExchangeRateService>(ExchangeRateService);
    repository = module.get<Repository<ExchangeRate>>(getRepositoryToken(ExchangeRate));
    nbpApiService = module.get<NbpApiService>(NbpApiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCurrentRate', () => {
    it('should return rate from database if available', async () => {
      const mockRate: Partial<ExchangeRate> = {
        id: '123',
        currencyCode: 'USD',
        baseCurrency: 'PLN',
        rateDate: new Date('2025-01-22'),
        midRate: 4.0234,
        rateSource: 'NBP',
        tableType: 'A',
      };

      mockRepository.findOne.mockResolvedValue(mockRate);

      const result = await service.getCurrentRate('USD', 'A');

      expect(result).toEqual(mockRate);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: expect.objectContaining({
          currencyCode: 'USD',
          baseCurrency: 'PLN',
          rateSource: 'NBP',
          tableType: 'A',
        }),
      });
    });

    it('should fetch from NBP if not in database', async () => {
      const mockNbpResponse = {
        table: 'A',
        currency: 'US Dollar',
        code: 'USD',
        rates: [
          {
            no: '015/A/NBP/2025',
            effectiveDate: '2025-01-22',
            mid: 4.0234,
          },
        ],
      };

      const mockSavedRate: Partial<ExchangeRate> = {
        id: '456',
        currencyCode: 'USD',
        baseCurrency: 'PLN',
        rateDate: new Date('2025-01-22'),
        midRate: 4.0234,
        rateSource: 'NBP',
        tableType: 'A',
      };

      mockRepository.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      mockNbpApiService.getCurrentRate.mockResolvedValue(mockNbpResponse);
      mockRepository.create.mockReturnValue(mockSavedRate);
      mockRepository.save.mockResolvedValue(mockSavedRate);

      const result = await service.getCurrentRate('USD', 'A');

      expect(mockNbpApiService.getCurrentRate).toHaveBeenCalledWith('USD', 'A');
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockSavedRate);
    });
  });

  describe('convertToPln', () => {
    it('should return original amount if currency is PLN', async () => {
      const result = await service.convertToPln(1000, 'PLN', new Date('2025-01-22'));

      expect(result.convertedAmount).toBe(1000);
      expect(result.rate).toBeNull();
    });

    it('should convert amount using exchange rate', async () => {
      const mockRate: Partial<ExchangeRate> = {
        id: '123',
        currencyCode: 'EUR',
        baseCurrency: 'PLN',
        rateDate: new Date('2025-01-21'),
        midRate: 4.3215,
        rateSource: 'NBP',
        tableType: 'A',
      };

      mockRepository.findOne.mockResolvedValue(mockRate);

      const result = await service.convertToPln(1000, 'EUR', new Date('2025-01-22'), true);

      expect(result.convertedAmount).toBe(4321.5);
      expect(result.rate).toEqual(mockRate);
    });
  });

  describe('getHistoricalRate', () => {
    it('should return historical rate from database', async () => {
      const mockRate: Partial<ExchangeRate> = {
        id: '789',
        currencyCode: 'GBP',
        baseCurrency: 'PLN',
        rateDate: new Date('2025-01-15'),
        midRate: 5.1234,
        rateSource: 'NBP',
        tableType: 'A',
      };

      mockRepository.findOne.mockResolvedValue(mockRate);

      const result = await service.getHistoricalRate('GBP', new Date('2025-01-15'), 'A');

      expect(result).toEqual(mockRate);
      expect(mockRepository.findOne).toHaveBeenCalled();
    });
  });
});
