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

function log(message: string): void {
  console.log(`[migrate-cargo-deals] ${message}`);
}

function profileLabel(profile: YandexFleetProfileEntity): string {
  const name = [profile.lastName, profile.firstName].filter(Boolean).join(' ');
  const park = PARK_NAME[profile.parkId] ?? profile.parkId;
  return `${park} / ${name || profile.yandexProfileId}`;
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
  log('Между запросами к Bitrix пауза 700 мс, на сделку уходит два запроса');

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
      log(
        `${position} ${label}: читаю сделку ${profile.bitrixDealId}, локальная стадия ${profile.bitrixStageId}`,
      );
      const deal = await bitrix.getDeal(profile.bitrixDealId);
      const alreadyMoved =
        String(deal.CATEGORY_ID ?? '') === BitrixDealCategory.YANDEX_CARGO &&
        deal.STAGE_ID === profile.bitrixStageId;

      if (alreadyMoved) {
        skipped++;
        log(
          `${position} ${label}: уже в cargo (${deal.STAGE_ID}), пропуск. Итог: перенесено ${moved}, пропущено ${skipped}, ошибок ${failed}`,
        );
        continue;
      }

      log(
        `${position} ${label}: категория ${String(deal.CATEGORY_ID ?? '—')}, стадия ${deal.STAGE_ID ?? '—'} → ${BitrixDealCategory.YANDEX_CARGO} / ${profile.bitrixStageId}`,
      );
      const updated = await bitrix.updateDeal(profile.bitrixDealId, {
        CATEGORY_ID: BitrixDealCategory.YANDEX_CARGO,
        STAGE_ID: profile.bitrixStageId,
      });

      if (!updated) {
        failed++;
        console.error(
          `[migrate-cargo-deals] ${position} ${label}: Bitrix вернул false для сделки ${profile.bitrixDealId}`,
        );
        continue;
      }

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
