import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProfileBalance1779400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE yandex_fleet_profile ADD COLUMN balance VARCHAR
    `);
    await queryRunner.query(`
      ALTER TABLE yandex_fleet_profile ADD COLUMN balance_synced_at DATETIME
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE yandex_fleet_profile DROP COLUMN balance_synced_at
    `);
    await queryRunner.query(`
      ALTER TABLE yandex_fleet_profile DROP COLUMN balance
    `);
  }
}
