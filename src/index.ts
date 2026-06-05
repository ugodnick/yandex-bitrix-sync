import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { join } from 'path';
import AppDataSource from './typeorm';
import { loadConfig } from './app.config';
import { Container } from './container';
import { Queue } from './queue';
import { YandexFleetService } from './yandex-fleet/common/yandex-fleet.service';
import { BitrixService } from './bitrix/bitrix.service';
import { BitrixCrmWebhookBody } from './bitrix/bitrix.type';
import { YandexFleetProfileEntity } from './yandex-fleet/profile/yandex-fleet-profile.entity';
import { YandexFleetProfileService } from './yandex-fleet/profile/yandex-fleet-profile.service';
import { YandexFleetProfileBalanceService } from './yandex-fleet/profile/yandex-fleet-profile-balance.service';
import { YandexFleetWorkRuleEntity } from './yandex-fleet/work-rule/yandex-fleet-work-rule.entity';
import { YandexFleetWorkRuleService } from './yandex-fleet/work-rule/yandex-fleet-work-rule.service';
import { YandexFleetOrderService } from './yandex-fleet/order/yandex-fleet-order.service';
import { BitrixWebhookService } from './bitrix/bitrix-webhook.service';
import { GoogleSheetsAPIService } from './google-sheet/google-sheet.service';
import { YandexFleetSheetExportService } from './yandex-fleet/yandex-fleet-sheet-export.service';
import { YandexFleetOrderEntity } from './yandex-fleet/order/yandex-fleet-order.entity';
import { DataSource, Repository } from 'typeorm';
import { YandexFleetParkEntity } from './yandex-fleet/park/yandex-fleet-park.entity';
import { YandexFleetSyncStateEntity } from './yandex-fleet/entity/yandex-fleet-sync-state.entity';
import { YandexFleetTransactionService } from './yandex-fleet/transaction/yandex-fleet-transaction.service';
import { YandexFleetTransactionEntity } from './yandex-fleet/transaction/yandex-fleet-transaction.entity';
import { BitrixSheetExportService } from './bitrix/bitrix-sheet-export.service';
import { BitrixSyncService } from './bitrix/bitrix-sync.service';
import { BitrixContactEntity } from './bitrix/entity/bitrix-contact.entity';
import { BitrixDealEntity } from './bitrix/entity/bitrix-deal.entity';
import { BitrixCallEntity } from './bitrix/entity/bitrix-call.entity';
import { BitrixUserEntity } from './bitrix/entity/bitrix-user.entity';
import { BitrixSyncStateEntity } from './bitrix/entity/bitrix-sync-state.entity';

dotenv.config();

const config = loadConfig();
const container = new Container();

const app = express();
const PORT = process.env.PORT || 3000;

let yandexFleetParkRepository: Repository<YandexFleetParkEntity>;
let cachedParks: { data: YandexFleetParkEntity[]; expires: number } | null = null;

async function getActiveParks(): Promise<YandexFleetParkEntity[]> {
  const now = Date.now();
  if (cachedParks && cachedParks.expires > now) return cachedParks.data;

  const parks = await yandexFleetParkRepository.find({ where: { isActive: true } });
  cachedParks = { data: parks, expires: now + 5 * 60 * 1000 };
  return parks;
}

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
  const yandexFleetsyncStateRepository = database.getRepository(YandexFleetSyncStateEntity);
  const yandexFleetTransactionRepository = database.getRepository(YandexFleetTransactionEntity);
  yandexFleetParkRepository = database.getRepository(YandexFleetParkEntity);

  container.add(YandexFleetService, () => new YandexFleetService());
  const bitrixContactRepository = database.getRepository(BitrixContactEntity);
  const bitrixDealRepository = database.getRepository(BitrixDealEntity);
  const bitrixCallRepository = database.getRepository(BitrixCallEntity);
  const bitrixUserRepository = database.getRepository(BitrixUserEntity);
  const bitrixSyncStateRepository = database.getRepository(BitrixSyncStateEntity);

  container.add(BitrixService, () => new BitrixService(config.inboundWebhookUrl));
  container.add(
    BitrixSyncService,
    () =>
      new BitrixSyncService(
        container.get(BitrixService),
        bitrixContactRepository,
        bitrixDealRepository,
        bitrixCallRepository,
        bitrixUserRepository,
        bitrixSyncStateRepository,
      ),
  );
  container.add(
    BitrixWebhookService,
    () =>
      new BitrixWebhookService(
        yandexFleetProfileRepository,
        yandexFleetParkRepository,
        container.get(YandexFleetService),
        container.get(BitrixService),
        container.get(BitrixSyncService),
        container.get(YandexFleetProfileService),
      ),
  );
  container.add(
    BitrixSheetExportService,
    () =>
      new BitrixSheetExportService(
        container.get(GoogleSheetsAPIService),
        bitrixContactRepository,
        bitrixDealRepository,
        bitrixCallRepository,
        yandexFleetParkRepository,
      ),
  );
  container.add(
    YandexFleetProfileBalanceService,
    () =>
      new YandexFleetProfileBalanceService(
        yandexFleetProfileRepository,
        container.get(YandexFleetService),
      ),
  );
  container.add(
    YandexFleetProfileService,
    () =>
      new YandexFleetProfileService(
        container.get(YandexFleetService),
        container.get(BitrixService),
        container.get(YandexFleetOrderService),
        container.get(BitrixSheetExportService),
        yandexFleetProfileRepository,
        yandexFleetOrderRepository,
        yandexFleetsyncStateRepository,
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
        taxiSpreadsheetId: config.googleSheetsTaxiSheetId,
        deliverySpreadsheetId: config.googleSheetsDeliverySheetId,
        bitrixSpreadsheetId: config.googleSheetsBitrixSheetId,
      }),
  );
  container.add(
    YandexFleetOrderService,
    () =>
      new YandexFleetOrderService(
        yandexFleetOrderRepository,
        yandexFleetProfileRepository,
        yandexFleetsyncStateRepository,
        container.get(YandexFleetService),
      ),
  );
  container.add(
    YandexFleetTransactionService,
    () =>
      new YandexFleetTransactionService(
        yandexFleetTransactionRepository,
        yandexFleetsyncStateRepository,
        container.get(YandexFleetService),
        container.get(YandexFleetProfileBalanceService),
      ),
  );
  container.add(
    YandexFleetSheetExportService,
    () =>
      new YandexFleetSheetExportService(
        yandexFleetProfileRepository,
        yandexFleetWorkRulesRepository,
        yandexFleetOrderRepository,
        yandexFleetParkRepository,
        yandexFleetTransactionRepository,
        container.get(GoogleSheetsAPIService),
        container.get(YandexFleetService),
      ),
  );
}

function scheduleGoogleSheetExport() {
  const queue = new Queue('scheduleGoogleSheetExport');

  cron.schedule(
    '55 */1 * * *',
    () =>
      queue.enqueue('export', async () => {
        const yandexExportService = container.get(YandexFleetSheetExportService);
        const bitrixExportService = container.get(BitrixSheetExportService);
        await yandexExportService.exportToGoogleSheets();
        await bitrixExportService.exportToGoogleSheets();
      }),
    { timezone: 'Asia/Vladivostok', runOnInit: false },
  );
}

function scheduleSupplyHoursSync() {
  const queue = new Queue('scheduleSupplyHoursSync');
  const runSync = async (mode: string) => {
    const exportService = container.get(YandexFleetSheetExportService);
    const parks = await getActiveParks();

    if (mode === 'month') {
      await exportService.exportSupplyHoursMonth(parks);
    } else if (mode === 'week') {
      await exportService.exportSupplyWeekly(parks);
    } else if (mode === 'day') {
      await exportService.exportSupplyHoursDay(parks);
    }
  };
  cron.schedule('0 0 5 * *', () => queue.enqueue('month', () => runSync('month')), {
    timezone: 'Asia/Vladivostok',
    runOnInit: false,
  });
  cron.schedule('0 8 * * 2', () => queue.enqueue('week', () => runSync('week')), {
    timezone: 'Asia/Vladivostok',
    runOnInit: false,
  });
  cron.schedule('0 5 * * *', () => queue.enqueue('day', () => runSync('day')), {
    timezone: 'Asia/Vladivostok',
    runOnInit: false,
  });
}

function scheduleParksProfilesSync() {
  const queue = new Queue('scheduleParksProfilesSync');
  const runSync = async (mode: string) => {
    const profileService = container.get(YandexFleetProfileService);
    const workRulesService = container.get(YandexFleetWorkRuleService);
    const parks = await getActiveParks();

    if (mode === 'new') {
      for (const park of parks) {
        await workRulesService.syncParkWorkRules(park);
        await profileService.syncProfiles(park, true);
      }
    } else if (mode === 'existing') {
      for (const park of parks) {
        await workRulesService.syncParkWorkRules(park);
        await profileService.syncProfiles(park, false);
      }
    } else if (mode === 'stages') {
      for (const park of parks) {
        await profileService.syncProfileStages(park);
      }
    }
  };

  cron.schedule('*/5 * * * *', () => queue.enqueue('new', () => runSync('new')), {
    runOnInit: false,
  });
  cron.schedule('40 */1 * * *', () => queue.enqueue('stages', () => runSync('stages')), {
    runOnInit: false,
  });
  cron.schedule('0 */1 * * *', () => queue.enqueue('existing', () => runSync('existing')), {
    runOnInit: false,
  });
}

function scheduleParksOrdersSync() {
  const queue = new Queue('scheduleParksOrdersSync');

  cron.schedule(
    '30 */1 * * *',
    () =>
      queue.enqueue('orders', async () => {
        const yandexFleetOrderService = container.get(YandexFleetOrderService);
        const yandexFleetTransactionService = container.get(YandexFleetTransactionService);
        const parks = await getActiveParks();
        for (const park of parks) {
          await yandexFleetOrderService.syncParkOrders(park);
          await yandexFleetTransactionService.syncParkTransactions(park);
        }
      }),
    { timezone: 'Asia/Vladivostok', runOnInit: false },
  );
}

function scheduleBitrixSync() {
  const queue = new Queue('scheduleBitrixSync');

  cron.schedule(
    '30 */1 * * *',
    () =>
      queue.enqueue('hourly', async () => {
        const syncService = container.get(BitrixSyncService);
        await syncService.syncHourly();
      }),
    { timezone: 'Asia/Vladivostok', runOnInit: false },
  );

  cron.schedule(
    '0 3 * * *',
    () =>
      queue.enqueue('reconcile', async () => {
        const syncService = container.get(BitrixSyncService);
        await syncService.reconcileDaily();
      }),
    { timezone: 'Asia/Vladivostok', runOnInit: false },
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

  scheduleParksOrdersSync();
  scheduleParksProfilesSync();
  scheduleBitrixSync();
  scheduleGoogleSheetExport();
  scheduleSupplyHoursSync();

  container
    .get(BitrixSyncService)
    .ensureInitialSync()
    .catch((error) => console.error('Bitrix initial sync failed:', error));
}

bootstrap().catch(console.error);
