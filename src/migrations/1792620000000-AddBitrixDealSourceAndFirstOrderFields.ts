import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBitrixDealSourceAndFirstOrderFields1792620000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE bitrix_deal ADD COLUMN sources_raw TEXT
    `);
    await queryRunner.query(`
      ALTER TABLE bitrix_deal ADD COLUMN first_order_transferred_by_raw VARCHAR
    `);
    await queryRunner.query(`
      ALTER TABLE bitrix_deal ADD COLUMN first_order_transferred_at_raw VARCHAR
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE bitrix_deal DROP COLUMN first_order_transferred_at_raw
    `);
    await queryRunner.query(`
      ALTER TABLE bitrix_deal DROP COLUMN first_order_transferred_by_raw
    `);
    await queryRunner.query(`
      ALTER TABLE bitrix_deal DROP COLUMN sources_raw
    `);
  }
}
