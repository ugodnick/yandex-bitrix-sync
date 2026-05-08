import { MoreThan, Repository } from 'typeorm';
import { YandexFleetProfileEntity } from './yandex-fleet-profile.entity';
import { GoogleSheetsAPIService } from '../../google-sheet/google-sheet.service';
import { SheetName } from '../../google-sheet/google-sheet.type';
import {
  formatDate,
  formatDateInTz,
  mapOrderStatusName,
  stageToStatus,
} from '../yandex-fleet.utils';
import { YandexFleetWorkRuleEntity } from '../yandex-fleet-work-rule/yandex-fleet-work-rule.entity';
import { YandexFleetOrderEntity } from '../yandex-fleet-order/yandex-fleet-order.entity';
import { mapParkName } from '../../bitrix/bitrix.utils';
import { YandexFleetService } from '../yandex-fleet.service';

export class YandexFleetSheetExportService {
  constructor(
    private readonly yandexFleetProfileRepository: Repository<YandexFleetProfileEntity>,
    private readonly yandexFleetWorkRuleRepository: Repository<YandexFleetWorkRuleEntity>,
    private readonly yandexFleetOrderRepository: Repository<YandexFleetOrderEntity>,
    private readonly googleSheetsApiService: GoogleSheetsAPIService,
    private readonly yandexService: YandexFleetService,
  ) {}

  async exportToGoogleSheets(): Promise<void> {
    await this.exportContractors();
    await this.exportOrders();

    const today = new Date().toLocaleDateString('ru-RU');
    await this.googleSheetsApiService.renameSpreadsheet(`Выгрузка Диспетчерской — ${today}`);
  }

  private async exportContractors() {
    const BATCH_SIZE = 500;
    let offset = 0;
    const allRows: string[][] = [];

    while (true) {
      const profiles = await this.yandexFleetProfileRepository.find({
        take: BATCH_SIZE,
        skip: offset,
        order: { fleetCreatedAt: 'DESC' },
      });
      if (profiles.length === 0) break;

      for (const profile of profiles) {
        const workRule = await this.yandexFleetWorkRuleRepository.findOne({
          where: { parkId: profile.parkId, id: profile.workRuleId },
        });
        let workRuleName: string = '';
        if (workRule) {
          workRuleName = workRule.name;
        }

        allRows.push(this.profileToRow(profile, workRuleName, mapParkName(profile.parkId)));
      }

      offset += BATCH_SIZE;
    }

    await this.googleSheetsApiService.clearSheet(SheetName.Contractors, 1);
    await this.googleSheetsApiService.truncateSheet(SheetName.Contractors);
    await this.googleSheetsApiService.appendRawRows(SheetName.Contractors, allRows);
  }

  private async exportOrders() {
    const BATCH_SIZE = 500;
    let offset = 0;
    const allRows: string[][] = [];
    const fourtyFiveDaysAgo = new Date();
    fourtyFiveDaysAgo.setDate(fourtyFiveDaysAgo.getDate() - 45);

    while (true) {
      const orders = await this.yandexFleetOrderRepository.find({
        take: BATCH_SIZE,
        skip: offset,
        order: { bookedAt: 'DESC' },
        where: { bookedAt: MoreThan(fourtyFiveDaysAgo) },
      });
      if (orders.length === 0) break;

      for (const order of orders) {
        allRows.push(this.orderToRow(order));
      }

      offset += BATCH_SIZE;
    }

    await this.googleSheetsApiService.clearSheet(SheetName.Orders, 1);
    await this.googleSheetsApiService.truncateSheet(SheetName.Orders);
    await this.googleSheetsApiService.appendRawRows(SheetName.Orders, allRows);
  }

  private profileToRow(p: YandexFleetProfileEntity, ruleName: string, parkName: string): string[] {
    return [
      p.yandexProfileId,
      [p.lastName, p.firstName, p.middleName].filter(Boolean).join(' '),
      p.phone ? p.phone.replace(/^\+/, '') : '',
      p.fleetCreatedAt ? formatDateInTz(p.fleetCreatedAt) : '',
      p.hiredAt ? formatDate(p.hiredAt) : '',
      p.firstOrderDate ? formatDateInTz(p.firstOrderDate) : '',
      p.lastOrderDate ? formatDateInTz(p.lastOrderDate) : '',
      p.employmentType ?? '',
      ruleName,
      p.vehicleType ?? '',
      stageToStatus(p.bitrixStageId),
      parkName,
      'https://fleet.yandex.ru/contractors/' + p.yandexProfileId + '/details?park_id=' + p.parkId,
    ];
  }

  private orderToRow(o: YandexFleetOrderEntity): string[] {
    return [o.profileId, formatDateInTz(o.bookedAt), mapOrderStatusName(o.status), o.price];
  }

  async exportSupplyHoursMonth(): Promise<void> {
    const now = new Date();
    const periodFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const periodTo = new Date(now.getFullYear(), now.getMonth(), 1);

    await this.exportSupplyHours(SheetName.SupplyHoursMonth, periodFrom, periodTo);
  }

  async exportSupplyWeekly(): Promise<void> {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const periodTo = new Date(now);
    periodTo.setDate(now.getDate() - daysSinceMonday);
    periodTo.setHours(0, 0, 0, 0);

    const periodFrom = new Date(periodTo);
    periodFrom.setDate(periodTo.getDate() - 7);

    await this.exportSupplyHours(SheetName.SupplyWeekMonth, periodFrom, periodTo);
  }

  private async exportSupplyHours(
    sheetName: SheetName.SupplyHoursMonth | SheetName.SupplyWeekMonth,
    periodFrom: Date,
    periodTo: Date,
  ): Promise<void> {
    const BATCH_SIZE = 200;
    let offset = 0;
    const allRows: (string | number)[][] = [];

    while (true) {
      const profiles = await this.yandexFleetProfileRepository.find({
        where: { lastOrderDate: MoreThan(periodFrom) },
        order: { yandexProfileId: 'ASC' },
        take: BATCH_SIZE,
        skip: offset,
      });

      if (profiles.length === 0) break;

      for (const profile of profiles) {
        try {
          const supplyHours = await this.yandexService.getDriverSupplyHours(
            profile.parkId,
            profile.yandexProfileId,
            periodFrom,
            periodTo,
          );
          const hours = Math.round(supplyHours.supply_duration_seconds / 3600);
          allRows.push([profile.yandexProfileId, hours]);
        } catch (error) {
          console.warn(
            `[YandexFleetSheetExportService] Не удалось получить время для ${profile.yandexProfileId}:`,
            error,
          );
        }
      }

      offset += BATCH_SIZE;
    }

    await this.googleSheetsApiService.clearSheet(sheetName, 1);
    await this.googleSheetsApiService.truncateSheet(sheetName);
    await this.googleSheetsApiService.appendRawRows(sheetName, allRows);

    console.log(
      `[YandexFleetSheetExportService] Выгружено ${allRows.length} строк в ${sheetName}.`,
    );
  }
}
