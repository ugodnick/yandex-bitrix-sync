import { MigrationInterface, QueryRunner } from 'typeorm';

const CARGO_PARK_IDS = [
  '39a093d2301c426fa972ad7163345f12', // Амтур
  'c45bf27db32a4974b3edf382489ff246', // МАГИСТРАЛЬ
];

const DELIVERY_TO_CARGO_STAGE: Array<[string, string]> = [
  ['C3:NEW', 'C11:NEW'],
  ['C3:PREPARATION', 'C11:PREPARATION'],
  ['C3:UC_C44UC0', 'C11:PREPAYMENT_INVOIC'],
  ['C3:UC_8UHKSK', 'C11:EXECUTING'],
  ['C3:UC_LW45DH', 'C11:UC_KJS0L6'],
  ['C3:PREPAYMENT_INVOICE', 'C11:UC_2SOG1D'],
  ['C3:UC_2CL0T5', 'C11:FINAL_INVOICE'],
  ['C3:UC_46LTTM', 'C11:UC_SXVOY7'],
  ['C3:UC_023RU4', 'C11:UC_VD1GRS'],
  ['C3:UC_N3IZNW', 'C11:UC_PP7LAN'],
  ['C3:UC_M9CKHN', 'C11:UC_FEH2BJ'],
  ['C3:UC_O9PXU5', 'C11:UC_BTKULW'],
  ['C3:UC_NFJLN9', 'C11:UC_NAYR0Z'],
  ['C3:UC_S71G81', 'C11:UC_K069W3'],
  ['C3:UC_242CHI', 'C11:UC_HI0AM2'],
  ['C3:UC_ED0AAW', 'C11:UC_1E4UM5'],
  ['C3:UC_1A121F', 'C11:UC_1505J0'],
  ['C3:WON', 'C11:WON'],
  ['C3:LOSE', 'C11:LOSE'],
  ['C3:APOLOGY', 'C11:APOLOGY'],
];

export class MigrateParksToCargo1788100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.remapStages(queryRunner, DELIVERY_TO_CARGO_STAGE);
    await queryRunner.query(
      `UPDATE yandex_fleet_park SET type = 'cargo' WHERE id IN (?, ?)`,
      CARGO_PARK_IDS,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE yandex_fleet_park SET type = 'delivery' WHERE id IN (?, ?)`,
      CARGO_PARK_IDS,
    );
    await this.remapStages(
      queryRunner,
      DELIVERY_TO_CARGO_STAGE.map(([deliveryStage, cargoStage]) => [cargoStage, deliveryStage]),
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
          WHERE bitrix_stage_id = ? AND park_id IN (?, ?)
        `,
        [toStage, fromStage, ...CARGO_PARK_IDS],
      );
      await queryRunner.query(
        `
          UPDATE bitrix_deal
          SET stage_id = ?
          WHERE stage_id = ?
            AND bitrix_id IN (
              SELECT bitrix_deal_id
              FROM yandex_fleet_profile
              WHERE park_id IN (?, ?)
            )
        `,
        [toStage, fromStage, ...CARGO_PARK_IDS],
      );
    }
  }
}
