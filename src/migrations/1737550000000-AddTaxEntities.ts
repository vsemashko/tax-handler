import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaxEntities1737550000000 implements MigrationInterface {
  name = 'AddTaxEntities1737550000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create counterparties table
    await queryRunner.query(`
      CREATE TABLE "counterparties" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "nip" VARCHAR(10) UNIQUE,
        "name" VARCHAR(255) NOT NULL,
        "legal_form" VARCHAR(100),
        "street" VARCHAR(255),
        "city" VARCHAR(100),
        "postal_code" VARCHAR(10),
        "country" CHAR(2) DEFAULT 'PL',
        "email" VARCHAR(255),
        "phone" VARCHAR(50),
        "counterparty_type" VARCHAR(50) DEFAULT 'customer',
        "is_eu_entity" BOOLEAN DEFAULT FALSE,
        "is_vat_registered" BOOLEAN DEFAULT TRUE,
        "bank_accounts" JSONB,
        "notes" TEXT,
        "is_active" BOOLEAN DEFAULT TRUE,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_counterparty_nip" ON "counterparties" ("nip")
    `);

    // Create transactions table
    await queryRunner.query(`
      CREATE TABLE "transactions" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "transaction_date" TIMESTAMP WITH TIME ZONE NOT NULL,
        "transaction_type" VARCHAR(50) NOT NULL,
        "original_currency" CHAR(3) NOT NULL,
        "original_amount" DECIMAL(19, 4) NOT NULL,
        "pln_amount" DECIMAL(19, 4) NOT NULL,
        "exchange_rate_id" UUID,
        "vat_rate" DECIMAL(5, 2) NOT NULL,
        "vat_amount_pln" DECIMAL(19, 4) NOT NULL,
        "is_reverse_charge" BOOLEAN DEFAULT FALSE,
        "requires_split_payment" BOOLEAN DEFAULT FALSE,
        "invoice_number" VARCHAR(100),
        "invoice_date" DATE,
        "ksef_reference" VARCHAR(255),
        "counterparty_id" UUID,
        "counterparty_nip" VARCHAR(10),
        "counterparty_name" VARCHAR(255),
        "payment_method" VARCHAR(50),
        "payment_status" VARCHAR(50) DEFAULT 'pending',
        "bank_account" VARCHAR(50),
        "bank_account_verified" BOOLEAN DEFAULT FALSE,
        "white_list_check_id" UUID,
        "tax_category" VARCHAR(100),
        "is_tax_deductible" BOOLEAN DEFAULT TRUE,
        "deduction_percentage" DECIMAL(5, 2) DEFAULT 100.00,
        "description" TEXT,
        "notes" TEXT,
        "tags" TEXT,
        "attachments" JSONB,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "created_by" UUID,
        "updated_by" UUID,
        CONSTRAINT "fk_transaction_exchange_rate" FOREIGN KEY ("exchange_rate_id")
          REFERENCES "exchange_rates"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_transaction_counterparty" FOREIGN KEY ("counterparty_id")
          REFERENCES "counterparties"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_transaction_date" ON "transactions" ("transaction_date")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_transaction_type" ON "transactions" ("transaction_type")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_transaction_counterparty" ON "transactions" ("counterparty_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_transaction_invoice" ON "transactions" ("invoice_number")
    `);

    // Create white_list_checks table
    await queryRunner.query(`
      CREATE TABLE "white_list_checks" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "nip" VARCHAR(10) NOT NULL,
        "bank_account" VARCHAR(50) NOT NULL,
        "check_date" TIMESTAMP WITH TIME ZONE NOT NULL,
        "is_verified" BOOLEAN NOT NULL,
        "verification_status" VARCHAR(50) NOT NULL,
        "api_response" JSONB,
        "checked_for_transaction_id" UUID,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_white_list_nip_account" ON "white_list_checks" ("nip", "bank_account")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_white_list_check_date" ON "white_list_checks" ("check_date" DESC)
    `);

    // Create invoices table
    await queryRunner.query(`
      CREATE TABLE "invoices" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "invoice_number" VARCHAR(100) UNIQUE NOT NULL,
        "invoice_type" VARCHAR(50) NOT NULL,
        "issue_date" DATE NOT NULL,
        "sale_date" DATE,
        "due_date" DATE,
        "payment_terms_days" INTEGER,
        "seller_name" VARCHAR(255) NOT NULL,
        "seller_nip" VARCHAR(10) NOT NULL,
        "seller_address" TEXT NOT NULL,
        "counterparty_id" UUID NOT NULL,
        "buyer_name" VARCHAR(255) NOT NULL,
        "buyer_nip" VARCHAR(10),
        "buyer_address" TEXT NOT NULL,
        "currency" CHAR(3) NOT NULL,
        "exchange_rate" DECIMAL(12, 6),
        "exchange_rate_date" DATE,
        "net_amount" DECIMAL(19, 4) NOT NULL,
        "vat_amount" DECIMAL(19, 4) NOT NULL,
        "gross_amount" DECIMAL(19, 4) NOT NULL,
        "net_amount_pln" DECIMAL(19, 4) NOT NULL,
        "vat_amount_pln" DECIMAL(19, 4) NOT NULL,
        "gross_amount_pln" DECIMAL(19, 4) NOT NULL,
        "line_items" JSONB NOT NULL,
        "is_reverse_charge" BOOLEAN DEFAULT FALSE,
        "requires_split_payment" BOOLEAN DEFAULT FALSE,
        "ksef_reference" VARCHAR(255),
        "ksef_submitted_at" TIMESTAMP WITH TIME ZONE,
        "ksef_status" VARCHAR(50),
        "payment_status" VARCHAR(50) DEFAULT 'unpaid',
        "paid_amount" DECIMAL(19, 4) DEFAULT 0,
        "paid_at" TIMESTAMP WITH TIME ZONE,
        "payment_method" VARCHAR(50),
        "notes" TEXT,
        "internal_notes" TEXT,
        "attachments" JSONB,
        "status" VARCHAR(50) DEFAULT 'draft',
        "cancelled_at" TIMESTAMP WITH TIME ZONE,
        "cancellation_reason" TEXT,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "created_by" UUID,
        "updated_by" UUID,
        CONSTRAINT "fk_invoice_counterparty" FOREIGN KEY ("counterparty_id")
          REFERENCES "counterparties"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_invoice_number" ON "invoices" ("invoice_number")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_invoice_issue_date" ON "invoices" ("issue_date")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_invoice_due_date" ON "invoices" ("due_date")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_invoice_due_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_invoice_issue_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_invoice_number"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "invoices"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_white_list_check_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_white_list_nip_account"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "white_list_checks"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_transaction_invoice"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_transaction_counterparty"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_transaction_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_transaction_date"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "transactions"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_counterparty_nip"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "counterparties"`);
  }
}
