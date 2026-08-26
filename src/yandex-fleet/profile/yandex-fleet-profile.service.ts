import { In, Not, Repository } from 'typeorm';
import { YandexFleetService } from '../common/yandex-fleet.service';
import { BitrixService } from '../../bitrix/bitrix.service';
import { YandexFleetProfileEntity } from './yandex-fleet-profile.entity';
import { DriverWorkStatus } from '../common/yandex-fleet-common.type';
import { YandexFleetDriverProfileItem } from './yandex-fleet-profile.type';
import { calculateDriverHash } from './yandex-fleet-profile.utils';
import { getBitrixCategory } from '../../bitrix/bitrix.utils';
import { YandexFleetOrderService } from '../order/yandex-fleet-order.service';
import { YandexFleetOrderEntity } from '../order/yandex-fleet-order.entity';
import { YandexFleetParkEntity } from '../park/yandex-fleet-park.entity';
import {
  YandexFleetSyncStateEntity,
  YandexFleetSyncStatus,
  YandexFleetSyncType,
} from '../entity/yandex-fleet-sync-state.entity';
import { BitrixSheetExportService } from '../../bitrix/bitrix-sheet-export.service';
import { OrderStatus } from '../order/yandex-fleet-order.type';
import { YandexFleetProfileBitrixMapper } from './yandex-fleet-profile-bitrix.mapper';
import { applyBalanceToProfile } from './yandex-fleet-profile-balance.utils';

export class YandexFleetProfileService {
  private readonly bitrixMapper: YandexFleetProfileBitrixMapper;

  private hasValidBitrixLinks(profile: YandexFleetProfileEntity | null): boolean {
    return Boolean(
      profile &&
      profile.bitrixContactId &&
      profile.bitrixContactId !== '0' &&
      profile.bitrixDealId &&
      profile.bitrixDealId !== '0',
    );
  }

  constructor(
    private yandexService: YandexFleetService,
    private bitrixService: BitrixService,
    private yandexFleetOrderService: YandexFleetOrderService,
    bitrixSheetExportService: BitrixSheetExportService,
    private yandexFleetProfileRepository: Repository<YandexFleetProfileEntity>,
    private yandexFleetOrderRepository: Repository<YandexFleetOrderEntity>,
    private syncStateRepository: Repository<YandexFleetSyncStateEntity>,
  ) {
    this.bitrixMapper = new YandexFleetProfileBitrixMapper(
      bitrixService,
      bitrixSheetExportService,
      yandexFleetProfileRepository,
    );
  }

  async syncProfiles(park: YandexFleetParkEntity, newOnly: boolean): Promise<void> {
    const syncType = newOnly
      ? YandexFleetSyncType.ProfilesNew
      : YandexFleetSyncType.ProfilesExisting;

    console.log(
      `[YandexFleetProfileService] Запуск синхронизации ${newOnly ? 'новых' : 'всех'} профилей: ${park.name}`,
    );

    const ordersState = await this.syncStateRepository.findOne({
      where: { parkId: park.id, syncType: YandexFleetSyncType.Orders },
    });
    if (!ordersState?.lastSyncedTo) {
      console.log(
        `[YandexFleetProfileService] Пропуск синхронизации профилей ${park.name}: заказы ещё не синхронизированы.`,
      );
      return;
    }

    const startedAt = new Date();
    const bufferOverlap = 30 * 60 * 1000;

    let state = await this.syncStateRepository.findOne({
      where: { parkId: park.id, syncType },
    });

    const fallback = new Date('2025-01-01T00:00:00Z');

    let from: Date;

    if (newOnly) {
      const existingState = await this.syncStateRepository.findOne({
        where: { parkId: park.id, syncType: YandexFleetSyncType.ProfilesExisting },
      });

      if (!existingState?.lastSyncedTo) {
        console.log(
          `[YandexFleetProfileService] Пропуск ${park.name}: existing синхронизация ещё не завершалась.`,
        );
        return;
      }

      const referenceDate = state?.lastSyncedTo ?? existingState.lastSyncedTo;
      from = new Date(referenceDate.getTime() - bufferOverlap);
    } else {
      from = state?.lastSyncedTo
        ? new Date(state.lastSyncedTo.getTime() - bufferOverlap)
        : fallback;
    }

    state = await this.syncStateRepository.save({
      ...(state ?? {}),
      parkId: park.id,
      syncType,
      status: YandexFleetSyncStatus.Running,
      lastRunAt: startedAt,
    });

    try {
      let offset = 0;
      const limit = newOnly ? 100 : 25;
      let total = 1;

      while (offset < total) {
        const response = await this.yandexService.getProfiles(park, limit, offset, from);
        total = response.total;
        const drivers = response.driver_profiles || [];

        if (drivers.length === 0) break;

        console.log(
          `[YandexFleetProfileService] Обработка пачки: ${offset + 1} - ${offset + drivers.length} из ${total}...`,
        );

        for (const driver of drivers) {
          try {
            await this.processYandexProfile(park, driver, newOnly);
          } catch (error) {
            console.error(
              `[YandexFleetProfileService] Ошибка обработки водителя ${driver.driver_profile.id}:`,
              error,
            );
          }
        }

        offset += limit;
      }

      await this.syncStateRepository.save({
        ...state,
        lastSyncedTo: startedAt,
        status: YandexFleetSyncStatus.Idle,
        lastError: null,
        retryCount: 0,
      });

      console.log(
        `[YandexFleetProfileService] Синхронизация ${newOnly ? 'новых' : 'всех'} профилей ${park.name} завершена.`,
      );
    } catch (error) {
      await this.syncStateRepository.save({
        ...state,
        status: YandexFleetSyncStatus.Failed,
        lastError: error instanceof Error ? error.message : String(error),
        retryCount: (state.retryCount ?? 0) + 1,
      });

      console.error(
        `[YandexFleetProfileService] Ошибка синхронизации ${newOnly ? 'новых' : 'всех'} профилей ${park.name}:`,
        error,
      );
    }
  }

  async syncProfileStages(park: YandexFleetParkEntity): Promise<void> {
    console.log(`[YandexFleetProfileService] Запуск синхронизации стадий: ${park.name}`);

    const category = getBitrixCategory(park.type);
    const stagesToSkip: string[] = [
      category.Duplicates,
      category.Refusal,
      category.SpamAdvertisingIlliquid,
      category.Pause,
      category.Archive,
    ];

    const BATCH_SIZE = 200;
    let offset = 0;
    let updated = 0;

    try {
      while (true) {
        const profiles = await this.yandexFleetProfileRepository.find({
          where: {
            parkId: park.id,
            bitrixStageId: Not(In(stagesToSkip)),
          },
          order: { yandexProfileId: 'ASC' },
          take: BATCH_SIZE,
          skip: offset,
        });

        if (profiles.length === 0) break;

        for (const profile of profiles) {
          try {
            if (!this.hasValidBitrixLinks(profile)) {
              console.log(
                `[YandexFleetProfileService] Пропуск stage sync для ${String(profile.yandexProfileId)}: профиль ещё не привязан к Bitrix.`,
              );
              continue;
            }

            const lastOrders = await this.yandexFleetOrderRepository.find({
              where: {
                profileId: profile.yandexProfileId,
                parkId: park.id,
                status: OrderStatus.Complete,
              },
              order: { bookedAt: 'DESC' },
              take: 30,
            });

            const nextStage = this.yandexFleetOrderService.resolveNextStage(
              park,
              lastOrders,
              profile.hiredAt ?? profile.fleetCreatedAt,
            );

            if (
              lastOrders.length > 0 &&
              profile.lastOrderDate?.getTime() !== lastOrders[0].bookedAt.getTime()
            ) {
              profile.lastOrderDate = lastOrders[0].bookedAt;
              await this.yandexFleetProfileRepository.save(profile);
            }

            if (!nextStage || nextStage === profile.bitrixStageId) continue;

            profile.bitrixStageId = nextStage;
            profile.dataHash = '';
            await this.yandexFleetProfileRepository.save(profile);

            await this.bitrixService.updateDeal(profile.bitrixDealId, {
              STAGE_ID: nextStage,
            });

            updated++;
          } catch (error) {
            console.error(
              `[YandexFleetProfileService] Ошибка обновления стадии для ${profile.yandexProfileId}:`,
              error,
            );
          }
        }

        offset += BATCH_SIZE;
      }

      console.log(
        `[YandexFleetProfileService] Синхронизация стадий ${park.name} завершена. Обновлено: ${updated}.`,
      );
    } catch (error) {
      console.error(`[YandexFleetProfileService] Ошибка синхронизации стадий ${park.name}:`, error);
    }
  }
  async processYandexProfile(
    park: YandexFleetParkEntity,
    driver: YandexFleetDriverProfileItem,
    newOnly: boolean,
  ): Promise<void> {
    let localState = await this.yandexFleetProfileRepository.findOneBy({
      yandexProfileId: driver.driver_profile.id,
    });

    if (newOnly && localState) return;

    const category = getBitrixCategory(park.type);
    const stagesToSkip: readonly string[] = [
      category.Duplicates,
      category.Refusal,
      category.SpamAdvertisingIlliquid,
    ];
    if (localState && stagesToSkip.includes(localState.bitrixStageId)) return;

    let driverCar = undefined;
    if (driver.car?.id) {
      driverCar = await this.yandexService.getCar(park, driver.car.id);
    }

    const driverProfile = await this.yandexService.getProfile(park, driver.driver_profile.id);

    if ((driverProfile.person.driver_license.country as string) === 'vnm') {
      driverProfile.person.driver_license.country = undefined;
    }

    let existingContactId: number | undefined;
    let needsRelink = false;

    if (!localState || !this.hasValidBitrixLinks(localState)) {
      if (localState) {
        await this.yandexFleetProfileRepository.remove(localState);
        localState = null;
      }
      needsRelink = true;
    } else {
      const linkedState: YandexFleetProfileEntity = localState;
      const contact = await this.bitrixService.getContact(linkedState.bitrixContactId);

      if (!contact) {
        await this.yandexFleetProfileRepository.remove(linkedState);
        localState = null;
        needsRelink = true;
      } else {
        const deals = await this.bitrixService.getDealsByContact(linkedState.bitrixContactId);
        const dealExists = deals.some((d) => String(d.ID) === linkedState.bitrixDealId);

        if (!dealExists) {
          await this.yandexFleetProfileRepository.remove(linkedState);
          localState = null;
          needsRelink = true;
        }
      }
    }

    if (needsRelink) {
      const result = await this.bitrixMapper.findAndLinkExistingBitrixProfile(
        park,
        driver,
        driverProfile,
        driverCar,
      );

      if (result.kind === 'linked') {
        localState = result.state;
        localState.dataHash = '';
      } else if (result.kind === 'contact-only') {
        existingContactId = result.contactId;
      }
    }

    const lastOrders = await this.yandexFleetOrderRepository.find({
      where: { profileId: driver.driver_profile.id, parkId: park.id, status: OrderStatus.Complete },
      order: { bookedAt: 'DESC' },
      take: 30,
    });

    let stage: string = localState ? localState.bitrixStageId : category.NotProcessed;
    const createdDate = new Date(driver.driver_profile.created_date);
    const hireDate = driverProfile.profile.hire_date
      ? new Date(driverProfile.profile.hire_date)
      : null;
    const nextStage = this.yandexFleetOrderService.resolveNextStage(
      park,
      lastOrders,
      hireDate ?? createdDate,
    );

    if (
      driver.driver_profile.work_status &&
      driver.driver_profile.work_status !== DriverWorkStatus.Working
    ) {
      stage = category.Archive;
    } else if (nextStage) {
      stage = nextStage;
    }

    const lastOrderDate = lastOrders.length > 0 ? new Date(lastOrders[0].bookedAt) : null;
    let firstOrderDate = localState?.firstOrderDate || null;

    if (!firstOrderDate) {
      const oldestLocalOrder = await this.yandexFleetOrderRepository.findOne({
        where: {
          profileId: driver.driver_profile.id,
          parkId: park.id,
          status: OrderStatus.Complete,
        },
        order: { bookedAt: 'ASC' },
      });

      if (oldestLocalOrder) {
        firstOrderDate = oldestLocalOrder.bookedAt;
      }
    }

    const currentHash = calculateDriverHash(driverProfile, driverCar, stage);

    if (!localState) {
      await this.bitrixMapper.createProfile({
        park,
        profileId: driver.driver_profile.id,
        driverProfile,
        driverCar,
        stage,
        currentHash,
        lastOrderDate,
        firstOrderDate,
        createdDate,
        existingContactId,
        accounts: driver.accounts,
      });
      return;
    } else if (localState.dataHash !== currentHash) {
      await this.bitrixMapper.updateProfile({
        park,
        profileId: driver.driver_profile.id,
        driverProfile,
        driverCar,
        stage,
        currentHash,
        localState,
        lastOrderDate,
        createdDate,
        firstOrderDate,
        accounts: driver.accounts,
      });
      return;
    }

    let shouldSave = false;

    if (localState.lastOrderDate?.getTime() !== lastOrderDate?.getTime()) {
      localState.lastOrderDate = lastOrderDate;
      shouldSave = true;
    }
    if (localState.firstOrderDate?.getTime() !== firstOrderDate?.getTime()) {
      localState.firstOrderDate = firstOrderDate;
      shouldSave = true;
    }
    if (localState.fleetCreatedAt?.getTime() !== createdDate.getTime()) {
      localState.fleetCreatedAt = createdDate;
      shouldSave = true;
    }
    if (applyBalanceToProfile(localState, driver.accounts)) {
      shouldSave = true;
    }

    if (shouldSave) {
      await this.yandexFleetProfileRepository.save(localState);
    }
  }
}
