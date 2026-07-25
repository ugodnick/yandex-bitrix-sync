import { In, MoreThan, Repository } from 'typeorm';
import { YandexFleetProfileEntity } from './profile/yandex-fleet-profile.entity';
import { GoogleSheetsAPIService } from '../google-sheet/google-sheet.service';
import { SheetType, YandexFleetSheetName } from '../google-sheet/google-sheet.type';
import {
  DEFAULT_PARK_TIMEZONE,
  formatDate,
  formatDateInTz,
  getPreviousDayBoundsInTz,
  getPreviousMonthBoundsInTz,
  getPreviousWeekBoundsInTz,
} from './common/yandex-fleet-format.utils';
import { mapOrderStatusName, stageToStatus } from './yandex-fleet-sheet.utils';
import { formatBalanceForSheet } from './profile/yandex-fleet-profile-balance.utils';
import { YandexFleetWorkRuleEntity } from './work-rule/yandex-fleet-work-rule.entity';
import { YandexFleetOrderEntity } from './order/yandex-fleet-order.entity';
import { YandexFleetParkEntity, YandexFleetParkType } from './park/yandex-fleet-park.entity';
import Big from 'big.js';
import { YandexFleetTransactionEntity } from './transaction/yandex-fleet-transaction.entity';
import { YandexFleetSupplyHoursService } from './supply-hours/yandex-fleet-supply-hours.service';
import { YandexFleetSupplyHoursPeriodType } from './supply-hours/yandex-fleet-supply-hours.entity';

export class YandexFleetSheetExportService {
  constructor(
    private readonly yandexFleetProfileRepository: Repository<YandexFleetProfileEntity>,
    private readonly yandexFleetWorkRuleRepository: Repository<YandexFleetWorkRuleEntity>,
    private readonly yandexFleetOrderRepository: Repository<YandexFleetOrderEntity>,
    private readonly yandexFleetParkRepository: Repository<YandexFleetParkEntity>,
    private readonly yandexFleetTransactionRepository: Repository<YandexFleetTransactionEntity>,
    private readonly googleSheetsApiService: GoogleSheetsAPIService,
    private readonly supplyHoursService: YandexFleetSupplyHoursService,
  ) {}

  async exportToGoogleSheets(): Promise<void> {
    const parks = await this.yandexFleetParkRepository.find();
    const taxiParks = parks.filter((p) => p.type === YandexFleetParkType.Taxi);
    const deliveryParks = parks.filter((p) => p.type === YandexFleetParkType.Delivery);
    const eatParks = parks.filter((p) => p.type === YandexFleetParkType.Eat);

    await this.exportContractors(deliveryParks, SheetType.Delivery);
    await this.exportOrders(deliveryParks, SheetType.Delivery);
    await this.exportTransactions(deliveryParks, SheetType.Delivery);

    const today = formatDateInTz(new Date(), true);
    await this.googleSheetsApiService.renameSpreadsheet(
      SheetType.Delivery,
      `Выгрузка Диспетчерской Доставка — ${today}`,
    );

    await this.exportContractors(taxiParks, SheetType.Taxi);
    await this.exportOrders(taxiParks, SheetType.Taxi);
    await this.exportTransactions(taxiParks, SheetType.Taxi);

    await this.googleSheetsApiService.renameSpreadsheet(
      SheetType.Taxi,
      `Выгрузка Диспетчерской Такси — ${today}`,
    );

    await this.exportContractors(eatParks, SheetType.Eat);
    await this.exportOrders(eatParks, SheetType.Eat);
    await this.exportTransactions(eatParks, SheetType.Eat);

    await this.googleSheetsApiService.renameSpreadsheet(
      SheetType.Eat,
      `Выгрузка Диспетчерской Еда — ${today}`,
    );
  }

  private parkTimezone(park: YandexFleetParkEntity): string {
    return park.timezone || DEFAULT_PARK_TIMEZONE;
  }

  private groupParksByTimezone(
    parks: YandexFleetParkEntity[],
  ): Map<string, YandexFleetParkEntity[]> {
    const groups = new Map<string, YandexFleetParkEntity[]>();
    for (const park of parks) {
      const tz = this.parkTimezone(park);
      const list = groups.get(tz) ?? [];
      list.push(park);
      groups.set(tz, list);
    }
    return groups;
  }

  private getPeriodBounds(
    periodType: YandexFleetSupplyHoursPeriodType,
    timeZone: string,
  ): { periodFrom: Date; periodTo: Date } {
    if (periodType === YandexFleetSupplyHoursPeriodType.Month) {
      return getPreviousMonthBoundsInTz(timeZone);
    }
    if (periodType === YandexFleetSupplyHoursPeriodType.Week) {
      return getPreviousWeekBoundsInTz(timeZone);
    }
    return getPreviousDayBoundsInTz(timeZone);
  }

  private async exportContractors(parks: YandexFleetParkEntity[], sheetType: SheetType) {
    const BATCH_SIZE = 500;
    let offset = 0;
    const allRows: string[][] = [];

    while (true) {
      const profiles = await this.yandexFleetProfileRepository.find({
        take: BATCH_SIZE,
        skip: offset,
        where: { parkId: In(parks.map((p) => p.id)) },
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

        const park = parks.find((p) => p.id === profile.parkId);

        if (!park) continue;

        allRows.push(this.profileToRow(profile, workRuleName, park));
      }

      offset += BATCH_SIZE;
    }

    await this.googleSheetsApiService.truncateSheet(YandexFleetSheetName.Contractors, sheetType, 1);
    await this.googleSheetsApiService.ensureHeaders(YandexFleetSheetName.Contractors, sheetType);
    await this.googleSheetsApiService.appendRawRows(
      YandexFleetSheetName.Contractors,
      sheetType,
      allRows,
      'USER_ENTERED',
    );
  }

  private profileToRow(
    p: YandexFleetProfileEntity,
    ruleName: string,
    park: YandexFleetParkEntity,
  ): string[] {
    const tz = this.parkTimezone(park);
    return [
      p.yandexProfileId,
      [p.lastName, p.firstName, p.middleName].filter(Boolean).join(' '),
      p.phone ? p.phone.replace(/^\+/, '') : '',
      p.fleetCreatedAt ? formatDateInTz(p.fleetCreatedAt, true, tz) : '',
      p.hiredAt ? formatDate(p.hiredAt) : '',
      p.firstOrderDate ? formatDateInTz(p.firstOrderDate, true, tz) : '',
      p.lastOrderDate ? formatDateInTz(p.lastOrderDate, true, tz) : '',
      p.employmentType ?? '',
      ruleName,
      p.vehicleType ?? '',
      stageToStatus(park.type, p.bitrixStageId),
      park.name,
      'https://fleet.yandex.ru/contractors/' + p.yandexProfileId + '/details?park_id=' + p.parkId,
      formatBalanceForSheet(p.balance),
    ];
  }

  private async exportOrders(parks: YandexFleetParkEntity[], sheetType: SheetType) {
    const BATCH_SIZE = 500;
    let offset = 0;
    const allRows: string[][] = [];
    const BONUS_TRANSACTION_CATEGORIES = [
      'compensation',
      'promotion_promocode',
      'promotion_discount',
      'bonus',
      'bonus_discount',
      'commission_discount_bonus_points',
      'platform_bonus_fee',
      'platform_other_referral',
      'platform_other_promotion',
      'tip_price_compensation',
    ];

    const fourtyFiveDaysAgo = new Date();
    fourtyFiveDaysAgo.setDate(fourtyFiveDaysAgo.getDate() - 45);

    while (true) {
      const orders = await this.yandexFleetOrderRepository
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.transactions', 'tx', 'tx.category_id IN (:...categories)', {
          categories: BONUS_TRANSACTION_CATEGORIES,
        })
        .where('order.bookedAt > :from', { from: fourtyFiveDaysAgo })
        .andWhere('order.parkId IN (:...parkIds)', { parkIds: parks.map((p) => p.id) })
        .orderBy('order.bookedAt', 'DESC')
        .take(BATCH_SIZE)
        .skip(offset)
        .getMany();

      if (orders.length === 0) break;

      for (const order of orders) {
        const totalBonus = order.transactions.reduce(
          (sum, tx) => sum.plus(new Big(tx.amount)),
          new Big(0),
        );
        const park = parks.find((p) => p.id === order.parkId);

        if (!park) continue;

        allRows.push(this.orderToRow(order, totalBonus.toFixed(4), park));
      }

      offset += BATCH_SIZE;
    }

    await this.googleSheetsApiService.truncateSheet(YandexFleetSheetName.Orders, sheetType, 1);
    await this.googleSheetsApiService.ensureHeaders(YandexFleetSheetName.Orders, sheetType);
    await this.googleSheetsApiService.appendRawRows(
      YandexFleetSheetName.Orders,
      sheetType,
      allRows,
    );
  }

  private orderToRow(
    o: YandexFleetOrderEntity,
    bonus: string,
    park: YandexFleetParkEntity,
  ): string[] {
    return [
      o.profileId,
      formatDateInTz(o.bookedAt, true, this.parkTimezone(park)),
      mapOrderStatusName(o.status),
      o.price,
      bonus,
      o.id,
      park.name,
    ];
  }

  private async exportTransactions(parks: YandexFleetParkEntity[], sheetType: SheetType) {
    const BATCH_SIZE = 500;
    let offset = 0;
    const allRows: string[][] = [];

    const fourtyFiveDaysAgo = new Date();
    fourtyFiveDaysAgo.setDate(fourtyFiveDaysAgo.getDate() - 45);

    while (true) {
      const transactions = await this.yandexFleetTransactionRepository.find({
        take: BATCH_SIZE,
        skip: offset,
        order: { eventAt: 'DESC' },
        where: { eventAt: MoreThan(fourtyFiveDaysAgo), parkId: In(parks.map((p) => p.id)) },
      });

      if (transactions.length === 0) break;

      for (const tx of transactions) {
        const park = parks.find((p) => p.id === tx.parkId);

        if (!park) continue;
        allRows.push(this.transactionToRow(tx, park));
      }

      offset += BATCH_SIZE;
    }

    await this.googleSheetsApiService.truncateSheet(
      YandexFleetSheetName.Transactions,
      sheetType,
      1,
    );
    await this.googleSheetsApiService.ensureHeaders(YandexFleetSheetName.Transactions, sheetType);
    await this.googleSheetsApiService.appendRawRows(
      YandexFleetSheetName.Transactions,
      sheetType,
      allRows,
    );
  }

  private transactionToRow(
    tx: YandexFleetTransactionEntity,
    park: YandexFleetParkEntity,
  ): string[] {
    return [
      tx.id,
      tx.profileId,
      tx.orderId ?? '',
      tx.categoryName,
      tx.amount,
      formatDateInTz(tx.eventAt, true, this.parkTimezone(park)),
      park.name,
    ];
  }

  async exportSupplyHoursMonth(parks: YandexFleetParkEntity[]): Promise<void> {
    await this.exportSupplyHoursForAllTypes(parks, YandexFleetSupplyHoursPeriodType.Month);
  }

  async exportSupplyHoursDay(parks: YandexFleetParkEntity[]): Promise<void> {
    await this.exportSupplyHoursForAllTypes(parks, YandexFleetSupplyHoursPeriodType.Day);
  }

  async exportSupplyWeekly(parks: YandexFleetParkEntity[]): Promise<void> {
    await this.exportSupplyHoursForAllTypes(parks, YandexFleetSupplyHoursPeriodType.Week);
  }

  private async exportSupplyHoursForAllTypes(
    parks: YandexFleetParkEntity[],
    periodType: YandexFleetSupplyHoursPeriodType,
  ): Promise<void> {
    const sheetName =
      periodType === YandexFleetSupplyHoursPeriodType.Month
        ? YandexFleetSheetName.SupplyHoursMonth
        : periodType === YandexFleetSupplyHoursPeriodType.Week
          ? YandexFleetSheetName.SupplyWeekMonth
          : YandexFleetSheetName.SupplyHoursDay;

    await this.exportSupplyHours(
      parks.filter((p) => p.type === YandexFleetParkType.Delivery),
      SheetType.Delivery,
      sheetName,
      periodType,
    );
    await this.exportSupplyHours(
      parks.filter((p) => p.type === YandexFleetParkType.Taxi),
      SheetType.Taxi,
      sheetName,
      periodType,
    );
    await this.exportSupplyHours(
      parks.filter((p) => p.type === YandexFleetParkType.Eat),
      SheetType.Eat,
      sheetName,
      periodType,
    );
  }

  async isSupplyHoursExportComplete(
    parks: YandexFleetParkEntity[],
    mode: 'month' | 'week' | 'day',
  ): Promise<boolean> {
    const periodType =
      mode === 'month'
        ? YandexFleetSupplyHoursPeriodType.Month
        : mode === 'week'
          ? YandexFleetSupplyHoursPeriodType.Week
          : YandexFleetSupplyHoursPeriodType.Day;

    const parkGroups = [
      parks.filter((p) => p.type === YandexFleetParkType.Delivery),
      parks.filter((p) => p.type === YandexFleetParkType.Taxi),
      parks.filter((p) => p.type === YandexFleetParkType.Eat),
    ];

    for (const group of parkGroups) {
      if (group.length === 0) continue;

      for (const [timeZone, tzParks] of this.groupParksByTimezone(group)) {
        const { periodFrom, periodTo } = this.getPeriodBounds(periodType, timeZone);
        const complete = await this.supplyHoursService.isPeriodSyncComplete(
          tzParks,
          periodType,
          periodFrom,
          periodTo,
        );
        if (!complete) return false;
      }
    }

    return true;
  }

  private async exportSupplyHours(
    parks: YandexFleetParkEntity[],
    sheetType: SheetType,
    sheetName:
      | YandexFleetSheetName.SupplyHoursMonth
      | YandexFleetSheetName.SupplyWeekMonth
      | YandexFleetSheetName.SupplyHoursDay,
    periodType: YandexFleetSupplyHoursPeriodType,
  ): Promise<void> {
    if (parks.length === 0) return;

    let total = 0;
    let synced = 0;
    let failed = 0;
    let isComplete = true;
    const allRows: (string | number)[][] = [];

    for (const [timeZone, tzParks] of this.groupParksByTimezone(parks)) {
      const { periodFrom, periodTo } = this.getPeriodBounds(periodType, timeZone);

      const stats = await this.supplyHoursService.syncSupplyHours(
        tzParks,
        periodType,
        periodFrom,
        periodTo,
      );
      total += stats.total;
      synced += stats.synced;
      failed += stats.failed;

      const groupComplete = await this.supplyHoursService.isPeriodSyncComplete(
        tzParks,
        periodType,
        periodFrom,
        periodTo,
      );
      if (!groupComplete) {
        isComplete = false;
        continue;
      }

      const rows = await this.supplyHoursService.getExportRows(
        tzParks,
        periodType,
        periodFrom,
        periodTo,
      );
      allRows.push(...rows);
    }

    console.log(
      `[YandexFleetSheetExportService] Синк ${sheetName} (${sheetType}): обработано ${total}, синхронизировано ${synced}, ошибок ${failed}, завершён: ${isComplete}`,
    );

    if (!isComplete) {
      console.warn(
        `[YandexFleetSheetExportService] Синк ${sheetName} (${sheetType}) не завершён — таблица не обновлена. Повторите позже для дозагрузки.`,
      );
      return;
    }

    await this.googleSheetsApiService.truncateSheet(sheetName, sheetType, 1);
    await this.googleSheetsApiService.ensureHeaders(sheetName, sheetType);
    await this.googleSheetsApiService.appendRawRows(sheetName, sheetType, allRows);

    console.log(
      `[YandexFleetSheetExportService] Выгружено ${allRows.length} строк в ${sheetName}.`,
    );
  }
}
