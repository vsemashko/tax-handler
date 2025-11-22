import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('white_list_checks')
@Index(['nip', 'bankAccount'])
@Index(['checkDate'])
export class WhiteListCheck {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'nip', type: 'varchar', length: 10 })
  nip: string;

  @Column({ name: 'bank_account', type: 'varchar', length: 50 })
  bankAccount: string;

  @Column({ name: 'check_date', type: 'timestamp with time zone' })
  checkDate: Date;

  @Column({ name: 'is_verified', type: 'boolean' })
  isVerified: boolean;

  @Column({ name: 'verification_status', type: 'varchar', length: 50 })
  verificationStatus: string; // 'verified', 'not_found', 'error'

  @Column({ name: 'api_response', type: 'jsonb', nullable: true })
  apiResponse: any;

  @Column({ name: 'checked_for_transaction_id', type: 'uuid', nullable: true })
  checkedForTransactionId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;
}
