import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateYandexFleetSyncState1778230507899 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE yandex_fleet_sync_state (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        park_id VARCHAR NOT NULL,
        sync_type VARCHAR NOT NULL,
        last_synced_to DATETIME,
        last_run_at DATETIME,
        status VARCHAR NOT NULL DEFAULT 'idle',
        last_error TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (park_id) REFERENCES yandex_fleet_park(id),
        UNIQUE (park_id, sync_type)
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_sync_state_park_type 
      ON yandex_fleet_sync_state (park_id, sync_type)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_sync_state_park_type`);
    await queryRunner.query(`DROP TABLE yandex_fleet_sync_state`);
  }
}
