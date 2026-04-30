import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import AppDataSource from './typeorm';
import { loadConfig } from './app.config';
import { Container } from './container';
import { YandexFleetService } from './yandex-fleet/yandex-fleet.service';
import { BitrixService } from './bitrix/bitrix.service';
import { BitrixCrmWebhookBody, YANDEX_PARKS_NAMES } from './bitrix/bitrix.type';
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
const yandexParkIds = Object.keys(YANDEX_PARKS_NAMES);

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
        yandexFleetOrderRepository,
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
        container.get(YandexFleetService),
      ),
  );
}

function scheduleGoogleSheetExport() {
  let isSyncing = false;

  cron.schedule(
    '55 10 * * *',
    async () => {
      if (isSyncing) {
        console.log('[scheduleGoogleSheetExport] Синхронизация активна, ждём...');
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
        console.error('[scheduleGoogleSheetExport] Ошибка экспорта:', error);
      } finally {
        isSyncing = false;
      }
    },
    { timezone: 'Asia/Vladivostok' },
  );
}

function scheduleSupplyMonthGoogleSheetExport() {
  let isSyncing = false;

  cron.schedule(
    '0 6 5 * *',
    async () => {
      if (isSyncing) {
        console.log('[scheduleSupplyMonthGoogleSheetExport] Синхронизация активна, ждём...');
        return;
      }
      isSyncing = true;
      try {
        const exportService = container.get(YandexFleetSheetExportService);
        await exportService.exportSupplyHoursMonth();
      } catch (error) {
        console.error('[scheduleSupplyMonthGoogleSheetExport] Ошибка экспорта:', error);
      } finally {
        isSyncing = false;
      }
    },
    { timezone: 'Asia/Vladivostok' },
  );
}

function scheduleSupplyWeeklyGoogleSheetExport() {
  let isSyncing = false;

  cron.schedule(
    '0 8 * * 2',
    async () => {
      if (isSyncing) {
        console.log('[scheduleSupplyWeeklyGoogleSheetExport] Синхронизация активна, ждём...');
        return;
      }
      isSyncing = true;
      try {
        const exportService = container.get(YandexFleetSheetExportService);
        await exportService.exportSupplyWeekly();
      } catch (error) {
        console.error('[scheduleSupplyWeeklyGoogleSheetExport] Ошибка экспорта:', error);
      } finally {
        isSyncing = false;
      }
    },
    { timezone: 'Asia/Vladivostok' },
  );
}

function scheduleProfileSync() {
  const pending = new Set<string>();
  let syncQueue: Promise<void> = Promise.resolve();

  function enqueue(name: string, task: () => Promise<void>): void {
    if (pending.has(name)) {
      console.log(`[scheduleProfileSync] Пропуск ${name}: уже в очереди.`);
      return;
    }

    pending.add(name);

    syncQueue = syncQueue
      .then(async () => {
        pending.delete(name);
        console.log(`[scheduleProfileSync] Старт: ${name}`);
        try {
          await task();
          console.log(`[scheduleProfileSync] Завершён: ${name}`);
        } catch (error) {
          console.error(`[scheduleProfileSync] Ошибка в ${name}:`, error);
        }
      })
      .catch(() => {});
  }
  const runSync = async (mode: string) => {
    const profileService = container.get(YandexFleetProfileService);
    const workRulesService = container.get(YandexFleetWorkRuleService);

    if (mode === 'new') {
      for (const parkId of yandexParkIds) {
        await workRulesService.syncParkWorkRules(parkId);
        await profileService.syncProfiles(parkId, true);
      }
    } else if (mode === 'existing') {
      for (const parkId of yandexParkIds) {
        await workRulesService.syncParkWorkRules(parkId);
        await profileService.syncProfiles(parkId, false);
      }
    } else if (mode === 'stages') {
      for (const parkId of yandexParkIds) {
        await profileService.syncProfileStages(parkId);
      }
    } else if (mode === 'temp-update-deals-sync') {
      for (const parkId of yandexParkIds) {
        await profileService.updateDeals(parkId);
      }
    }
  };

  cron.schedule('*/5 * * * *', () => enqueue('new', () => runSync('new')));
  cron.schedule('0 */2 * * *', () => enqueue('stages', () => runSync('stages')));
  cron.schedule('0 */6 * * *', () => enqueue('existing', () => runSync('existing')), {
    runOnInit: true,
  });
  // cron.schedule(
  //   '0 */24 * * *',
  //   () => enqueue('existing', () => runSync('temp-update-deals-sync')),
  //   {
  //     runOnInit: true,
  //   },
  // );
}

function scheduleOrdersSync() {
  let isSyncing = false;

  cron.schedule(
    '0 */1 * * *',
    async () => {
      if (isSyncing) {
        console.log('[scheduleOrdersSync] Синхронизация активна, ждём...');
        return;
      }
      isSyncing = true;
      try {
        const yandexFleetOrderService = container.get(YandexFleetOrderService);
        for (const parkId of yandexParkIds) {
          await yandexFleetOrderService.syncParkOrders(parkId);
        }
      } catch (error) {
        console.error('[scheduleOrdersSync] Ошибка экспорта:', error);
      } finally {
        isSyncing = false;
      }
    },
    { timezone: 'Asia/Vladivostok' },
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

  scheduleOrdersSync();
  scheduleGoogleSheetExport();
  scheduleProfileSync();
  scheduleSupplyMonthGoogleSheetExport();
  scheduleSupplyWeeklyGoogleSheetExport();
}

bootstrap().catch(console.error);
