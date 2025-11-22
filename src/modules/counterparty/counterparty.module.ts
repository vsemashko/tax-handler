import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CounterpartyController } from './counterparty.controller';
import { CounterpartyService } from './services/counterparty.service';
import { NipValidatorService } from './services/nip-validator.service';
import { Counterparty } from './entities/counterparty.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Counterparty])],
  controllers: [CounterpartyController],
  providers: [CounterpartyService, NipValidatorService],
  exports: [CounterpartyService, NipValidatorService],
})
export class CounterpartyModule {}
