import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateLegacyYandexEatStages1787175000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const directStageMap: Array<[string, string]> = [
      ['eat:NOT_PROCESSED', 'C7:NEW'],
      ['eat:ORDERS25', 'C7:UC_PLVLY1'],
      ['eat:OUTFLOW', 'C7:UC_UHX615'],
      ['eat:COLD', 'C7:UC_I5X7LC'],
      ['eat:ARCHIVE', 'C7:UC_LO4AMW'],
    ];

    for (const [legacyStage, bitrixStage] of directStageMap) {
      await queryRunner.query(
        `
          UPDATE yandex_fleet_profile
          SET bitrix_stage_id = ?
          WHERE park_id = ? AND bitrix_stage_id = ?
        `,
        [bitrixStage, '43c7a01498ae430588d912eed9d30f6d', legacyStage],
      );
    }

    await queryRunner.query(
      `
        WITH completed_orders AS (
          SELECT
            profile_id,
            COUNT(id) AS completed_count
          FROM yandex_fleet_order
          WHERE park_id = ? AND status = 'complete'
          GROUP BY profile_id
        )
        UPDATE yandex_fleet_profile
        SET bitrix_stage_id = CASE
          WHEN COALESCE(
            (SELECT completed_count
             FROM completed_orders
             WHERE completed_orders.profile_id = yandex_fleet_profile.yandex_profile_id),
            0
          ) > 100 THEN 'C7:FINAL_INVOICE'
          ELSE 'C7:EXECUTING'
        END
        WHERE park_id = ? AND bitrix_stage_id = 'eat:WORKING'
      `,
      ['43c7a01498ae430588d912eed9d30f6d', '43c7a01498ae430588d912eed9d30f6d'],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const stageMap: Array<[string, string]> = [
      ['C7:NEW', 'eat:NOT_PROCESSED'],
      ['C7:UC_PLVLY1', 'eat:ORDERS25'],
      ['C7:UC_UHX615', 'eat:OUTFLOW'],
      ['C7:UC_I5X7LC', 'eat:COLD'],
      ['C7:UC_LO4AMW', 'eat:ARCHIVE'],
    ];

    for (const [bitrixStage, legacyStage] of stageMap) {
      await queryRunner.query(
        `
          UPDATE yandex_fleet_profile
          SET bitrix_stage_id = ?
          WHERE park_id = ? AND bitrix_stage_id = ?
        `,
        [legacyStage, '43c7a01498ae430588d912eed9d30f6d', bitrixStage],
      );
    }

    await queryRunner.query(
      `
        UPDATE yandex_fleet_profile
        SET bitrix_stage_id = 'eat:WORKING'
        WHERE park_id = ? AND bitrix_stage_id IN ('C7:EXECUTING', 'C7:FINAL_INVOICE')
      `,
      ['43c7a01498ae430588d912eed9d30f6d'],
    );
  }
}
