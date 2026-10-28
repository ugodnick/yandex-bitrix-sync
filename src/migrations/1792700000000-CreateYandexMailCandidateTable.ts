import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateYandexMailCandidateTable1792700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE yandex_mail_candidate (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id VARCHAR NOT NULL,
        received_at DATETIME,
        subject VARCHAR,
        full_name VARCHAR,
        phone_raw VARCHAR,
        phone_digits VARCHAR,
        park_name VARCHAR,
        park_id VARCHAR,
        source_raw VARCHAR,
        status VARCHAR NOT NULL,
        bitrix_deal_id VARCHAR,
        applied_at DATETIME,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (message_id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_yandex_mail_candidate_phone ON yandex_mail_candidate (phone_digits)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE yandex_mail_candidate`);
  }
}
