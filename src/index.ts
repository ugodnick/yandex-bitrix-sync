import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import AppDataSource from './typeorm';
import { loadConfig } from './app.config';
import { Container } from './container';
import { YandexFleetService } from './yandex-fleet/yandex-fleet.service';
import { BitrixService } from './bitrix/bitrix.service';
import { BitrixCrmWebhookBody } from './bitrix/bitrix.type';
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
import { DataSource, Repository } from 'typeorm';
import { Queue } from './queue';
import { YandexFleetParkEntity } from './yandex-fleet/yandex-park.entity';

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
  yandexFleetParkRepository = database.getRepository(YandexFleetParkEntity);

  container.add(YandexFleetService, () => new YandexFleetService());
  container.add(BitrixService, () => new BitrixService(config.inboundWebhookUrl));
  container.add(
    BitrixWebhookService,
    () =>
      new BitrixWebhookService(
        yandexFleetProfileRepository,
        yandexFleetParkRepository,
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
        yandexFleetParkRepository,
        container.get(GoogleSheetsAPIService),
        container.get(YandexFleetService),
      ),
  );
}

function scheduleGoogleSheetExport() {
  const queue = new Queue('scheduleGoogleSheetExport');

  cron.schedule(
    '0 */1 * * *',
    () =>
      queue.enqueue('export', async () => {
        const exportService = container.get(YandexFleetSheetExportService);
        await exportService.exportToGoogleSheets();
      }),
    { timezone: 'Asia/Vladivostok' },
  );
}

function scheduleSupplyHoursSync() {
  const queue = new Queue('scheduleSupplyHoursSync');
  const runSync = async (mode: string) => {
    const exportService = container.get(YandexFleetSheetExportService);

    if (mode === 'month') {
      await exportService.exportSupplyHoursMonth();
    } else if (mode === 'week') {
      await exportService.exportSupplyWeekly();
    }
  };
  cron.schedule('0 0 5 * *', () => queue.enqueue('month', () => runSync('month')), {
    timezone: 'Asia/Vladivostok',
  });
  cron.schedule('0 8 * * 2', () => queue.enqueue('week', () => runSync('week')), {
    timezone: 'Asia/Vladivostok',
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

  cron.schedule('*/5 * * * *', () => queue.enqueue('new', () => runSync('new')));
  cron.schedule('0 */1 * * *', () => queue.enqueue('stages', () => runSync('stages')));
  cron.schedule('0 */2 * * *', () => queue.enqueue('existing', () => runSync('existing')));
}

function scheduleParksOrdersSync() {
  const queue = new Queue('scheduleParksOrdersSync');

  cron.schedule(
    '0 */1 * * *',
    () =>
      queue.enqueue('orders', async () => {
        const yandexFleetOrderService = container.get(YandexFleetOrderService);
        const parks = await getActiveParks();
        for (const park of parks) {
          await yandexFleetOrderService.syncParkOrders(park);
        }
      }),
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

  scheduleParksOrdersSync();
  scheduleParksProfilesSync();
  scheduleGoogleSheetExport();
  scheduleSupplyHoursSync();
}

bootstrap().catch(console.error);
