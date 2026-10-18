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

async function main(): Promise<void> {
  const webhookUrl = process.env.BITRIX_INBOUND_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error('CRITICAL: Missing required environment variable: BITRIX_INBOUND_WEBHOOK_URL');
  }

  const database = await AppDataSource.initialize();
  const bitrix = new BitrixService(webhookUrl);
  const profiles = await database.getRepository(YandexFleetProfileEntity).find({
    where: { parkId: In(CARGO_PARK_IDS) },
  });

  let moved = 0;
  let skipped = 0;
  let failed = 0;

  for (const profile of profiles) {
    if (!profile.bitrixDealId) {
      skipped++;
      console.warn(`[migrate-cargo-deals] Профиль ${profile.yandexProfileId} без сделки`);
      continue;
    }

    try {
      const deal = await bitrix.getDeal(profile.bitrixDealId);
      const alreadyMoved =
        String(deal.CATEGORY_ID ?? '') === BitrixDealCategory.YANDEX_CARGO &&
        deal.STAGE_ID === profile.bitrixStageId;

      if (alreadyMoved) {
        skipped++;
        continue;
      }

      const updated = await bitrix.updateDeal(profile.bitrixDealId, {
        CATEGORY_ID: BitrixDealCategory.YANDEX_CARGO,
        STAGE_ID: profile.bitrixStageId,
      });

      if (!updated) {
        failed++;
        console.error(`[migrate-cargo-deals] Сделка ${profile.bitrixDealId} не обновлена`);
        continue;
      }

      moved++;
    } catch (error) {
      failed++;
      console.error(`[migrate-cargo-deals] Сделка ${profile.bitrixDealId}:`, error);
    }
  }

  console.log(
    `[migrate-cargo-deals] Готово. Перенесено: ${moved}, пропущено: ${skipped}, ошибок: ${failed}.`,
  );

  await database.destroy();
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
