import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateYandexFleetSupplyHoursTable1779600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE yandex_fleet_supply_hours (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile_id VARCHAR NOT NULL,
        park_id VARCHAR NOT NULL,
        period_type VARCHAR NOT NULL,
        period_from DATETIME NOT NULL,
        period_to DATETIME NOT NULL,
        supply_duration_seconds INTEGER NOT NULL DEFAULT 0,
        status VARCHAR NOT NULL,
        last_error TEXT,
        synced_at DATETIME,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (park_id) REFERENCES yandex_fleet_park(id),
        UNIQUE (profile_id, park_id, period_type, period_from, period_to)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE yandex_fleet_supply_hours`);
  }
}
