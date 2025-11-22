import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1737548400000 implements MigrationInterface {
  name = 'InitialSchema1737548400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create currencies table
    await queryRunner.query(`
      CREATE TABLE "currencies" (
        "code" CHAR(3) PRIMARY KEY,
        "name" VARCHAR(100) NOT NULL,
        "symbol" VARCHAR(10),
        "decimal_places" INTEGER NOT NULL DEFAULT 2,
        "available_in_tables" TEXT NOT NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create exchange_rates table
    await queryRunner.query(`
      CREATE TABLE "exchange_rates" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "currency_code" CHAR(3) NOT NULL,
        "base_currency" CHAR(3) NOT NULL DEFAULT 'PLN',
        "rate_date" DATE NOT NULL,
        "rate_source" VARCHAR(10) NOT NULL,
        "table_type" CHAR(1),
        "mid_rate" DECIMAL(12, 6) NOT NULL,
        "bid_rate" DECIMAL(12, 6),
        "ask_rate" DECIMAL(12, 6),
        "effective_from" TIMESTAMP WITH TIME ZONE NOT NULL,
        "effective_to" TIMESTAMP WITH TIME ZONE,
        "fetched_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "raw_response" JSONB,
        CONSTRAINT "UQ_exchange_rate" UNIQUE (
          "currency_code",
          "base_currency",
          "rate_date",
          "rate_source",
          "table_type"
        )
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "idx_currency_date" ON "exchange_rates" ("currency_code", "rate_date")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_rate_date" ON "exchange_rates" ("rate_date" DESC)
    `);

    // Insert common currencies
    await queryRunner.query(`
      INSERT INTO "currencies" ("code", "name", "symbol", "available_in_tables") VALUES
      ('USD', 'US Dollar', '$', 'A,C'),
      ('EUR', 'Euro', '€', 'A,C'),
      ('GBP', 'British Pound', '£', 'A,C'),
      ('CHF', 'Swiss Franc', 'CHF', 'A,C'),
      ('JPY', 'Japanese Yen', '¥', 'A,C'),
      ('CAD', 'Canadian Dollar', 'C$', 'A,C'),
      ('AUD', 'Australian Dollar', 'A$', 'A,C'),
      ('SEK', 'Swedish Krona', 'kr', 'A,C'),
      ('NOK', 'Norwegian Krone', 'kr', 'A,C'),
      ('DKK', 'Danish Krone', 'kr', 'A,C'),
      ('CZK', 'Czech Koruna', 'Kč', 'A,C'),
      ('HUF', 'Hungarian Forint', 'Ft', 'A,C'),
      ('PLN', 'Polish Zloty', 'zł', 'A,B,C')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_rate_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_currency_date"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "exchange_rates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "currencies"`);
  }
}
