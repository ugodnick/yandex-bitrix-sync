import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBitrixContactDateCreate1779300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE bitrix_contact ADD COLUMN date_create DATETIME
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE bitrix_contact DROP COLUMN date_create
    `);
  }
}
