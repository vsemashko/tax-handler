import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CurrencyController } from './currency.controller';
import { CurrencyService } from './services/currency.service';
import { ExchangeRateService } from './services/exchange-rate.service';
import { NbpApiService } from './services/nbp-api.service';
import { ExchangeRateSchedulerService } from './services/exchange-rate-scheduler.service';
import { Currency } from './entities/currency.entity';
import { ExchangeRate } from './entities/exchange-rate.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Currency, ExchangeRate])],
  controllers: [CurrencyController],
  providers: [
    CurrencyService,
    ExchangeRateService,
    NbpApiService,
    ExchangeRateSchedulerService,
  ],
  exports: [CurrencyService, ExchangeRateService, NbpApiService],
})
export class CurrencyModule {}
