import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Transaction } from '../transaction/entities/transaction.entity';
import { VatReport } from '../reporting/entities/vat-report.entity';
import { CitReport } from '../reporting/entities/cit-report.entity';
import { Invoice } from '../invoice/entities/invoice.entity';
import { Counterparty } from '../counterparty/entities/counterparty.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Transaction,
      VatReport,
      CitReport,
      Invoice,
      Counterparty,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
