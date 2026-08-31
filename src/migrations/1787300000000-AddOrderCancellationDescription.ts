import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderCancellationDescription1787300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE yandex_fleet_order ADD COLUMN cancellation_description VARCHAR
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE yandex_fleet_order DROP COLUMN cancellation_description
    `);
  }
}
