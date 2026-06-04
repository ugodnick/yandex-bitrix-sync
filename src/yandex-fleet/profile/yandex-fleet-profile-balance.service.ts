import { In, Repository } from 'typeorm';
import { YandexFleetService } from '../common/yandex-fleet.service';
import { YandexFleetParkEntity } from '../park/yandex-fleet-park.entity';
import { YandexFleetProfileEntity } from './yandex-fleet-profile.entity';
import { applyBalanceToProfile } from './yandex-fleet-profile-balance.utils';

const PROFILE_IDS_BATCH = 100;
const PROFILE_IDS_LOAD_BATCH = 1000;
const PROFILE_LIST_FALLBACK_FROM = new Date('2025-01-01T00:00:00Z');

export class YandexFleetProfileBalanceService {
  constructor(
    private readonly yandexFleetProfileRepository: Repository<YandexFleetProfileEntity>,
    private readonly yandexFleetParkRepository: Repository<YandexFleetParkEntity>,
    private readonly yandexFleetService: YandexFleetService,
  ) {}

  /** Разовый backfill: все профили парка из БД → list по ids → balance. */
  async refreshAllBalancesForPark(park: YandexFleetParkEntity): Promise<number> {
    let offset = 0;
    let totalUpdated = 0;
    let totalProcessed = 0;

    while (true) {
      const rows = await this.yandexFleetProfileRepository.find({
        where: { parkId: park.id },
        select: { yandexProfileId: true },
        order: { yandexProfileId: 'ASC' },
        take: PROFILE_IDS_LOAD_BATCH,
        skip: offset,
      });

      if (rows.length === 0) break;

      const updated = await this.refreshBalancesForProfileIds(
        park,
        rows.map((row) => row.yandexProfileId),
      );
      totalProcessed += rows.length;
      totalUpdated += updated;
      offset += PROFILE_IDS_LOAD_BATCH;

      console.log(
        `[YandexFleetProfileBalanceService] Backfill ${park.name}: обработано ${totalProcessed} профилей, обновлено балансов ${totalUpdated}`,
      );
    }

    return totalUpdated;
  }

  async refreshAllBalances(): Promise<void> {
    const parkRows = await this.yandexFleetProfileRepository
      .createQueryBuilder('profile')
      .select('DISTINCT profile.park_id', 'parkId')
      .getRawMany<{ parkId: string }>();

    console.log(
      `[YandexFleetProfileBalanceService] Старт полного backfill балансов, парков: ${parkRows.length}`,
    );

    let totalUpdated = 0;

    for (const { parkId } of parkRows) {
      const park = await this.yandexFleetParkRepository.findOneBy({ id: parkId });
      if (!park) {
        console.warn(`[YandexFleetProfileBalanceService] Парк ${parkId} не найден, пропуск`);
        continue;
      }

      totalUpdated += await this.refreshAllBalancesForPark(park);
    }

    console.log(
      `[YandexFleetProfileBalanceService] Backfill завершён, всего обновлено балансов: ${totalUpdated}`,
    );
  }

  async refreshBalancesForProfileIds(
    park: YandexFleetParkEntity,
    profileIds: Iterable<string>,
  ): Promise<number> {
    const unique = [...new Set(profileIds)];
    if (unique.length === 0) return 0;

    let updated = 0;

    for (let offset = 0; offset < unique.length; offset += PROFILE_IDS_BATCH) {
      const chunk = unique.slice(offset, offset + PROFILE_IDS_BATCH);

      const response = await this.yandexFleetService.getProfiles(
        park,
        chunk.length,
        0,
        PROFILE_LIST_FALLBACK_FROM,
        chunk,
      );

      const drivers = response.driver_profiles ?? [];
      if (drivers.length === 0) {
        console.warn(
          `[YandexFleetProfileBalanceService] ${park.name}: API вернул 0 из ${chunk.length} профилей (ids)`,
        );
        continue;
      }

      if (drivers.length < chunk.length) {
        console.warn(
          `[YandexFleetProfileBalanceService] ${park.name}: API вернул ${drivers.length}/${chunk.length} профилей`,
        );
      }

      const profiles = await this.yandexFleetProfileRepository.find({
        where: { yandexProfileId: In(chunk), parkId: park.id },
      });
      const profileById = new Map(profiles.map((p) => [p.yandexProfileId, p]));
      const toSave: YandexFleetProfileEntity[] = [];

      for (const driver of drivers) {
        const profile = profileById.get(driver.driver_profile.id);
        if (!profile) continue;

        if (!applyBalanceToProfile(profile, driver.accounts)) continue;

        toSave.push(profile);
      }

      if (toSave.length > 0) {
        await this.yandexFleetProfileRepository.save(toSave);
        updated += toSave.length;
      }
    }

    return updated;
  }
}
