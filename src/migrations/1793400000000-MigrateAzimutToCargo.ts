import { MigrationInterface, QueryRunner } from 'typeorm';

const AZIMUT_PARK_ID = '4ef37bf7e6294263ae416f86a5539d11';

const TAXI_TO_CARGO_STAGE: Array<[string, string]> = [
  ['C5:NEW', 'C11:NEW'],
  ['C5:PREPARATION', 'C11:PREPARATION'],
  ['C5:UC_1CV6CN', 'C11:PREPAYMENT_INVOIC'],
  ['C5:EXECUTING', 'C11:EXECUTING'],
  ['C5:PREPAYMENT_INVOICE', 'C11:UC_KJS0L6'],
  ['C5:FINAL_INVOICE', 'C11:UC_2SOG1D'],
  ['C5:UC_XV3P8H', 'C11:FINAL_INVOICE'],
  ['C5:UC_RREXQ0', 'C11:UC_SXVOY7'],
  ['C5:UC_BB8B8W', 'C11:UC_VD1GRS'],
  ['C5:UC_LRRSRU', 'C11:UC_PP7LAN'],
  ['C5:UC_QKD6SW', 'C11:UC_FEH2BJ'],
  ['C5:UC_OUUMS0', 'C11:UC_BTKULW'],
  ['C5:UC_QF9VUT', 'C11:UC_NAYR0Z'],
  ['C5:UC_QOQVBZ', 'C11:UC_K069W3'],
  ['C5:UC_O5OZKJ', 'C11:UC_HI0AM2'],
  ['C5:UC_5QN2WO', 'C11:UC_1E4UM5'],
  ['C5:UC_S1PJEX', 'C11:UC_1505J0'],
  ['C5:WON', 'C11:WON'],
  ['C5:LOSE', 'C11:LOSE'],
  ['C5:APOLOGY', 'C11:APOLOGY'],
];

export class MigrateAzimutToCargo1793400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.remapStages(queryRunner, TAXI_TO_CARGO_STAGE);
    await queryRunner.query(`UPDATE yandex_fleet_park SET type = 'cargo' WHERE id = ?`, [
      AZIMUT_PARK_ID,
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE yandex_fleet_park SET type = 'taxi' WHERE id = ?`, [
      AZIMUT_PARK_ID,
    ]);
    await this.remapStages(
      queryRunner,
      TAXI_TO_CARGO_STAGE.map(([taxiStage, cargoStage]) => [cargoStage, taxiStage]),
    );
  }

  private async remapStages(
    queryRunner: QueryRunner,
    stageMap: Array<[string, string]>,
  ): Promise<void> {
    for (const [fromStage, toStage] of stageMap) {
      await queryRunner.query(
        `
          UPDATE yandex_fleet_profile
          SET bitrix_stage_id = ?
          WHERE bitrix_stage_id = ? AND park_id = ?
        `,
        [toStage, fromStage, AZIMUT_PARK_ID],
      );
      await queryRunner.query(
        `
          UPDATE bitrix_deal
          SET stage_id = ?
          WHERE stage_id = ?
            AND bitrix_id IN (
              SELECT bitrix_deal_id
              FROM yandex_fleet_profile
              WHERE park_id = ?
            )
        `,
        [toStage, fromStage, AZIMUT_PARK_ID],
      );
    }
  }
}
