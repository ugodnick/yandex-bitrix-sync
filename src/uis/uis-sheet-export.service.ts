import { MoreThanOrEqual, Repository } from 'typeorm';
import {
  formatExportTitleDate,
  toIsoPeriodStartMonthsAgo,
  toSheetString,
} from '../bitrix/bitrix-sheet.utils';
import { GoogleSheetsAPIService } from '../google-sheet/google-sheet.service';
import { SheetType, UisSheetName } from '../google-sheet/google-sheet.type';
import { UisCallEntity } from './entity/uis-call.entity';
import { UisCallLegEntity } from './entity/uis-call-leg.entity';
import { UisEmployeeStatusStatEntity } from './entity/uis-employee-status-stat.entity';
import {
  UisEmployeeEntity,
  UisEmployeeGroupEntity,
  UisScenarioEntity,
  UisSipLineEntity,
  UisVirtualNumberEntity,
} from './entity/uis-directory.entity';
import {
  directionLabel,
  formatDate,
  formatDay,
  formatDuration,
  joinJson,
  recordLinks,
  yesNo,
} from './uis-sheet.utils';

const CALLS_EXPORT_MONTHS = 3;

export class UisSheetExportService {
  constructor(
    private readonly googleSheetsApiService: GoogleSheetsAPIService,
    private readonly callRepository: Repository<UisCallEntity>,
    private readonly callLegRepository: Repository<UisCallLegEntity>,
    private readonly employeeRepository: Repository<UisEmployeeEntity>,
    private readonly employeeGroupRepository: Repository<UisEmployeeGroupEntity>,
    private readonly sipLineRepository: Repository<UisSipLineEntity>,
    private readonly virtualNumberRepository: Repository<UisVirtualNumberEntity>,
    private readonly scenarioRepository: Repository<UisScenarioEntity>,
    private readonly employeeStatusRepository: Repository<UisEmployeeStatusStatEntity>,
  ) {}

  async exportToGoogleSheets(): Promise<void> {
    const cutoff = new Date(toIsoPeriodStartMonthsAgo(CALLS_EXPORT_MONTHS));

    await this.writeSheet(UisSheetName.Calls, await this.callRows(cutoff));
    await this.writeSheet(UisSheetName.CallLegs, await this.callLegRows(cutoff));
    await this.writeSheet(UisSheetName.Employees, await this.employeeRows());
    await this.writeSheet(UisSheetName.Groups, await this.groupRows());
    await this.writeSheet(UisSheetName.SipLines, await this.sipRows());
    await this.writeSheet(UisSheetName.Numbers, await this.numberRows());
    await this.writeSheet(UisSheetName.Scenarios, await this.scenarioRows());
    await this.writeSheet(UisSheetName.EmployeeStatus, await this.employeeStatusRows());

    await this.googleSheetsApiService.renameSpreadsheet(
      SheetType.Uis,
      `Выгрузка UIS — ${formatExportTitleDate()}`,
    );
  }

  private async callRows(cutoff: Date): Promise<string[][]> {
    const calls = await this.callRepository.find({
      where: { startTime: MoreThanOrEqual(cutoff) },
      order: { startTime: 'DESC' },
    });
    return calls.map((call) => [
      toSheetString(call.uisId),
      toSheetString(formatDate(call.startTime)),
      toSheetString(formatDate(call.finishTime)),
      toSheetString(directionLabel(call.direction)),
      toSheetString(yesNo(call.isLost)),
      toSheetString(call.contactPhoneNumber),
      toSheetString(call.virtualPhoneNumber),
      toSheetString(call.waitDuration),
      toSheetString(call.talkDuration),
      toSheetString(call.totalDuration),
      toSheetString(call.finishReason),
      toSheetString(call.lastAnsweredEmployeeFullName),
      toSheetString(call.scenarioName),
      toSheetString(call.source),
      toSheetString(recordLinks(call)),
    ]);
  }

  private async callLegRows(cutoff: Date): Promise<string[][]> {
    const legs = await this.callLegRepository.find({
      where: { startTime: MoreThanOrEqual(cutoff) },
      order: { startTime: 'DESC' },
    });
    return legs.map((leg) => [
      toSheetString(leg.uisId),
      toSheetString(leg.callSessionId),
      toSheetString(formatDate(leg.startTime)),
      toSheetString(leg.duration),
      toSheetString(directionLabel(leg.direction)),
      toSheetString(leg.callingPhoneNumber),
      toSheetString(leg.calledPhoneNumber),
      toSheetString(leg.employeeFullName),
      toSheetString(leg.groupName),
      toSheetString(leg.finishReasonDescription ?? leg.finishReason),
      toSheetString(leg.scenarioName),
    ]);
  }

  private async employeeRows(): Promise<string[][]> {
    const employees = await this.employeeRepository.find({ order: { fullName: 'ASC' } });
    return employees.map((employee) => [
      toSheetString(employee.uisId),
      toSheetString(employee.fullName),
      toSheetString(employee.email),
      toSheetString(employee.status),
      toSheetString(employee.extensionPhoneNumber),
      toSheetString(joinJson(employee.phoneNumbers, 'phone_number')),
    ]);
  }

  private async groupRows(): Promise<string[][]> {
    const groups = await this.employeeGroupRepository.find({ order: { name: 'ASC' } });
    return groups.map((group) => [toSheetString(group.uisId), toSheetString(group.name)]);
  }

  private async sipRows(): Promise<string[][]> {
    const lines = await this.sipLineRepository.find({ order: { phoneNumber: 'ASC' } });
    return lines.map((line) => [
      toSheetString(line.uisId),
      toSheetString(line.phoneNumber),
      toSheetString(line.type),
      toSheetString(line.status),
      toSheetString(line.employeeFullName),
      toSheetString(line.virtualPhoneNumber),
      toSheetString(line.billingState),
      toSheetString(line.physicalState),
    ]);
  }

  private async numberRows(): Promise<string[][]> {
    const numbers = await this.virtualNumberRepository.find({
      order: { virtualPhoneNumber: 'ASC' },
    });
    return numbers.map((number) => [
      toSheetString(number.uisId),
      toSheetString(number.virtualPhoneNumber),
      toSheetString(number.status),
      toSheetString(number.type),
      toSheetString(number.name),
      toSheetString(number.comment),
    ]);
  }

  private async scenarioRows(): Promise<string[][]> {
    const scenarios = await this.scenarioRepository.find({ order: { name: 'ASC' } });
    return scenarios.map((scenario) => [
      toSheetString(scenario.uisId),
      toSheetString(scenario.name),
      toSheetString(joinJson(scenario.virtualPhoneNumbers)),
    ]);
  }

  private async employeeStatusRows(): Promise<string[][]> {
    const cutoffDay = toIsoPeriodStartMonthsAgo(CALLS_EXPORT_MONTHS).slice(0, 10);
    const rows = await this.employeeStatusRepository.find({
      where: { statDate: MoreThanOrEqual(cutoffDay) },
      order: { statDate: 'DESC', fullName: 'ASC' },
    });
    return rows.map((row) => [
      toSheetString(formatDay(row.statDate)),
      toSheetString(row.fullName),
      toSheetString(joinJson(row.groups, 'group_name')),
      toSheetString(formatDuration(row.availableSeconds)),
      toSheetString(formatDuration(row.breakSeconds)),
      toSheetString(formatDuration(row.doNotDisturbSeconds)),
      toSheetString(formatDuration(row.notAtWorkplaceSeconds)),
      toSheetString(formatDuration(row.notAtWorkSeconds)),
      toSheetString(formatDuration(row.autoOutCallSeconds)),
      toSheetString(formatDuration(row.unknownSeconds)),
    ]);
  }

  private async writeSheet(sheet: UisSheetName, rows: string[][]): Promise<void> {
    await this.googleSheetsApiService.truncateSheet(sheet, SheetType.Uis, 1);
    await this.googleSheetsApiService.ensureHeaders(sheet, SheetType.Uis);
    const normalized = rows.map((row) => row.map((cell) => toSheetString(cell)));
    await this.googleSheetsApiService.appendRawRows(sheet, SheetType.Uis, normalized);
  }
}
