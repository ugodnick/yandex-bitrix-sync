import { Repository } from 'typeorm';
import { YandexFleetProfileEntity } from '../profile/yandex-fleet-profile.entity';
import { YandexFleetParkEntity } from '../park/yandex-fleet-park.entity';
import { YandexFleetService } from '../common/yandex-fleet.service';
import {
  YandexFleetSupplyHoursEntity,
  YandexFleetSupplyHoursPeriodType,
  YandexFleetSupplyHoursStatus,
} from './yandex-fleet-supply-hours.entity';

export interface SupplyHoursSyncStats {
  total: number;
  synced: number;
  failed: number;
}

export class YandexFleetSupplyHoursService {
  private static readonly BATCH_SIZE = 200;

  constructor(
    private readonly supplyHoursRepository: Repository<YandexFleetSupplyHoursEntity>,
    private readonly profileRepository: Repository<YandexFleetProfileEntity>,
    private readonly yandexService: YandexFleetService,
  ) {}

  private eligibleProfilesQuery(parkIds: string[], periodFrom: Date, periodTo: Date) {
    const periodFromIso = periodFrom.toISOString();
    const periodToIso = periodTo.toISOString();

    return this.profileRepository
      .createQueryBuilder('profile')
      .where('profile.park_id IN (:...parkIds)', { parkIds })
      .andWhere(
        `EXISTS (
          SELECT 1 FROM yandex_fleet_order o
          WHERE o.profile_id = profile.yandex_profile_id
            AND o.park_id = profile.park_id
            AND o.booked_at > :periodFrom
            AND o.booked_at < :periodTo
        )`,
        { periodFrom: periodFromIso, periodTo: periodToIso },
      );
  }

  private unsyncedProfilesQuery(
    parkIds: string[],
    periodType: YandexFleetSupplyHoursPeriodType,
    periodFrom: Date,
    periodTo: Date,
  ) {
    const periodFromIso = periodFrom.toISOString();
    const periodToIso = periodTo.toISOString();

    return this.eligibleProfilesQuery(parkIds, periodFrom, periodTo).andWhere(
      `NOT EXISTS (
        SELECT 1 FROM yandex_fleet_supply_hours sh
        WHERE sh.profile_id = profile.yandex_profile_id
          AND sh.park_id = profile.park_id
          AND sh.period_type = :periodType
          AND sh.period_from = :periodFrom
          AND sh.period_to = :periodTo
          AND sh.status = :successStatus
      )`,
      {
        periodType,
        periodFrom: periodFromIso,
        periodTo: periodToIso,
        successStatus: YandexFleetSupplyHoursStatus.Success,
      },
    );
  }

  async syncSupplyHours(
    parks: YandexFleetParkEntity[],
    periodType: YandexFleetSupplyHoursPeriodType,
    periodFrom: Date,
    periodTo: Date,
  ): Promise<SupplyHoursSyncStats> {
    const stats: SupplyHoursSyncStats = { total: 0, synced: 0, failed: 0 };
    const parkIds = parks.map((p) => p.id);
    if (parkIds.length === 0) return stats;

    let offset = 0;

    while (true) {
      const profiles = await this.unsyncedProfilesQuery(parkIds, periodType, periodFrom, periodTo)
        .leftJoinAndSelect('profile.park', 'park')
        .orderBy('profile.yandex_profile_id', 'ASC')
        .take(YandexFleetSupplyHoursService.BATCH_SIZE)
        .skip(offset)
        .getMany();

      if (profiles.length === 0) break;

      for (const profile of profiles) {
        stats.total++;

        try {
          const supplyHours = await this.yandexService.getDriverSupplyHours(
            profile.park,
            profile.yandexProfileId,
            periodFrom,
            periodTo,
          );

          await this.supplyHoursRepository.upsert(
            {
              profileId: profile.yandexProfileId,
              parkId: profile.parkId,
              periodType,
              periodFrom,
              periodTo,
              supplyDurationSeconds: supplyHours.supply_duration_seconds,
              status: YandexFleetSupplyHoursStatus.Success,
              lastError: null,
              syncedAt: new Date(),
            },
            ['profileId', 'parkId', 'periodType', 'periodFrom', 'periodTo'],
          );
          stats.synced++;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);

          await this.supplyHoursRepository.upsert(
            {
              profileId: profile.yandexProfileId,
              parkId: profile.parkId,
              periodType,
              periodFrom,
              periodTo,
              supplyDurationSeconds: 0,
              status: YandexFleetSupplyHoursStatus.Failed,
              lastError: message,
              syncedAt: null,
            },
            ['profileId', 'parkId', 'periodType', 'periodFrom', 'periodTo'],
          );
          stats.failed++;

          console.warn(
            `[YandexFleetSupplyHoursService] Не удалось получить время для ${profile.yandexProfileId}:`,
            error,
          );
        }
      }

      offset += YandexFleetSupplyHoursService.BATCH_SIZE;
    }

    return stats;
  }

  async isPeriodSyncComplete(
    parks: YandexFleetParkEntity[],
    periodType: YandexFleetSupplyHoursPeriodType,
    periodFrom: Date,
    periodTo: Date,
  ): Promise<boolean> {
    const parkIds = parks.map((p) => p.id);
    if (parkIds.length === 0) return true;

    const unsyncedCount = await this.unsyncedProfilesQuery(
      parkIds,
      periodType,
      periodFrom,
      periodTo,
    ).getCount();

    return unsyncedCount === 0;
  }

  async getExportRows(
    parks: YandexFleetParkEntity[],
    periodType: YandexFleetSupplyHoursPeriodType,
    periodFrom: Date,
    periodTo: Date,
  ): Promise<(string | number)[][]> {
    const records = await this.supplyHoursRepository
      .createQueryBuilder('supply_hours')
      .where('supply_hours.park_id IN (:...parkIds)', { parkIds: parks.map((p) => p.id) })
      .andWhere('supply_hours.period_type = :periodType', { periodType })
      .andWhere('supply_hours.period_from = :periodFrom', { periodFrom: periodFrom.toISOString() })
      .andWhere('supply_hours.period_to = :periodTo', { periodTo: periodTo.toISOString() })
      .andWhere('supply_hours.status = :status', { status: YandexFleetSupplyHoursStatus.Success })
      .orderBy('supply_hours.profile_id', 'ASC')
      .getMany();

    return records.map((record) => [
      record.profileId,
      Math.round(record.supplyDurationSeconds / 3600),
    ]);
  }
}
