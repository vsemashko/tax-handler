import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('counterparties')
@Index(['nip'])
export class Counterparty {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'nip', type: 'varchar', length: 10, unique: true, nullable: true })
  nip: string | null;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'legal_form', type: 'varchar', length: 100, nullable: true })
  legalForm: string | null;

  @Column({ name: 'street', type: 'varchar', length: 255, nullable: true })
  street: string | null;

  @Column({ name: 'city', type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ name: 'postal_code', type: 'varchar', length: 10, nullable: true })
  postalCode: string | null;

  @Column({ name: 'country', type: 'char', length: 2, default: 'PL' })
  country: string;

  @Column({ name: 'email', type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ name: 'phone', type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({
    name: 'counterparty_type',
    type: 'varchar',
    length: 50,
    default: 'customer',
  })
  counterpartyType: string; // 'customer', 'supplier', 'both'

  @Column({ name: 'is_eu_entity', type: 'boolean', default: false })
  isEuEntity: boolean;

  @Column({ name: 'is_vat_registered', type: 'boolean', default: true })
  isVatRegistered: boolean;

  @Column({ name: 'bank_accounts', type: 'jsonb', nullable: true })
  bankAccounts: {
    accountNumber: string;
    bankName?: string;
    isDefault?: boolean;
    isVerified?: boolean;
    verifiedAt?: string;
  }[];

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
