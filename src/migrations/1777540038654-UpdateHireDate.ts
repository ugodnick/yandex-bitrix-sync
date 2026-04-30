import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateHireDate1777540038654 implements MigrationInterface {
  name = 'UpdateHireDate1777540038654';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "yandex_fleet_profile_temp" (
       "yandex_profile_id" varchar PRIMARY KEY NOT NULL,
       "park_id" varchar NOT NULL,
       "bitrix_contact_id" varchar NOT NULL,
       "bitrix_deal_id" varchar NOT NULL,
       "bitrix_stage_id" varchar NOT NULL,
       "hire_date" date,
       "fleet_created_date" date NOT NULL,
       "data_hash" varchar NOT NULL,
       "first_name" varchar NOT NULL,
       "last_name" varchar NOT NULL,
       "middle_name" varchar,
       "phone" varchar,
       "employment_type" varchar NOT NULL,
       "work_rule_id" varchar NOT NULL,
       "vehicle_type" varchar,
       "first_order_date" date,
       "last_order_date" date,
       "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
       "create_at" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);

    await queryRunner.query(`
      INSERT INTO "yandex_fleet_profile_temp" (
        "yandex_profile_id", "park_id", "bitrix_contact_id", "bitrix_deal_id", "bitrix_stage_id",
        "hire_date", "fleet_created_date", "data_hash", "first_name", "last_name", "middle_name",
        "phone", "employment_type", "work_rule_id", "vehicle_type", "first_order_date",
        "last_order_date", "updated_at", "create_at"
      )
      SELECT
        "yandex_profile_id", "park_id", "bitrix_contact_id", "bitrix_deal_id", "bitrix_stage_id",
        "hire_date", "hire_date", "data_hash", "first_name", "last_name", "middle_name",
        "phone", "employment_type", "work_rule_id", "vehicle_type", "first_order_date",
        "last_order_date", "updated_at", "create_at"
      FROM "yandex_fleet_profile"
    `);

    await queryRunner.query(`DROP TABLE "yandex_fleet_profile"`);
    await queryRunner.query(
      `ALTER TABLE "yandex_fleet_profile_temp" RENAME TO "yandex_fleet_profile"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "yandex_fleet_profile_temp" (
       "yandex_profile_id" varchar PRIMARY KEY NOT NULL,
       "park_id" varchar NOT NULL,
       "bitrix_contact_id" varchar NOT NULL,
       "bitrix_deal_id" varchar NOT NULL,
       "bitrix_stage_id" varchar NOT NULL,
       "hire_date" date NOT NULL,
       "data_hash" varchar NOT NULL,
       "first_name" varchar NOT NULL,
       "last_name" varchar NOT NULL,
       "middle_name" varchar,
       "phone" varchar,
       "employment_type" varchar NOT NULL,
       "work_rule_id" varchar NOT NULL,
       "vehicle_type" varchar,
       "first_order_date" date,
       "last_order_date" date,
       "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
       "create_at" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);

    await queryRunner.query(`
      INSERT INTO "yandex_fleet_profile_temp" (
        "yandex_profile_id", "park_id", "bitrix_contact_id", "bitrix_deal_id", "bitrix_stage_id",
        "hire_date", "data_hash", "first_name", "last_name", "middle_name",
        "phone", "employment_type", "work_rule_id", "vehicle_type", "first_order_date",
        "last_order_date", "updated_at", "create_at"
      )
      SELECT
        "yandex_profile_id", "park_id", "bitrix_contact_id", "bitrix_deal_id", "bitrix_stage_id",
        COALESCE("hire_date", "fleet_created_date"), "data_hash", "first_name", "last_name", "middle_name",
        "phone", "employment_type", "work_rule_id", "vehicle_type", "first_order_date",
        "last_order_date", "updated_at", "create_at"
      FROM "yandex_fleet_profile"
    `);

    await queryRunner.query(`DROP TABLE "yandex_fleet_profile"`);
    await queryRunner.query(
      `ALTER TABLE "yandex_fleet_profile_temp" RENAME TO "yandex_fleet_profile"`,
    );
  }
}
