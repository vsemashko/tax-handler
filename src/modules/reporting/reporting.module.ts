import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportingController } from './reporting.controller';
import { VatReportService } from './services/vat-report.service';
import { CitReportService } from './services/cit-report.service';
import { VatReport } from './entities/vat-report.entity';
import { CitReport } from './entities/cit-report.entity';
import { TransactionModule } from '../transaction/transaction.module';

@Module({
  imports: [TypeOrmModule.forFeature([VatReport, CitReport]), TransactionModule],
  controllers: [ReportingController],
  providers: [VatReportService, CitReportService],
  exports: [VatReportService, CitReportService],
})
export class ReportingModule {}
