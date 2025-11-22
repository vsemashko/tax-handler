import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('cit_reports')
@Index(['taxYear'], { unique: true })
export class CitReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tax_year', type: 'int' })
  taxYear: number;

  // Financial Data
  @Column({ name: 'total_revenue', type: 'decimal', precision: 19, scale: 4 })
  totalRevenue: number;

  @Column({ name: 'tax_deductible_costs', type: 'decimal', precision: 19, scale: 4 })
  taxDeductibleCosts: number;

  @Column({ name: 'taxable_income', type: 'decimal', precision: 19, scale: 4 })
  taxableIncome: number;

  @Column({ name: 'tax_rate', type: 'decimal', precision: 5, scale: 2 })
  taxRate: number; // 9.00 or 19.00

  @Column({ name: 'cit_amount', type: 'decimal', precision: 19, scale: 4 })
  citAmount: number;

  @Column({ name: 'advance_payments_made', type: 'decimal', precision: 19, scale: 4, default: 0 })
  advancePaymentsMade: number;

  @Column({ name: 'tax_due', type: 'decimal', precision: 19, scale: 4 })
  taxDue: number; // Amount to pay or receive

  // Minimum Tax
  @Column({ name: 'minimum_tax_applicable', type: 'boolean', default: false })
  minimumTaxApplicable: boolean;

  @Column({ name: 'minimum_tax_amount', type: 'decimal', precision: 19, scale: 4, nullable: true })
  minimumTaxAmount: number | null;

  // JPK_CIT (for large companies)
  @Column({ name: 'jpk_cit_xml', type: 'text', nullable: true })
  jpkCitXml: string | null;

  @Column({ name: 'jpk_cit_filename', type: 'varchar', length: 255, nullable: true })
  jpkCitFilename: string | null;

  @Column({ name: 'jpk_cit_generated_at', type: 'timestamp with time zone', nullable: true })
  jpkCitGeneratedAt: Date | null;

  // Status
  @Column({ name: 'status', type: 'varchar', length: 50, default: 'draft' })
  status: string; // 'draft', 'finalized', 'submitted'

  @Column({ name: 'finalized_at', type: 'timestamp with time zone', nullable: true })
  finalizedAt: Date | null;

  @Column({ name: 'submitted_at', type: 'timestamp with time zone', nullable: true })
  submittedAt: Date | null;

  @Column({ name: 'submission_reference', type: 'varchar', length: 255, nullable: true })
  submissionReference: string | null;

  // Metadata
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
