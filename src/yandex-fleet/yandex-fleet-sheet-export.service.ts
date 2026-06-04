import { In, MoreThan, Repository } from 'typeorm';
import { YandexFleetProfileEntity } from './profile/yandex-fleet-profile.entity';
import { GoogleSheetsAPIService } from '../google-sheet/google-sheet.service';
import { SheetType, YandexFleetSheetName } from '../google-sheet/google-sheet.type';
import {
  getPreviousDayBoundsInVladivostok,
  getPreviousMonthBoundsInVladivostok,
  getPreviousWeekBoundsInVladivostok,
} from './common/yandex-fleet-format.utils';
import {
  formatDate,
  formatDateInTz,
  mapOrderStatusName,
  stageToStatus,
} from './yandex-fleet-sheet.utils';
import { YandexFleetWorkRuleEntity } from './work-rule/yandex-fleet-work-rule.entity';
import { YandexFleetOrderEntity } from './order/yandex-fleet-order.entity';
import { YandexFleetService } from './common/yandex-fleet.service';
import { YandexFleetParkEntity, YandexFleetParkType } from './park/yandex-fleet-park.entity';
import Big from 'big.js';
import { YandexFleetTransactionEntity } from './transaction/yandex-fleet-transaction.entity';

export class YandexFleetSheetExportService {
  constructor(
    private readonly yandexFleetProfileRepository: Repository<YandexFleetProfileEntity>,
    private readonly yandexFleetWorkRuleRepository: Repository<YandexFleetWorkRuleEntity>,
    private readonly yandexFleetOrderRepository: Repository<YandexFleetOrderEntity>,
    private readonly yandexFleetParkRepository: Repository<YandexFleetParkEntity>,
    private readonly yandexFleetTransactionRepository: Repository<YandexFleetTransactionEntity>,
    private readonly googleSheetsApiService: GoogleSheetsAPIService,
    private readonly yandexService: YandexFleetService,
  ) {}

  async exportToGoogleSheets(): Promise<void> {
    const parks = await this.yandexFleetParkRepository.find();
    const taxiParks = parks.filter((p) => p.type === YandexFleetParkType.Taxi);
    const deliveryParks = parks.filter((p) => p.type === YandexFleetParkType.Delivery);

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
    );
  }

  private profileToRow(
    p: YandexFleetProfileEntity,
    ruleName: string,
    park: YandexFleetParkEntity,
  ): string[] {
    return [
      p.yandexProfileId,
      [p.lastName, p.firstName, p.middleName].filter(Boolean).join(' '),
      p.phone ? p.phone.replace(/^\+/, '') : '',
      p.fleetCreatedAt ? formatDateInTz(p.fleetCreatedAt, true) : '',
      p.hiredAt ? formatDate(p.hiredAt) : '',
      p.firstOrderDate ? formatDateInTz(p.firstOrderDate, true) : '',
      p.lastOrderDate ? formatDateInTz(p.lastOrderDate, true) : '',
      p.balance ?? '',
      p.employmentType ?? '',
      ruleName,
      p.vehicleType ?? '',
      stageToStatus(park.type, p.bitrixStageId),
      park.name,
      'https://fleet.yandex.ru/contractors/' + p.yandexProfileId + '/details?park_id=' + p.parkId,
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
      'fix_price_compensation',
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
      formatDateInTz(o.bookedAt, true),
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
      formatDateInTz(tx.eventAt, true),
      park.name,
    ];
  }

  async exportSupplyHoursMonth(parks: YandexFleetParkEntity[]): Promise<void> {
    const { periodFrom, periodTo } = getPreviousMonthBoundsInVladivostok();

    await this.exportSupplyHours(
      parks,
      SheetType.Delivery,
      YandexFleetSheetName.SupplyHoursMonth,
      periodFrom,
      periodTo,
    );
    await this.exportSupplyHours(
      parks,
      SheetType.Taxi,
      YandexFleetSheetName.SupplyHoursMonth,
      periodFrom,
      periodTo,
    );
  }

  async exportSupplyHoursDay(parks: YandexFleetParkEntity[]): Promise<void> {
    const { periodFrom, periodTo } = getPreviousDayBoundsInVladivostok();

    const taxiParks = parks.filter((p) => p.type === YandexFleetParkType.Taxi);
    const deliveryParks = parks.filter((p) => p.type === YandexFleetParkType.Delivery);

    await this.exportSupplyHours(
      deliveryParks,
      SheetType.Delivery,
      YandexFleetSheetName.SupplyHoursDay,
      periodFrom,
      periodTo,
    );
    await this.exportSupplyHours(
      taxiParks,
      SheetType.Taxi,
      YandexFleetSheetName.SupplyHoursDay,
      periodFrom,
      periodTo,
    );
  }

  async exportSupplyWeekly(parks: YandexFleetParkEntity[]): Promise<void> {
    const { periodFrom, periodTo } = getPreviousWeekBoundsInVladivostok();

    const taxiParks = parks.filter((p) => p.type === YandexFleetParkType.Taxi);
    const deliveryParks = parks.filter((p) => p.type === YandexFleetParkType.Delivery);

    await this.exportSupplyHours(
      deliveryParks,
      SheetType.Delivery,
      YandexFleetSheetName.SupplyWeekMonth,
      periodFrom,
      periodTo,
    );
    await this.exportSupplyHours(
      taxiParks,
      SheetType.Taxi,
      YandexFleetSheetName.SupplyWeekMonth,
      periodFrom,
      periodTo,
    );
  }

  private async exportSupplyHours(
    parks: YandexFleetParkEntity[],
    sheetType: SheetType,
    sheetName:
      | YandexFleetSheetName.SupplyHoursMonth
      | YandexFleetSheetName.SupplyWeekMonth
      | YandexFleetSheetName.SupplyHoursDay,
    periodFrom: Date,
    periodTo: Date,
  ): Promise<void> {
    const BATCH_SIZE = 200;
    let offset = 0;
    const allRows: (string | number)[][] = [];

    while (true) {
      const profiles = await this.yandexFleetProfileRepository.find({
        where: { lastOrderDate: MoreThan(periodFrom), parkId: In(parks.map((p) => p.id)) },
        order: { yandexProfileId: 'ASC' },
        relations: { park: true },
        take: BATCH_SIZE,
        skip: offset,
      });

      if (profiles.length === 0) break;

      for (const profile of profiles) {
        try {
          const supplyHours = await this.yandexService.getDriverSupplyHours(
            profile.park,
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

    await this.googleSheetsApiService.truncateSheet(sheetName, sheetType, 1);
    await this.googleSheetsApiService.ensureHeaders(sheetName, sheetType);
    await this.googleSheetsApiService.appendRawRows(sheetName, sheetType, allRows);

    console.log(
      `[YandexFleetSheetExportService] Выгружено ${allRows.length} строк в ${sheetName}.`,
    );
  }
}
