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
import { GoogleSheetsAPIService } from './google-sheet/google-sheet.service';
import { YandexFleetSheetExportService } from './yandex-fleet/yandex-fleet-profile/yandex-fleet-sheet-export.service';
import { join } from 'path';
import { YandexFleetOrderEntity } from './yandex-fleet/yandex-fleet-order/yandex-fleet-order.entity';
import { DataSource } from 'typeorm';

dotenv.config();

const config = loadConfig();
const container = new Container();

const app = express();
const PORT = process.env.PORT || 3000;
const yandexParkIds = Object.keys(YANDEX_TO_BITRIX_PARK);

async function initDatabase(): Promise<DataSource> {
  const database = await AppDataSource.initialize();
  await database.query('PRAGMA journal_mode = WAL');
  await database.query('PRAGMA synchronous = NORMAL');
  await database.query('PRAGMA busy_timeout = 5000');
  await database.query('PRAGMA foreign_keys = ON');

  return database;
}

function initServices(database: DataSource): void {
  const yandexFleetProfileRepository = database.getRepository(YandexFleetProfileEntity);
  const yandexFleetWorkRulesRepository = database.getRepository(YandexFleetWorkRuleEntity);
  const yandexFleetOrderRepository = database.getRepository(YandexFleetOrderEntity);

  container.add(YandexFleetService, () => new YandexFleetService(config.yandexApiKeys));
  container.add(BitrixService, () => new BitrixService(config.inboundWebhookUrl));
  container.add(
    BitrixWebhookService,
    () =>
      new BitrixWebhookService(
        yandexFleetProfileRepository,
        container.get(YandexFleetService),
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
        container.get(YandexFleetOrderService),
        yandexFleetProfileRepository,
      ),
  );
  container.add(
    YandexFleetWorkRuleService,
    () =>
      new YandexFleetWorkRuleService(
        yandexFleetWorkRulesRepository,
        container.get(YandexFleetService),
      ),
  );
  container.add(
    GoogleSheetsAPIService,
    () =>
      new GoogleSheetsAPIService({
        keyFilePath: join(__dirname, '..', 'google-sheets-credentials.json'),
        spreadsheetId: config.googleSheetsSheetId,
      }),
  );
  container.add(
    YandexFleetWorkRuleService,
    () =>
      new YandexFleetWorkRuleService(
        yandexFleetWorkRulesRepository,
        container.get(YandexFleetService),
      ),
  );
  container.add(
    YandexFleetOrderService,
    () =>
      new YandexFleetOrderService(yandexFleetOrderRepository, container.get(YandexFleetService)),
  );
  container.add(
    YandexFleetSheetExportService,
    () =>
      new YandexFleetSheetExportService(
        yandexFleetProfileRepository,
        yandexFleetWorkRulesRepository,
        yandexFleetOrderRepository,
        container.get(GoogleSheetsAPIService),
      ),
  );
}

function scheduleGoogleSheetExport() {
  let isSyncing = false;

  cron.schedule(
    '55 10 * * *',
    async () => {
      if (isSyncing) {
        console.log('[Export] Синхронизация активна, ждём...');
        return;
      }
      isSyncing = true;
      try {
        const yandexFleetOrderService = container.get(YandexFleetOrderService);
        for (const parkId of yandexParkIds) {
          await yandexFleetOrderService.syncParkOrders(parkId);
        }

        const exportService = container.get(YandexFleetSheetExportService);
        await exportService.exportToGoogleSheets();
      } catch (error) {
        console.error('[Cron] Ошибка экспорта:', error);
      } finally {
        isSyncing = false;
      }
    },
    { timezone: 'Asia/Vladivostok' },
  );
}

function scheduleBitrixProfilesSyncing() {
  let isSyncing = false;

  cron.schedule(
    '0 */24 * * *',
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
}

async function bootstrap() {
  const database = await initDatabase();
  initServices(database);

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.post('/bitrix-webhook', async (req: Request, res: Response) => {
    const expectedToken = config.bitrixAuthToken;
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

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });

  scheduleGoogleSheetExport();
  scheduleBitrixProfilesSyncing();
}

bootstrap().catch(console.error);
