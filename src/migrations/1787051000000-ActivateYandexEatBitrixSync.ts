import { MigrationInterface, QueryRunner } from 'typeorm';

export class ActivateYandexEatBitrixSync1787051000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
        UPDATE yandex_fleet_park
        SET bitrix_dispatcher_id = ?, is_active = 1
        WHERE id = ?
      `,
      ['429', '43c7a01498ae430588d912eed9d30f6d'],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
        UPDATE yandex_fleet_park
        SET bitrix_dispatcher_id = NULL
        WHERE id = ?
      `,
      ['43c7a01498ae430588d912eed9d30f6d'],
    );
  }
}
