import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportingController } from './reporting.controller';
import { VatReportService } from './services/vat-report.service';
import { VatReport } from './entities/vat-report.entity';
import { TransactionModule } from '../transaction/transaction.module';

@Module({
  imports: [TypeOrmModule.forFeature([VatReport]), TransactionModule],
  controllers: [ReportingController],
  providers: [VatReportService],
  exports: [VatReportService],
})
export class ReportingModule {}
