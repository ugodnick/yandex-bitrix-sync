import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateOrderDateFields1778198400000 implements MigrationInterface {
  name = 'UpdateOrderDateFields1778198400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE yandex_fleet_profile RENAME TO yandex_fleet_profile_old`);

    await queryRunner.query(`
      CREATE TABLE yandex_fleet_profile (
        yandex_profile_id VARCHAR PRIMARY KEY,
        park_id VARCHAR NOT NULL,
        bitrix_contact_id VARCHAR NOT NULL,
        bitrix_deal_id VARCHAR NOT NULL,
        bitrix_stage_id VARCHAR NOT NULL,
        hire_date DATE,
        fleet_created_date DATETIME NOT NULL,
        data_hash VARCHAR NOT NULL,
        first_name VARCHAR NOT NULL,
        last_name VARCHAR NOT NULL,
        middle_name VARCHAR,
        phone VARCHAR,
        employment_type VARCHAR NOT NULL,
        work_rule_id VARCHAR NOT NULL,
        vehicle_type VARCHAR,
        first_order_date DATETIME,
        last_order_date DATETIME,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      INSERT INTO yandex_fleet_profile (
        yandex_profile_id, park_id, bitrix_contact_id, bitrix_deal_id, bitrix_stage_id,
        hire_date, fleet_created_date, data_hash, first_name, last_name, middle_name,
        phone, employment_type, work_rule_id, vehicle_type, first_order_date,
        last_order_date, updated_at, create_at
      )
      SELECT
        yandex_profile_id, park_id, bitrix_contact_id, bitrix_deal_id, bitrix_stage_id,
        hire_date, fleet_created_date, data_hash, first_name, last_name, middle_name,
        phone, employment_type, work_rule_id, vehicle_type, first_order_date,
        last_order_date, updated_at, create_at
      FROM yandex_fleet_profile_old
    `);

    await queryRunner.query(`DROP TABLE yandex_fleet_profile_old`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
