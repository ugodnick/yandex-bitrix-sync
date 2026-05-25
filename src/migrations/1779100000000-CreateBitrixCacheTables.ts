import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBitrixCacheTables1779100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE bitrix_contact (
        bitrix_id VARCHAR PRIMARY KEY NOT NULL,
        first_name VARCHAR,
        last_name VARCHAR,
        second_name VARCHAR,
        phone VARCHAR,
        bitrix_modified_at DATETIME,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE bitrix_deal (
        bitrix_id VARCHAR PRIMARY KEY NOT NULL,
        contact_id VARCHAR,
        date_create DATETIME,
        date_modify DATETIME,
        dispatcher_raw TEXT,
        vacancy_raw VARCHAR,
        aggregator_raw VARCHAR,
        comments TEXT,
        stage_id VARCHAR,
        source_id VARCHAR,
        source_description VARCHAR,
        city VARCHAR,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE bitrix_call (
        bitrix_id VARCHAR PRIMARY KEY NOT NULL,
        portal_user_id VARCHAR,
        manager_name VARCHAR,
        phone_number VARCHAR,
        call_type VARCHAR,
        call_duration VARCHAR,
        call_start_date DATETIME NOT NULL,
        call_failed_code VARCHAR,
        call_failed_reason VARCHAR,
        crm_entity_type VARCHAR,
        crm_entity_id VARCHAR,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_bitrix_call_start_date ON bitrix_call (call_start_date)
    `);

    await queryRunner.query(`
      CREATE TABLE bitrix_user (
        bitrix_id VARCHAR PRIMARY KEY NOT NULL,
        full_name VARCHAR NOT NULL DEFAULT '',
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE bitrix_sync_state (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sync_type VARCHAR NOT NULL,
        last_synced_to DATETIME,
        last_full_sync_at DATETIME,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (sync_type)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE bitrix_sync_state`);
    await queryRunner.query(`DROP TABLE bitrix_user`);
    await queryRunner.query(`DROP INDEX idx_bitrix_call_start_date`);
    await queryRunner.query(`DROP TABLE bitrix_call`);
    await queryRunner.query(`DROP TABLE bitrix_deal`);
    await queryRunner.query(`DROP TABLE bitrix_contact`);
  }
}
