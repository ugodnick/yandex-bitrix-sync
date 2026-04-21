import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import AppDataSource from './typeorm';
import { loadConfig } from './app.config';
import { Container } from './container';
import { YandexFleetService } from './yandex-fleet/yandex-fleet.service';
import { BitrixService } from './bitrix/bitrix.service';
import { BitrixCrmWebhookBody, YANDEX_TO_BITRIX_PARK } from './bitrix/bitrix.type';
import { YandexFleetProfileEntity } from './yandex-fleet/yandex-fleet-profile/yandex-fleet-profile.entity';
import { YandexFleetProfileService } from './yandex-fleet/yandex-fleet-profile/yandex-fleet-profile.service';
import { YandexFleetWorkRuleEntity } from './yandex-fleet/yandex-fleet-work-rule/yandex-fleet-work-rule.entity';
import { YandexFleetWorkRuleService } from './yandex-fleet/yandex-fleet-work-rule/yandex-fleet-work-rules.service';
import { YandexFleetOrderService } from './yandex-fleet/yandex-fleet-order/yandex-fleet-order.service';
import { BitrixWebhookService } from './bitrix/bitrix-webhook.service';

dotenv.config();

const config = loadConfig();
const container = new Container();

const app = express();
const PORT = process.env.PORT || 3000;

async function bootstrap() {
  const database = await AppDataSource.initialize();
  const yandexFleetProfileRepository = database.getRepository(YandexFleetProfileEntity);
  const yandexWorkRulesRepository = database.getRepository(YandexFleetWorkRuleEntity);

  container.add(YandexFleetService, () => new YandexFleetService(config.yandexApiKeys));

  container.add(BitrixService, () => new BitrixService(config.inboundWebhookUrl));
  container.add(
    BitrixWebhookService,
    () =>
      new BitrixWebhookService(
        container.get(YandexFleetService),
        container.get(YandexFleetProfileService),
        container.get(YandexFleetWorkRuleService),
        container.get(BitrixService),
      ),
  );

  container.add(
    YandexFleetProfileService,
    () =>
      new YandexFleetProfileService(
        container.get(YandexFleetService),
        container.get(BitrixService),
        yandexFleetProfileRepository,
      ),
  );

  container.add(
    YandexFleetWorkRuleService,
    () =>
      new YandexFleetWorkRuleService(
        yandexWorkRulesRepository,
        container.get(YandexFleetService),
        container.get(BitrixService),
      ),
  );
  container.add(
    YandexFleetOrderService,
    () =>
      new YandexFleetOrderService(
        yandexFleetProfileRepository,
        container.get(YandexFleetService),
        container.get(BitrixService),
      ),
  );

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.post('/bitrix-webhook', async (req: Request, res: Response) => {
    const expectedToken = config.expectedToken;
    const receivedToken = req.body?.auth?.application_token;

    if (receivedToken !== expectedToken) {
      res.status(403).send('Forbidden');
      return;
    }
    res.status(200).send();
    const bitrixWebhookService = container.get(BitrixWebhookService);
    await bitrixWebhookService
      .handleInboundWebhook(req.body as BitrixCrmWebhookBody)
      .catch(console.error);
  });

  let isSyncing = false;

  cron.schedule(
    '*/10 * * * *',
    async () => {
      if (isSyncing) {
        console.log('[Cron] Предыдущая синхронизация еще не завершена. Пропускаем такт.');
        return;
      }

      isSyncing = true;
      console.log('[Cron] Запуск поллинга Яндекса...');

      try {
        const profileService = container.get(YandexFleetProfileService);
        const workRulesService = container.get(YandexFleetWorkRuleService);
        const yandexParkIds = Object.keys(YANDEX_TO_BITRIX_PARK);

        for (const parkId of yandexParkIds) {
          await workRulesService.syncParkWorkRules(parkId);
          await profileService.syncProfiles(parkId);
        }

        console.log('[Cron] Цикл поллинга завершен.');
      } catch (error) {
        console.error('[Cron] Глобальная ошибка крона:', error);
      } finally {
        isSyncing = false;
      }
    },
    { runOnInit: true },
  );

  let isOrdersSyncing = false;

  cron.schedule('* */1 * * *', async () => {
    if (isOrdersSyncing) {
      console.log('[Cron] Предыдущая синхронизация заказов еще не завершена. Пропускаем такт.');
      return;
    }

    isOrdersSyncing = true;
    console.log('[Cron] Запуск поллинга заказов Яндекса...');

    try {
      const yandexFleetOrderService = container.get(YandexFleetOrderService);
      const yandexParkIds = Object.keys(YANDEX_TO_BITRIX_PARK);

      for (const parkId of yandexParkIds) {
        await yandexFleetOrderService.syncDriverStatuses(parkId);
      }

      console.log('[Cron] Цикл поллинга заказов завершен.');
    } catch (error) {
      console.error('[Cron] Глобальная ошибка крона:', error);
    } finally {
      isOrdersSyncing = false;
    }
  });

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

bootstrap().catch(console.error);
