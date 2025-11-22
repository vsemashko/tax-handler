import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Counterparty } from '../../counterparty/entities/counterparty.entity';
import { ExchangeRate } from '../../currency/entities/exchange-rate.entity';

@Entity('transactions')
@Index(['transactionDate'])
@Index(['transactionType'])
@Index(['counterpartyId'])
@Index(['invoiceNumber'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'transaction_date', type: 'timestamp with time zone' })
  transactionDate: Date;

  @Column({ name: 'transaction_type', type: 'varchar', length: 50 })
  transactionType: string; // 'sale', 'purchase', 'expense', 'refund'

  // Currency & Amounts
  @Column({ name: 'original_currency', type: 'char', length: 3 })
  originalCurrency: string;

  @Column({ name: 'original_amount', type: 'decimal', precision: 19, scale: 4 })
  originalAmount: number;

  @Column({ name: 'pln_amount', type: 'decimal', precision: 19, scale: 4 })
  plnAmount: number;

  @Column({ name: 'exchange_rate_id', type: 'uuid', nullable: true })
  exchangeRateId: string | null;

  @ManyToOne(() => ExchangeRate, { nullable: true })
  @JoinColumn({ name: 'exchange_rate_id' })
  exchangeRate: ExchangeRate | null;

  // VAT
  @Column({ name: 'vat_rate', type: 'decimal', precision: 5, scale: 2 })
  vatRate: number; // 0.00, 5.00, 8.00, 23.00

  @Column({ name: 'vat_amount_pln', type: 'decimal', precision: 19, scale: 4 })
  vatAmountPln: number;

  @Column({ name: 'is_reverse_charge', type: 'boolean', default: false })
  isReverseCharge: boolean;

  @Column({ name: 'requires_split_payment', type: 'boolean', default: false })
  requiresSplitPayment: boolean;

  // Invoice
  @Column({ name: 'invoice_number', type: 'varchar', length: 100, nullable: true })
  invoiceNumber: string | null;

  @Column({ name: 'invoice_date', type: 'date', nullable: true })
  invoiceDate: Date | null;

  @Column({ name: 'ksef_reference', type: 'varchar', length: 255, nullable: true })
  ksefReference: string | null;

  // Counterparty
  @Column({ name: 'counterparty_id', type: 'uuid', nullable: true })
  counterpartyId: string | null;

  @ManyToOne(() => Counterparty, { nullable: true })
  @JoinColumn({ name: 'counterparty_id' })
  counterparty: Counterparty | null;

  @Column({ name: 'counterparty_nip', type: 'varchar', length: 10, nullable: true })
  counterpartyNip: string | null;

  @Column({ name: 'counterparty_name', type: 'varchar', length: 255, nullable: true })
  counterpartyName: string | null;

  // Payment
  @Column({ name: 'payment_method', type: 'varchar', length: 50, nullable: true })
  paymentMethod: string | null;

  @Column({ name: 'payment_status', type: 'varchar', length: 50, default: 'pending' })
  paymentStatus: string; // 'pending', 'paid', 'overdue', 'cancelled'

  @Column({ name: 'bank_account', type: 'varchar', length: 50, nullable: true })
  bankAccount: string | null;

  @Column({ name: 'bank_account_verified', type: 'boolean', default: false })
  bankAccountVerified: boolean;

  @Column({ name: 'white_list_check_id', type: 'uuid', nullable: true })
  whiteListCheckId: string | null;

  // Tax Classification
  @Column({ name: 'tax_category', type: 'varchar', length: 100, nullable: true })
  taxCategory: string | null;

  @Column({ name: 'is_tax_deductible', type: 'boolean', default: true })
  isTaxDeductible: boolean;

  @Column({ name: 'deduction_percentage', type: 'decimal', precision: 5, scale: 2, default: 100.00 })
  deductionPercentage: number;

  // Metadata
  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'tags', type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ name: 'attachments', type: 'jsonb', nullable: true })
  attachments: any;

  // Audit
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;
}
