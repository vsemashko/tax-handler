import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCitReports1737554000000 implements MigrationInterface {
  name = 'AddCitReports1737554000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create cit_reports table
    await queryRunner.query(`
      CREATE TABLE "cit_reports" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tax_year" INTEGER NOT NULL UNIQUE,
        "total_revenue" DECIMAL(19, 4) NOT NULL,
        "tax_deductible_costs" DECIMAL(19, 4) NOT NULL,
        "taxable_income" DECIMAL(19, 4) NOT NULL,
        "tax_rate" DECIMAL(5, 2) NOT NULL,
        "cit_amount" DECIMAL(19, 4) NOT NULL,
        "advance_payments_made" DECIMAL(19, 4) DEFAULT 0,
        "tax_due" DECIMAL(19, 4) NOT NULL,
        "minimum_tax_applicable" BOOLEAN DEFAULT FALSE,
        "minimum_tax_amount" DECIMAL(19, 4),
        "jpk_cit_xml" TEXT,
        "jpk_cit_filename" VARCHAR(255),
        "jpk_cit_generated_at" TIMESTAMP WITH TIME ZONE,
        "status" VARCHAR(50) DEFAULT 'draft',
        "finalized_at" TIMESTAMP WITH TIME ZONE,
        "submitted_at" TIMESTAMP WITH TIME ZONE,
        "submission_reference" VARCHAR(255),
        "notes" TEXT,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "created_by" UUID
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_cit_report_year" ON "cit_reports" ("tax_year")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_cit_report_year"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cit_reports"`);
  }
}
