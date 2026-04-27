import { MoreThan, Repository } from 'typeorm';
import { YandexFleetProfileEntity } from './yandex-fleet-profile.entity';
import { GoogleSheetsAPIService } from '../../google-sheet/google-sheet.service';
import { SheetName } from '../../google-sheet/google-sheet.type';
import { formatDate, mapOrderStatusName, stageToStatus } from '../yandex-fleet.utils';
import { YandexFleetWorkRuleEntity } from '../yandex-fleet-work-rule/yandex-fleet-work-rule.entity';
import { YandexFleetOrderEntity } from '../yandex-fleet-order/yandex-fleet-order.entity';
import { mapParkName } from '../../bitrix/bitrix.utils';

export class YandexFleetSheetExportService {
  constructor(
    private readonly yandexFleetProfileRepository: Repository<YandexFleetProfileEntity>,
    private readonly yandexFleetWorkRuleRepository: Repository<YandexFleetWorkRuleEntity>,
    private readonly yandexFleetOrderRepository: Repository<YandexFleetOrderEntity>,
    private readonly googleSheetsApiService: GoogleSheetsAPIService,
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
        order: { yandexProfileId: 'ASC' },
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
    await this.googleSheetsApiService.ensureHeaders(SheetName.Contractors);
    await this.googleSheetsApiService.appendRawRows(SheetName.Contractors, allRows);
  }

  private async exportOrders() {
    const BATCH_SIZE = 500;
    let offset = 0;
    const allRows: string[][] = [];
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    while (true) {
      const orders = await this.yandexFleetOrderRepository.find({
        take: BATCH_SIZE,
        skip: offset,
        order: { bookedAt: 'DESC' },
        where: { bookedAt: MoreThan(oneMonthAgo) },
      });
      if (orders.length === 0) break;

      for (const order of orders) {
        allRows.push(this.orderToRow(order));
      }

      offset += BATCH_SIZE;
    }

    await this.googleSheetsApiService.clearSheet(SheetName.Orders, 1);
    await this.googleSheetsApiService.ensureHeaders(SheetName.Orders);
    await this.googleSheetsApiService.appendRawRows(SheetName.Orders, allRows);
  }

  private profileToRow(p: YandexFleetProfileEntity, ruleName: string, parkName: string): string[] {
    console.log(p.yandexProfileId);
    console.log(p.firstOrderDate);
    return [
      p.yandexProfileId,
      [p.lastName, p.firstName, p.middleName].filter(Boolean).join(' '),
      p.phone ?? '',
      p.hiredAt ? formatDate(p.hiredAt) : '',
      p.firstOrderDate ? formatDate(p.firstOrderDate) : '',
      p.lastOrderDate ? formatDate(p.lastOrderDate) : '',
      p.employmentType ?? '',
      ruleName,
      p.vehicleType ?? '',
      stageToStatus(p.bitrixStageId),
      parkName,
    ];
  }

  private orderToRow(o: YandexFleetOrderEntity): string[] {
    return [o.profileId, o.bookedAt.toLocaleString('ru-RU'), mapOrderStatusName(o.status)];
  }
}
