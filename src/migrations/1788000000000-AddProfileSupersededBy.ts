import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProfileSupersededBy1788000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE yandex_fleet_profile ADD COLUMN superseded_by_profile_id VARCHAR
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE yandex_fleet_profile DROP COLUMN superseded_by_profile_id
    `);
  }
}
