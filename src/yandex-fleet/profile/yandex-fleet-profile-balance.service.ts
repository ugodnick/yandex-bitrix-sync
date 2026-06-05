import { In, Repository } from 'typeorm';
import { YandexFleetService } from '../common/yandex-fleet.service';
import { YandexFleetParkEntity } from '../park/yandex-fleet-park.entity';
import { YandexFleetProfileEntity } from './yandex-fleet-profile.entity';
import { applyBalanceToProfile } from './yandex-fleet-profile-balance.utils';

const PROFILE_IDS_BATCH = 100;
const PROFILE_LIST_FALLBACK_FROM = new Date('2025-01-01T00:00:00Z');

export class YandexFleetProfileBalanceService {
  constructor(
    private readonly yandexFleetProfileRepository: Repository<YandexFleetProfileEntity>,
    private readonly yandexFleetService: YandexFleetService,
  ) {}

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
