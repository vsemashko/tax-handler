import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReporting1737552000000 implements MigrationInterface {
  name = 'AddReporting1737552000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create vat_reports table
    await queryRunner.query(`
      CREATE TABLE "vat_reports" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "reporting_period" DATE NOT NULL,
        "period_type" VARCHAR(20) NOT NULL,
        "total_sales_net" DECIMAL(19, 4) NOT NULL,
        "total_sales_vat" DECIMAL(19, 4) NOT NULL,
        "total_sales_gross" DECIMAL(19, 4) NOT NULL,
        "total_purchases_net" DECIMAL(19, 4) NOT NULL,
        "total_purchases_vat" DECIMAL(19, 4) NOT NULL,
        "total_purchases_gross" DECIMAL(19, 4) NOT NULL,
        "vat_payable" DECIMAL(19, 4) NOT NULL,
        "vat_refund" DECIMAL(19, 4) NOT NULL,
        "vat_by_rates" JSONB,
        "jpk_vat_xml" TEXT,
        "jpk_vat_filename" VARCHAR(255),
        "jpk_vat_generated_at" TIMESTAMP WITH TIME ZONE,
        "status" VARCHAR(50) DEFAULT 'draft',
        "finalized_at" TIMESTAMP WITH TIME ZONE,
        "finalized_by" UUID,
        "submitted_at" TIMESTAMP WITH TIME ZONE,
        "submission_reference" VARCHAR(255),
        "transaction_count" INTEGER DEFAULT 0,
        "notes" TEXT,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "created_by" UUID,
        CONSTRAINT "uq_vat_report_period" UNIQUE ("reporting_period", "period_type")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_vat_report_period" ON "vat_reports" ("reporting_period", "period_type")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_vat_report_period"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vat_reports"`);
  }
}
