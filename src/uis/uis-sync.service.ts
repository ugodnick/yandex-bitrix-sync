import { Repository } from 'typeorm';
import { chunkArray } from '../chunk-array';
import { toIsoPeriodStartMonthsAgo } from '../bitrix/bitrix-sheet.utils';
import { UisCallEntity } from './entity/uis-call.entity';
import { UisCallLegEntity } from './entity/uis-call-leg.entity';
import {
  UisEmployeeEntity,
  UisEmployeeGroupEntity,
  UisEmployeePositionEntity,
  UisScenarioEntity,
  UisSipLineEntity,
  UisStatusEntity,
  UisVirtualNumberEntity,
} from './entity/uis-directory.entity';
import { UisEmployeeStatusStatEntity } from './entity/uis-employee-status-stat.entity';
import { UisSyncStateEntity, UisSyncType } from './entity/uis-sync-state.entity';
import { UIS_CALL_FIELDS, UIS_CALL_LEG_FIELDS, UisClient, UisRow } from './uis-client';
import { UisApiError } from './uis-api.error';
import {
  dayKeysFrom,
  formatUisDateTime,
  reportWindows,
  shiftDayKey,
  vladivostokDayBounds,
  vladivostokDayKey,
} from './uis-date';
import {
  callLegRowToEntity,
  callRowToEntity,
  employeeGroupRowToEntity,
  employeePositionRowToEntity,
  employeeRowToEntity,
  employeeStatusStatToEntity,
  scenarioRowToEntity,
  sipLineRowToEntity,
  statusRowToEntity,
  virtualNumberRowToEntity,
} from './uis-sync.mapper';

const INITIAL_LOOKBACK_MONTHS = 3;
const SYNC_OVERLAP_MS = 30 * 60 * 1000;
const SQLITE_MAX_VARIABLES = 999;
const UIS_UPSERT_BATCH_SIZE = Math.floor(SQLITE_MAX_VARIABLES / 40);

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; message?: string; driverError?: { code?: string } };
  const code = candidate.driverError?.code ?? candidate.code;
  return (
    code === 'SQLITE_CONSTRAINT' ||
    (candidate.message?.includes('UNIQUE constraint failed') ?? false)
  );
}

async function upsertInChunks<T extends object>(
  repository: Repository<T>,
  entities: T[],
  conflictPaths: string[],
): Promise<void> {
  for (const chunk of chunkArray(entities, UIS_UPSERT_BATCH_SIZE)) {
    await repository.upsert(chunk, conflictPaths);
  }
}

export class UisSyncService {
  private running: Promise<void> | null = null;

  constructor(
    private readonly client: UisClient,
    private readonly callRepository: Repository<UisCallEntity>,
    private readonly callLegRepository: Repository<UisCallLegEntity>,
    private readonly employeeRepository: Repository<UisEmployeeEntity>,
    private readonly employeeGroupRepository: Repository<UisEmployeeGroupEntity>,
    private readonly employeePositionRepository: Repository<UisEmployeePositionEntity>,
    private readonly statusRepository: Repository<UisStatusEntity>,
    private readonly sipLineRepository: Repository<UisSipLineEntity>,
    private readonly virtualNumberRepository: Repository<UisVirtualNumberEntity>,
    private readonly scenarioRepository: Repository<UisScenarioEntity>,
    private readonly employeeStatusRepository: Repository<UisEmployeeStatusStatEntity>,
    private readonly syncStateRepository: Repository<UisSyncStateEntity>,
  ) {}

  ensureInitialSync(): Promise<void> {
    return this.syncHourly();
  }

  syncHourly(): Promise<void> {
    if (this.running) return this.running;
    this.running = this.runSync().finally(() => {
      this.running = null;
    });
    return this.running;
  }

  private async runSync(): Promise<void> {
    const callsState = await this.getOrCreateSyncState(UisSyncType.Calls);
    if (!callsState.lastSyncedTo) {
      await this.syncDirectories();
    }

    await this.syncReport(UisSyncType.Calls, 'get.calls_report', UIS_CALL_FIELDS, (row) =>
      callRowToEntity(row),
    );
    await this.syncReport(
      UisSyncType.CallLegs,
      'get.call_legs_report',
      UIS_CALL_LEG_FIELDS,
      (row) => callLegRowToEntity(row),
    );
    await this.syncEmployeeStatus();
  }

  private async syncDirectories(): Promise<void> {
    await this.syncDirectory('get.employees', this.employeeRepository, employeeRowToEntity);
    await this.syncDirectory(
      'get.group_employees',
      this.employeeGroupRepository,
      employeeGroupRowToEntity,
    );
    await this.syncDirectory(
      'get.employee_positions',
      this.employeePositionRepository,
      employeePositionRowToEntity,
    );
    await this.syncDirectory('get.statuses', this.statusRepository, statusRowToEntity);
    await this.syncDirectory('get.sip_lines', this.sipLineRepository, sipLineRowToEntity);
    await this.syncDirectory(
      'get.virtual_numbers',
      this.virtualNumberRepository,
      virtualNumberRowToEntity,
    );
    await this.syncDirectory('get.scenarios', this.scenarioRepository, scenarioRowToEntity);
    await this.updateSyncState(UisSyncType.Directories, new Date());
  }

  private async syncDirectory<T extends object>(
    method: string,
    repository: Repository<T>,
    mapRow: (row: UisRow) => T | null,
  ): Promise<void> {
    try {
      const rows = await this.client.list(method);
      const entities = rows.flatMap((row) => {
        const entity = mapRow(row);
        return entity ? [entity] : [];
      });
      if (entities.length > 0) {
        await upsertInChunks(repository, entities, ['uisId']);
      }
      console.log(`[UIS] ${method}: ${entities.length}`);
    } catch (error) {
      if (error instanceof UisApiError && error.isSkippable) {
        console.warn(`[UIS] ${method} пропущен: ${error.mnemonic} ${error.message}`);
        return;
      }
      throw error;
    }
  }

  private async syncReport<T extends object>(
    syncType: UisSyncType,
    method: string,
    fields: readonly string[],
    mapRow: (row: UisRow) => T | null,
  ): Promise<void> {
    const state = await this.getOrCreateSyncState(syncType);
    const till = new Date();
    const from = this.syncFrom(state.lastSyncedTo);
    const windows = reportWindows(from, till);
    if (windows.length === 0) return;

    const repository = this.repositoryFor(syncType);
    for (const window of windows) {
      const rows = await this.client.listReport(method, window.from, window.till, fields);
      const entities = rows.flatMap((row) => {
        const entity = mapRow(row);
        return entity ? [entity] : [];
      });
      if (entities.length > 0) {
        await upsertInChunks(repository as Repository<T>, entities, ['uisId']);
      }
      await this.updateSyncState(syncType, window.till);
      console.log(
        `[UIS] ${method}: ${entities.length}, ${formatUisDateTime(window.from)} — ${formatUisDateTime(window.till)}`,
      );
    }
  }

  private async syncEmployeeStatus(): Promise<void> {
    const state = await this.getOrCreateSyncState(UisSyncType.EmployeeStatus);
    const today = vladivostokDayKey(new Date());
    const start = vladivostokDayKey(this.syncFrom(state.lastSyncedTo));

    for (const day of dayKeysFrom(start, today)) {
      const bounds = vladivostokDayBounds(day);
      const rows = await this.client.listReport('get.employee_stat', bounds.from, bounds.till);
      const entities = rows.flatMap((row) => {
        const entity = employeeStatusStatToEntity(row, day);
        return entity ? [entity] : [];
      });
      if (entities.length > 0) {
        await upsertInChunks(this.employeeStatusRepository, entities, ['uisId']);
      }
      if (day < today) {
        await this.updateSyncState(
          UisSyncType.EmployeeStatus,
          vladivostokDayBounds(shiftDayKey(day, 1)).from,
        );
      }
      console.log(`[UIS] get.employee_stat: ${entities.length}, ${day}`);
    }
  }

  private syncFrom(lastSyncedTo: Date | null): Date {
    if (!lastSyncedTo) return new Date(toIsoPeriodStartMonthsAgo(INITIAL_LOOKBACK_MONTHS));
    return new Date(lastSyncedTo.getTime() - SYNC_OVERLAP_MS);
  }

  private repositoryFor(syncType: UisSyncType): Repository<UisCallEntity | UisCallLegEntity> {
    if (syncType === UisSyncType.CallLegs) return this.callLegRepository;
    return this.callRepository;
  }

  private async getOrCreateSyncState(syncType: UisSyncType): Promise<UisSyncStateEntity> {
    const existing = await this.syncStateRepository.findOne({ where: { syncType } });
    if (existing) return existing;

    try {
      const state = this.syncStateRepository.create({ syncType, lastSyncedTo: null });
      return await this.syncStateRepository.save(state);
    } catch (error) {
      const again = await this.syncStateRepository.findOne({ where: { syncType } });
      if (again && isUniqueViolation(error)) return again;
      throw error;
    }
  }

  private async updateSyncState(syncType: UisSyncType, lastSyncedTo: Date): Promise<void> {
    const state = await this.getOrCreateSyncState(syncType);
    state.lastSyncedTo = lastSyncedTo;
    await this.syncStateRepository.save(state);
  }
}
