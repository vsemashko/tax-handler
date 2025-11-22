import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { CurrencyModule } from './modules/currency/currency.module';
import { HealthModule } from './modules/health/health.module';
import { CounterpartyModule } from './modules/counterparty/counterparty.module';
import { TransactionModule } from './modules/transaction/transaction.module';
import { WhiteListModule } from './modules/white-list/white-list.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { InvoiceModule } from './modules/invoice/invoice.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Scheduler
    ScheduleModule.forRoot(),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('DB_SYNCHRONIZE') === 'true',
        logging: configService.get('DB_LOGGING') === 'true',
        migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
        migrationsRun: false,
      }),
      inject: [ConfigService],
    }),

    // Feature modules
    CurrencyModule,
    HealthModule,
    CounterpartyModule,
    TransactionModule,
    WhiteListModule,
    ReportingModule,
    InvoiceModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
