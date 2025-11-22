import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './services/invoice.service';
import { Invoice } from './entities/invoice.entity';
import { CounterpartyModule } from '../counterparty/counterparty.module';
import { CurrencyModule } from '../currency/currency.module';
import { TransactionModule } from '../transaction/transaction.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice]),
    CounterpartyModule,
    CurrencyModule,
    TransactionModule,
  ],
  controllers: [InvoiceController],
  providers: [InvoiceService],
  exports: [InvoiceService],
})
export class InvoiceModule {}
