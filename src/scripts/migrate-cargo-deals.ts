import dotenv from 'dotenv';
import { In } from 'typeorm';
import AppDataSource from '../typeorm';
import { BitrixDealCategory } from '../bitrix/deal/bitrix-deal.type';
import { BitrixService } from '../bitrix/bitrix.service';
import { YandexFleetProfileEntity } from '../yandex-fleet/profile/yandex-fleet-profile.entity';

dotenv.config();

const CARGO_PARK_IDS = [
  '39a093d2301c426fa972ad7163345f12', // Амтур
  'c45bf27db32a4974b3edf382489ff246', // МАГИСТРАЛЬ
];

const PARK_NAME: Record<string, string> = {
  '39a093d2301c426fa972ad7163345f12': 'Амтур',
  c45bf27db32a4974b3edf382489ff246: 'Магистраль',
};

const DELIVERY_TO_CARGO_STAGE: Record<string, string> = {
  'C3:NEW': 'C11:NEW',
  'C3:PREPARATION': 'C11:PREPARATION',
  'C3:UC_C44UC0': 'C11:PREPAYMENT_INVOIC',
  'C3:UC_8UHKSK': 'C11:EXECUTING',
  'C3:UC_LW45DH': 'C11:UC_KJS0L6',
  'C3:PREPAYMENT_INVOICE': 'C11:UC_2SOG1D',
  'C3:UC_2CL0T5': 'C11:FINAL_INVOICE',
  'C3:UC_46LTTM': 'C11:UC_SXVOY7',
  'C3:UC_023RU4': 'C11:UC_VD1GRS',
  'C3:UC_N3IZNW': 'C11:UC_PP7LAN',
  'C3:UC_M9CKHN': 'C11:UC_FEH2BJ',
  'C3:UC_O9PXU5': 'C11:UC_BTKULW',
  'C3:UC_NFJLN9': 'C11:UC_NAYR0Z',
  'C3:UC_S71G81': 'C11:UC_K069W3',
  'C3:UC_242CHI': 'C11:UC_HI0AM2',
  'C3:UC_ED0AAW': 'C11:UC_1E4UM5',
  'C3:UC_1A121F': 'C11:UC_1505J0',
  'C3:WON': 'C11:WON',
  'C3:LOSE': 'C11:LOSE',
  'C3:APOLOGY': 'C11:APOLOGY',
};

const DEAL_ENTITY_TYPE_ID = 2;

interface BitrixItemUpdateResponse {
  result?: { item?: { categoryId?: number | string; stageId?: string } };
  error?: string;
  error_description?: string;
}

function log(message: string): void {
  console.log(`[migrate-cargo-deals] ${message}`);
}

function profileLabel(profile: YandexFleetProfileEntity): string {
  const name = [profile.lastName, profile.firstName].filter(Boolean).join(' ');
  const park = PARK_NAME[profile.parkId] ?? profile.parkId;
  return `${park} / ${name || profile.yandexProfileId}`;
}

function cargoStage(stageId: string): string {
  return DELIVERY_TO_CARGO_STAGE[stageId] ?? stageId;
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

  log(
    `сделка ${dealId}: после общего переноса в Bitrix категория ${placed.categoryId || '—'}, стадия ${placed.stageId || '—'}. Повторяю отдельно`,
  );
  await updateDealItem(bitrix, dealId, { categoryId });
  await updateDealItem(bitrix, dealId, { stageId: stage });
  return readDealPlacement(bitrix, dealId);
}

async function main(): Promise<void> {
  log('Старт');

  const webhookUrl = process.env.BITRIX_INBOUND_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error('CRITICAL: Missing required environment variable: BITRIX_INBOUND_WEBHOOK_URL');
  }

  log('Подключение к базе...');
  const database = await AppDataSource.initialize();
  log('База подключена. Читаю профили Амтур и Магистраль...');

  const bitrix = new BitrixService(webhookUrl);
  const profiles = await database.getRepository(YandexFleetProfileEntity).find({
    where: { parkId: In(CARGO_PARK_IDS) },
    order: { parkId: 'ASC', yandexProfileId: 'ASC' },
  });

  const byPark = CARGO_PARK_IDS.map(
    (parkId) => `${PARK_NAME[parkId]}: ${profiles.filter((p) => p.parkId === parkId).length}`,
  ).join(', ');
  log(`Найдено профилей: ${profiles.length} (${byPark})`);
  log('Перенос через crm.item.update: воронка 11 и локальная стадия профиля');

  let moved = 0;
  let skipped = 0;
  let failed = 0;
  const startedAt = Date.now();

  for (let index = 0; index < profiles.length; index++) {
    const profile = profiles[index];
    const position = `${index + 1}/${profiles.length}`;
    const label = profileLabel(profile);

    if (!profile.bitrixDealId) {
      skipped++;
      console.warn(`[migrate-cargo-deals] ${position} ${label}: нет bitrix_deal_id, пропуск`);
      continue;
    }

    try {
      const stage = cargoStage(profile.bitrixStageId);
      const before = await readDealPlacement(bitrix, profile.bitrixDealId);
      log(
        `${position} ${label}: сделка ${profile.bitrixDealId} сейчас категория ${before.categoryId || '—'}, стадия ${before.stageId || '—'}; цель 11 / ${stage}`,
      );

      if (before.categoryId === BitrixDealCategory.YANDEX_CARGO && before.stageId === stage) {
        skipped++;
        log(
          `${position} ${label}: уже в cargo на нужной стадии, пропуск. Итог: перенесено ${moved}, пропущено ${skipped}, ошибок ${failed}`,
        );
        continue;
      }

      const placed = await moveDealToCargo(bitrix, profile.bitrixDealId, stage);
      if (placed.categoryId !== BitrixDealCategory.YANDEX_CARGO || placed.stageId !== stage) {
        failed++;
        console.error(
          `[migrate-cargo-deals] ${position} ${label}: в Bitrix осталось категория ${placed.categoryId || '—'}, стадия ${placed.stageId || '—'}`,
        );
        continue;
      }

      log(
        `${position} ${label}: в Bitrix теперь категория ${placed.categoryId}, стадия ${placed.stageId}`,
      );

      moved++;
      const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
      log(
        `${position} ${label}: перенесена за ${elapsedSec} с от старта. Итог: перенесено ${moved}, пропущено ${skipped}, ошибок ${failed}`,
      );
    } catch (error) {
      failed++;
      console.error(
        `[migrate-cargo-deals] ${position} ${label}: сделка ${profile.bitrixDealId}:`,
        error,
      );
    }
  }

  const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
  log(`Готово за ${elapsedSec} с. Перенесено: ${moved}, пропущено: ${skipped}, ошибок: ${failed}.`);

  await database.destroy();
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
