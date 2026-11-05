import dotenv from 'dotenv';
import AppDataSource from '../typeorm';
import { BitrixDealCategory } from '../bitrix/deal/bitrix-deal.type';
import { BitrixService } from '../bitrix/bitrix.service';
import { YandexFleetProfileEntity } from '../yandex-fleet/profile/yandex-fleet-profile.entity';

dotenv.config();

const AZIMUT_PARK_ID = '4ef37bf7e6294263ae416f86a5539d11';

const TAXI_TO_CARGO_STAGE: Record<string, string> = {
  'C5:NEW': 'C11:NEW',
  'C5:PREPARATION': 'C11:PREPARATION',
  'C5:UC_1CV6CN': 'C11:PREPAYMENT_INVOIC',
  'C5:EXECUTING': 'C11:EXECUTING',
  'C5:PREPAYMENT_INVOICE': 'C11:UC_KJS0L6',
  'C5:FINAL_INVOICE': 'C11:UC_2SOG1D',
  'C5:UC_XV3P8H': 'C11:FINAL_INVOICE',
  'C5:UC_RREXQ0': 'C11:UC_SXVOY7',
  'C5:UC_BB8B8W': 'C11:UC_VD1GRS',
  'C5:UC_LRRSRU': 'C11:UC_PP7LAN',
  'C5:UC_QKD6SW': 'C11:UC_FEH2BJ',
  'C5:UC_OUUMS0': 'C11:UC_BTKULW',
  'C5:UC_QF9VUT': 'C11:UC_NAYR0Z',
  'C5:UC_QOQVBZ': 'C11:UC_K069W3',
  'C5:UC_O5OZKJ': 'C11:UC_HI0AM2',
  'C5:UC_5QN2WO': 'C11:UC_1E4UM5',
  'C5:UC_S1PJEX': 'C11:UC_1505J0',
  'C5:WON': 'C11:WON',
  'C5:LOSE': 'C11:LOSE',
  'C5:APOLOGY': 'C11:APOLOGY',
};

const DEAL_ENTITY_TYPE_ID = 2;

interface BitrixItemUpdateResponse {
  result?: { item?: { categoryId?: number | string; stageId?: string } };
  error?: string;
  error_description?: string;
}

function log(message: string): void {
  console.log(`[migrate-azimut-to-cargo] ${message}`);
}

function cargoStage(stageId: string): string {
  return TAXI_TO_CARGO_STAGE[stageId] ?? stageId;
}

async function updateDealItem(
  bitrix: BitrixService,
  dealId: string,
  fields: { categoryId?: number; stageId?: string },
): Promise<void> {
  const data = await bitrix.client.post<BitrixItemUpdateResponse>('crm.item.update.json', {
    entityTypeId: DEAL_ENTITY_TYPE_ID,
    id: Number(dealId),
    fields,
  });

  if (data.error) {
    throw new Error(data.error_description || data.error);
  }
}

async function readDealPlacement(
  bitrix: BitrixService,
  dealId: string,
): Promise<{ categoryId: string; stageId: string }> {
  const deal = await bitrix.getDeal(dealId);
  return {
    categoryId: String(deal.CATEGORY_ID ?? ''),
    stageId: deal.STAGE_ID ?? '',
  };
}

async function moveDealToCargo(
  bitrix: BitrixService,
  dealId: string,
  stage: string,
): Promise<{ categoryId: string; stageId: string }> {
  const categoryId = Number(BitrixDealCategory.YANDEX_CARGO);

  try {
    await updateDealItem(bitrix, dealId, { categoryId, stageId: stage });
  } catch (error) {
    log(
      `сделка ${dealId}: общий перенос не прошёл (${error instanceof Error ? error.message : String(error)}), меняю воронку и стадию отдельно`,
    );
    await updateDealItem(bitrix, dealId, { categoryId });
    await updateDealItem(bitrix, dealId, { stageId: stage });
  }

  const placed = await readDealPlacement(bitrix, dealId);
  if (placed.categoryId === BitrixDealCategory.YANDEX_CARGO && placed.stageId === stage) {
    return placed;
  }

  await updateDealItem(bitrix, dealId, { categoryId });
  await updateDealItem(bitrix, dealId, { stageId: stage });
  return readDealPlacement(bitrix, dealId);
}

async function main(): Promise<void> {
  const webhookUrl = process.env.BITRIX_INBOUND_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error('CRITICAL: Missing required environment variable: BITRIX_INBOUND_WEBHOOK_URL');
  }

  const database = await AppDataSource.initialize();
  const bitrix = new BitrixService(webhookUrl);
  const profiles = await database.getRepository(YandexFleetProfileEntity).find({
    where: { parkId: AZIMUT_PARK_ID },
    order: { yandexProfileId: 'ASC' },
  });

  await database.query(`UPDATE yandex_fleet_park SET type = 'cargo' WHERE id = ?`, [
    AZIMUT_PARK_ID,
  ]);
  log(`Профилей Азимута: ${profiles.length}. Воронка ${BitrixDealCategory.YANDEX_CARGO}`);

  let moved = 0;
  let skipped = 0;
  let failed = 0;

  for (let index = 0; index < profiles.length; index++) {
    const profile = profiles[index];
    const position = `${index + 1}/${profiles.length}`;
    const label =
      [profile.lastName, profile.firstName].filter(Boolean).join(' ') || profile.yandexProfileId;

    if (!profile.bitrixDealId) {
      skipped++;
      console.warn(`[migrate-azimut-to-cargo] ${position} ${label}: нет сделки, пропуск`);
      continue;
    }

    try {
      const stage = cargoStage(profile.bitrixStageId);
      const before = await readDealPlacement(bitrix, profile.bitrixDealId);
      if (before.categoryId === BitrixDealCategory.YANDEX_CARGO && before.stageId === stage) {
        skipped++;
        log(`${position} ${label}: сделка ${profile.bitrixDealId} уже в грузовой воронке`);
      } else {
        const placed = await moveDealToCargo(bitrix, profile.bitrixDealId, stage);
        if (placed.categoryId !== BitrixDealCategory.YANDEX_CARGO || placed.stageId !== stage) {
          failed++;
          console.error(
            `[migrate-azimut-to-cargo] ${position} ${label}: в Bitrix осталось категория ${placed.categoryId || '—'}, стадия ${placed.stageId || '—'}`,
          );
          continue;
        }
        moved++;
        log(`${position} ${label}: сделка ${profile.bitrixDealId} перенесена на ${placed.stageId}`);
      }

      profile.bitrixStageId = stage;
      await database.getRepository(YandexFleetProfileEntity).save(profile);
      await database.query(`UPDATE bitrix_deal SET stage_id = ? WHERE bitrix_id = ?`, [
        stage,
        profile.bitrixDealId,
      ]);
    } catch (error) {
      failed++;
      console.error(
        `[migrate-azimut-to-cargo] ${position} ${label}: сделка ${profile.bitrixDealId}:`,
        error,
      );
    }
  }

  log(`Готово. Перенесено: ${moved}, пропущено: ${skipped}, ошибок: ${failed}.`);
  await database.destroy();
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
