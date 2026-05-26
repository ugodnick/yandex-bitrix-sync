import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBitrixDealProfileId1779200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE bitrix_deal ADD COLUMN profile_id VARCHAR
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE bitrix_deal DROP COLUMN profile_id
    `);
  }
}
