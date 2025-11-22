import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('vat_reports')
@Index(['reportingPeriod', 'periodType'], { unique: true })
export class VatReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'reporting_period', type: 'date' })
  reportingPeriod: Date; // First day of month/quarter

  @Column({ name: 'period_type', type: 'varchar', length: 20 })
  periodType: string; // 'monthly' or 'quarterly'

  // Sales (Output VAT)
  @Column({ name: 'total_sales_net', type: 'decimal', precision: 19, scale: 4 })
  totalSalesNet: number;

  @Column({ name: 'total_sales_vat', type: 'decimal', precision: 19, scale: 4 })
  totalSalesVat: number;

  @Column({ name: 'total_sales_gross', type: 'decimal', precision: 19, scale: 4 })
  totalSalesGross: number;

  // Purchases (Input VAT)
  @Column({ name: 'total_purchases_net', type: 'decimal', precision: 19, scale: 4 })
  totalPurchasesNet: number;

  @Column({ name: 'total_purchases_vat', type: 'decimal', precision: 19, scale: 4 })
  totalPurchasesVat: number;

  @Column({ name: 'total_purchases_gross', type: 'decimal', precision: 19, scale: 4 })
  totalPurchasesGross: number;

  // VAT Balance
  @Column({ name: 'vat_payable', type: 'decimal', precision: 19, scale: 4 })
  vatPayable: number; // If positive: amount to pay

  @Column({ name: 'vat_refund', type: 'decimal', precision: 19, scale: 4 })
  vatRefund: number; // If positive: amount to refund

  // Breakdown by VAT rates
  @Column({ name: 'vat_by_rates', type: 'jsonb', nullable: true })
  vatByRates: {
    rate: number;
    salesNet: number;
    salesVat: number;
    purchasesNet: number;
    purchasesVat: number;
  }[];

  // JPK_VAT XML
  @Column({ name: 'jpk_vat_xml', type: 'text', nullable: true })
  jpkVatXml: string | null;

  @Column({ name: 'jpk_vat_filename', type: 'varchar', length: 255, nullable: true })
  jpkVatFilename: string | null;

  @Column({ name: 'jpk_vat_generated_at', type: 'timestamp with time zone', nullable: true })
  jpkVatGeneratedAt: Date | null;

  // Status
  @Column({ name: 'status', type: 'varchar', length: 50, default: 'draft' })
  status: string; // 'draft', 'finalized', 'submitted', 'accepted'

  @Column({ name: 'finalized_at', type: 'timestamp with time zone', nullable: true })
  finalizedAt: Date | null;

  @Column({ name: 'finalized_by', type: 'uuid', nullable: true })
  finalizedBy: string | null;

  @Column({ name: 'submitted_at', type: 'timestamp with time zone', nullable: true })
  submittedAt: Date | null;

  @Column({ name: 'submission_reference', type: 'varchar', length: 255, nullable: true })
  submissionReference: string | null;

  // Metadata
  @Column({ name: 'transaction_count', type: 'int', default: 0 })
  transactionCount: number;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  // Audit
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;
}
