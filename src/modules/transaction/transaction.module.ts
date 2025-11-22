import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './services/transaction.service';
import { VatCalculatorService } from './services/vat-calculator.service';
import { Transaction } from './entities/transaction.entity';
import { CurrencyModule } from '../currency/currency.module';
import { CounterpartyModule } from '../counterparty/counterparty.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction]),
    CurrencyModule,
    CounterpartyModule,
  ],
  controllers: [TransactionController],
  providers: [TransactionService, VatCalculatorService],
  exports: [TransactionService, VatCalculatorService],
})
export class TransactionModule {}
