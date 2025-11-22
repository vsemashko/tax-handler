import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('currencies')
export class Currency {
  @PrimaryColumn({ name: 'code', type: 'char', length: 3 })
  code: string;

  @Column({ name: 'name', type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'symbol', type: 'varchar', length: 10, nullable: true })
  symbol: string | null;

  @Column({ name: 'decimal_places', type: 'int', default: 2 })
  decimalPlaces: number;

  @Column({ name: 'available_in_tables', type: 'simple-array' })
  availableInTables: string[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
