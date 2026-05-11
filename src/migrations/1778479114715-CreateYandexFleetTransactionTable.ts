import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateYandexFleetTransaction1778479114715 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE yandex_fleet_transaction (
        id VARCHAR PRIMARY KEY,
        park_id VARCHAR NOT NULL,
        profile_id VARCHAR NOT NULL,
        order_id VARCHAR,
        category_id VARCHAR NOT NULL,
        category_name VARCHAR NOT NULL,
        amount VARCHAR NOT NULL,
        event_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (park_id) REFERENCES yandex_fleet_park(id)
      )
    `);

    await queryRunner.query(
      `CREATE INDEX idx_transaction_park_id ON yandex_fleet_transaction (park_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_transaction_profile_id ON yandex_fleet_transaction (profile_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_transaction_profile_event ON yandex_fleet_transaction (profile_id, event_at)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_transaction_order_id ON yandex_fleet_transaction (order_id)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE yandex_fleet_transaction`);
  }
}
