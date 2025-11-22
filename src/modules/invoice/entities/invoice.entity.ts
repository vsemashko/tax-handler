import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Counterparty } from '../../counterparty/entities/counterparty.entity';
import { Transaction } from '../../transaction/entities/transaction.entity';

@Entity('invoices')
@Index(['invoiceNumber'], { unique: true })
@Index(['issueDate'])
@Index(['dueDate'])
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'invoice_number', type: 'varchar', length: 100, unique: true })
  invoiceNumber: string;

  @Column({ name: 'invoice_type', type: 'varchar', length: 50 })
  invoiceType: string; // 'standard', 'proforma', 'credit_note', 'debit_note'

  @Column({ name: 'issue_date', type: 'date' })
  issueDate: Date;

  @Column({ name: 'sale_date', type: 'date', nullable: true })
  saleDate: Date | null;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: Date | null;

  @Column({ name: 'payment_terms_days', type: 'int', nullable: true })
  paymentTermsDays: number | null;

  // Seller (our company)
  @Column({ name: 'seller_name', type: 'varchar', length: 255 })
  sellerName: string;

  @Column({ name: 'seller_nip', type: 'varchar', length: 10 })
  sellerNip: string;

  @Column({ name: 'seller_address', type: 'text' })
  sellerAddress: string;

  // Buyer (counterparty)
  @Column({ name: 'counterparty_id', type: 'uuid' })
  counterpartyId: string;

  @ManyToOne(() => Counterparty)
  @JoinColumn({ name: 'counterparty_id' })
  counterparty: Counterparty;

  @Column({ name: 'buyer_name', type: 'varchar', length: 255 })
  buyerName: string;

  @Column({ name: 'buyer_nip', type: 'varchar', length: 10, nullable: true })
  buyerNip: string | null;

  @Column({ name: 'buyer_address', type: 'text' })
  buyerAddress: string;

  // Currency
  @Column({ name: 'currency', type: 'char', length: 3 })
  currency: string;

  @Column({ name: 'exchange_rate', type: 'decimal', precision: 12, scale: 6, nullable: true })
  exchangeRate: number | null;

  @Column({ name: 'exchange_rate_date', type: 'date', nullable: true })
  exchangeRateDate: Date | null;

  // Amounts
  @Column({ name: 'net_amount', type: 'decimal', precision: 19, scale: 4 })
  netAmount: number;

  @Column({ name: 'vat_amount', type: 'decimal', precision: 19, scale: 4 })
  vatAmount: number;

  @Column({ name: 'gross_amount', type: 'decimal', precision: 19, scale: 4 })
  grossAmount: number;

  // Amounts in PLN (always required per Polish regulations)
  @Column({ name: 'net_amount_pln', type: 'decimal', precision: 19, scale: 4 })
  netAmountPln: number;

  @Column({ name: 'vat_amount_pln', type: 'decimal', precision: 19, scale: 4 })
  vatAmountPln: number;

  @Column({ name: 'gross_amount_pln', type: 'decimal', precision: 19, scale: 4 })
  grossAmountPln: number;

  // Line items stored as JSON
  @Column({ name: 'line_items', type: 'jsonb' })
  lineItems: Array<{
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    netAmount: number;
    vatRate: number;
    vatAmount: number;
    grossAmount: number;
  }>;

  // Tax details
  @Column({ name: 'is_reverse_charge', type: 'boolean', default: false })
  isReverseCharge: boolean;

  @Column({ name: 'requires_split_payment', type: 'boolean', default: false })
  requiresSplitPayment: boolean;

  // KSeF (Polish e-invoicing system)
  @Column({ name: 'ksef_reference', type: 'varchar', length: 255, nullable: true })
  ksefReference: string | null;

  @Column({ name: 'ksef_submitted_at', type: 'timestamp with time zone', nullable: true })
  ksefSubmittedAt: Date | null;

  @Column({ name: 'ksef_status', type: 'varchar', length: 50, nullable: true })
  ksefStatus: string | null; // 'pending', 'submitted', 'accepted', 'rejected'

  // Payment
  @Column({ name: 'payment_status', type: 'varchar', length: 50, default: 'unpaid' })
  paymentStatus: string; // 'unpaid', 'partially_paid', 'paid', 'overdue'

  @Column({ name: 'paid_amount', type: 'decimal', precision: 19, scale: 4, default: 0 })
  paidAmount: number;

  @Column({ name: 'paid_at', type: 'timestamp with time zone', nullable: true })
  paidAt: Date | null;

  @Column({ name: 'payment_method', type: 'varchar', length: 50, nullable: true })
  paymentMethod: string | null;

  // Additional info
  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'internal_notes', type: 'text', nullable: true })
  internalNotes: string | null;

  @Column({ name: 'attachments', type: 'jsonb', nullable: true })
  attachments: any;

  // Status
  @Column({ name: 'status', type: 'varchar', length: 50, default: 'draft' })
  status: string; // 'draft', 'issued', 'sent', 'cancelled'

  @Column({ name: 'cancelled_at', type: 'timestamp with time zone', nullable: true })
  cancelledAt: Date | null;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason: string | null;

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
