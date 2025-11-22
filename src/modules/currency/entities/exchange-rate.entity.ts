import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('exchange_rates')
@Unique(['currencyCode', 'baseCurrency', 'rateDate', 'rateSource', 'tableType'])
@Index(['currencyCode', 'rateDate'])
@Index(['rateDate'])
export class ExchangeRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'currency_code', type: 'char', length: 3 })
  currencyCode: string;

  @Column({ name: 'base_currency', type: 'char', length: 3, default: 'PLN' })
  baseCurrency: string;

  @Column({ name: 'rate_date', type: 'date' })
  rateDate: Date;

  @Column({ name: 'rate_source', type: 'varchar', length: 10 })
  rateSource: string; // 'NBP' or 'ECB'

  @Column({ name: 'table_type', type: 'char', length: 1, nullable: true })
  tableType: string | null; // 'A', 'B', 'C' for NBP

  @Column({ name: 'mid_rate', type: 'decimal', precision: 12, scale: 6 })
  midRate: number;

  @Column({ name: 'bid_rate', type: 'decimal', precision: 12, scale: 6, nullable: true })
  bidRate: number | null;

  @Column({ name: 'ask_rate', type: 'decimal', precision: 12, scale: 6, nullable: true })
  askRate: number | null;

  @Column({ name: 'effective_from', type: 'timestamp with time zone' })
  effectiveFrom: Date;

  @Column({ name: 'effective_to', type: 'timestamp with time zone', nullable: true })
  effectiveTo: Date | null;

  @CreateDateColumn({ name: 'fetched_at', type: 'timestamp with time zone' })
  fetchedAt: Date;

  @Column({ name: 'raw_response', type: 'jsonb', nullable: true })
  rawResponse: any;
}
