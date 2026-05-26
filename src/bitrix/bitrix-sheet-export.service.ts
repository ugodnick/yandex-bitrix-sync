import { MoreThanOrEqual, Repository } from 'typeorm';
import { GoogleSheetsAPIService } from '../google-sheet/google-sheet.service';
import { BitrixSheetName, SheetType } from '../google-sheet/google-sheet.type';
import { YandexFleetParkEntity } from '../yandex-fleet/park/yandex-fleet-park.entity';
import { BitrixCallEntity } from './entity/bitrix-call.entity';
import { BitrixContactEntity } from './entity/bitrix-contact.entity';
import { BitrixDealEntity } from './entity/bitrix-deal.entity';
import { contactEntityDisplayName } from './bitrix-sync.mapper';
import {
  formatBitrixDateInTz,
  formatCallDuration,
  formatCallStatusCode,
  formatCallType,
  formatExportTitleDate,
  resolveAggregatorLabel,
  resolveDispatcherName,
  resolveStageLabel,
  resolveVacancyLabel,
  toIsoPeriodStartMonthsAgo,
  toSheetString,
} from './bitrix-sheet.utils';
import type { BitrixCallType } from './call/bitrix-call.type';

const CALLS_EXPORT_MONTHS = 3;

export class BitrixSheetExportService {
  private dispatcherNamesByBitrixId: Map<string, string> | null = null;

  constructor(
    private readonly googleSheetsApiService: GoogleSheetsAPIService,
    private readonly contactRepository: Repository<BitrixContactEntity>,
    private readonly dealRepository: Repository<BitrixDealEntity>,
    private readonly callRepository: Repository<BitrixCallEntity>,
    private readonly parkRepository: Repository<YandexFleetParkEntity>,
  ) {}

  async appendNewDeal(payload: string[]): Promise<void> {
    await this.googleSheetsApiService.ensureHeaders(BitrixSheetName.NewDeals, SheetType.Bitrix);
    await this.googleSheetsApiService.appendRawRows(BitrixSheetName.NewDeals, SheetType.Bitrix, [
      payload,
    ]);
  }

  async exportToGoogleSheets(): Promise<void> {
    await this.loadDispatcherNames();

    await this.exportContacts();
    await this.exportDeals();
    await this.exportCalls();

    await this.googleSheetsApiService.renameSpreadsheet(
      SheetType.Bitrix,
      `Выгрузка Битрикс — ${formatExportTitleDate()}`,
    );
  }

  private async loadDispatcherNames(): Promise<void> {
    const parks = await this.parkRepository.find();
    this.dispatcherNamesByBitrixId = new Map(
      parks
        .filter((park) => park.bitrixDispatcherId)
        .map((park) => [String(park.bitrixDispatcherId), park.name]),
    );
  }

  private getDispatcherNames(): Map<string, string> {
    return this.dispatcherNamesByBitrixId ?? new Map();
  }

  private async exportContacts(): Promise<void> {
    const contacts = await this.contactRepository.find({ order: { bitrixId: 'ASC' } });
    const rows = contacts.map((contact) => this.contactToRow(contact));
    await this.writeSheet(BitrixSheetName.Contacts, rows);
  }

  private async exportDeals(): Promise<void> {
    const deals = await this.dealRepository.find({
      order: { dateCreate: 'DESC', bitrixId: 'DESC' },
    });
    const rows = deals.map((deal) => this.dealToRow(deal));
    await this.writeSheet(BitrixSheetName.Deals, rows);
  }

  private async exportCalls(): Promise<void> {
    const cutoff = new Date(toIsoPeriodStartMonthsAgo(CALLS_EXPORT_MONTHS));
    const calls = await this.callRepository.find({
      where: { callStartDate: MoreThanOrEqual(cutoff) },
      order: { callStartDate: 'DESC' },
    });
    const rows = calls.map((call) => this.callToRow(call));
    await this.writeSheet(BitrixSheetName.Calls, rows);
  }

  private async writeSheet(sheet: BitrixSheetName, rows: string[][]): Promise<void> {
    await this.googleSheetsApiService.truncateSheet(sheet, SheetType.Bitrix, 1);
    await this.googleSheetsApiService.ensureHeaders(sheet, SheetType.Bitrix);
    const normalized = rows.map((row) => row.map((cell) => toSheetString(cell)));
    await this.googleSheetsApiService.appendRawRows(sheet, SheetType.Bitrix, normalized);
  }

  private contactToRow(contact: BitrixContactEntity): string[] {
    return [
      toSheetString(contact.bitrixId),
      toSheetString(contactEntityDisplayName(contact)),
      toSheetString(contact.phone),
      toSheetString(formatBitrixDateInTz(contact.dateCreate?.toISOString(), true)),
    ];
  }

  private dealToRow(deal: BitrixDealEntity): string[] {
    const source = [deal.sourceId, deal.sourceDescription].filter(Boolean).join(' — ');

    return [
      toSheetString(deal.bitrixId),
      toSheetString(deal.contactId),
      toSheetString(formatBitrixDateInTz(deal.dateCreate?.toISOString(), true)),
      toSheetString(formatBitrixDateInTz(deal.dateModify?.toISOString(), true)),
      toSheetString(resolveDispatcherName(deal.dispatcherRaw, this.getDispatcherNames())),
      toSheetString(deal.profileId),
      toSheetString(resolveVacancyLabel(deal.vacancyRaw)),
      toSheetString(resolveAggregatorLabel(deal.aggregatorRaw)),
      toSheetString(deal.comments),
      toSheetString(resolveStageLabel(deal.stageId)),
      toSheetString(source),
      toSheetString(deal.city),
    ];
  }

  private callToRow(call: BitrixCallEntity): string[] {
    const contactId = call.crmEntityType === 'CONTACT' && call.crmEntityId ? call.crmEntityId : '';

    return [
      toSheetString(call.managerName),
      toSheetString(call.phoneNumber),
      toSheetString(formatCallType((call.callType ?? '1') as BitrixCallType)),
      toSheetString(formatCallDuration(call.callDuration)),
      toSheetString(formatBitrixDateInTz(call.callStartDate.toISOString(), true)),
      toSheetString(formatCallStatusCode(call.callFailedCode, call.callFailedReason)),
      toSheetString(contactId),
    ];
  }
}
