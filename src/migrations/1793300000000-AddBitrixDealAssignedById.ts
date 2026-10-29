import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBitrixDealAssignedById1793300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE bitrix_deal ADD COLUMN assigned_by_id VARCHAR
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE bitrix_deal DROP COLUMN assigned_by_id
    `);
  }
}
