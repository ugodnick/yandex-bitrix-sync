import { MoreThan, Repository } from 'typeorm';
import { YandexFleetProfileEntity } from './yandex-fleet-profile/yandex-fleet-profile.entity';
import { GoogleSheetsAPIService } from '../google-sheet/google-sheet.service';
import { SheetName } from '../google-sheet/google-sheet.type';
import {
  formatDate,
  formatDateInTz,
  mapOrderStatusName,
  stageToStatus,
} from './yandex-fleet.utils';
import { YandexFleetWorkRuleEntity } from './yandex-fleet-work-rule/yandex-fleet-work-rule.entity';
import { YandexFleetOrderEntity } from './yandex-fleet-order/yandex-fleet-order.entity';
import { YandexFleetService } from './yandex-fleet.service';
import { YandexFleetParkEntity } from './yandex-fleet-park/yandex-park.entity';
import Big from 'big.js';
import { YandexFleetTransactionEntity } from './yandex-fleet-transaction/yandex-fleet-transaction.entity';

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

    await this.exportContractors(parks);
    await this.exportOrders(parks);
    await this.exportTransactions(parks);

    const today = formatDateInTz(new Date(), true);
    await this.googleSheetsApiService.renameSpreadsheet(`Выгрузка Диспетчерской — ${today}`);
  }

  private async exportContractors(parks: YandexFleetParkEntity[]) {
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

        const park = parks.find((p) => p.id === profile.parkId);

        if (!park) continue;

        allRows.push(this.profileToRow(profile, workRuleName, park));
      }

      offset += BATCH_SIZE;
    }

    await this.googleSheetsApiService.truncateSheet(SheetName.Contractors, 1);
    await this.googleSheetsApiService.ensureHeaders(SheetName.Contractors);
    await this.googleSheetsApiService.appendRawRows(SheetName.Contractors, allRows);
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
      p.employmentType ?? '',
      ruleName,
      p.vehicleType ?? '',
      stageToStatus(park.type, p.bitrixStageId),
      park.name,
      'https://fleet.yandex.ru/contractors/' + p.yandexProfileId + '/details?park_id=' + p.parkId,
    ];
  }

  private async exportOrders(parks: YandexFleetParkEntity[]) {
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

    await this.googleSheetsApiService.truncateSheet(SheetName.Orders, 1);
    await this.googleSheetsApiService.ensureHeaders(SheetName.Orders);
    await this.googleSheetsApiService.appendRawRows(SheetName.Orders, allRows);
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

  private async exportTransactions(parks: YandexFleetParkEntity[]) {
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
        where: { eventAt: MoreThan(fourtyFiveDaysAgo) },
      });

      if (transactions.length === 0) break;

      for (const tx of transactions) {
        const park = parks.find((p) => p.id === tx.parkId);

        if (!park) continue;
        allRows.push(this.transactionToRow(tx, park));
      }

      offset += BATCH_SIZE;
    }

    await this.googleSheetsApiService.truncateSheet(SheetName.Transactions, 1);
    await this.googleSheetsApiService.ensureHeaders(SheetName.Transactions);
    await this.googleSheetsApiService.appendRawRows(SheetName.Transactions, allRows);
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

    await this.googleSheetsApiService.truncateSheet(sheetName, 1);
    await this.googleSheetsApiService.ensureHeaders(sheetName);
    await this.googleSheetsApiService.appendRawRows(sheetName, allRows);

    console.log(
      `[YandexFleetSheetExportService] Выгружено ${allRows.length} строк в ${sheetName}.`,
    );
  }
}
