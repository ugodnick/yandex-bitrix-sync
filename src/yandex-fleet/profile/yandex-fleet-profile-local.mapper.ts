import { Repository } from 'typeorm';
import { YandexFleetParkEntity } from '../park/yandex-fleet-park.entity';
import {
  EAT_BITRIX_STUB_CONTACT_ID,
  EAT_BITRIX_STUB_DEAL_ID,
} from '../park/yandex-fleet-park-eat.utils';
import { YandexFleetDriverProfile } from './yandex-fleet-profile.type';
import { YandexFleetVehicleData } from '../vehicle/yandex-fleet-vehicle.type';
import { YandexFleetProfileEntity } from './yandex-fleet-profile.entity';
import { applyBalanceToProfile } from './yandex-fleet-profile-balance.utils';
import { mapEmploymentTypeName } from './yandex-fleet-profile-bitrix.utils';
import { mapVehicleTypeName } from '../vehicle/yandex-fleet-vehicle-bitrix.utils';
import { YandexFleetDriverProfileItem } from './yandex-fleet-profile.type';

export class YandexFleetProfileLocalMapper {
  constructor(private readonly profileRepository: Repository<YandexFleetProfileEntity>) {}

  extractFlatFields(
    driverProfile: YandexFleetDriverProfile,
    driverCar: YandexFleetVehicleData | undefined,
    lastOrderDate: Date | null,
    firstOrderDate: Date | null,
  ) {
    const person = driverProfile.person;
    return {
      firstName: person.full_name.first_name || 'Неизвестно',
      lastName: person.full_name.last_name || 'Неизвестно',
      middleName: person.full_name.middle_name || null,
      phone: person.contact_info.phone || null,
      employmentType: mapEmploymentTypeName(person.employment_type),
      workRuleId: driverProfile.account.work_rule_id,
      vehicleType: mapVehicleTypeName(driverCar),
      firstOrderDate,
      lastOrderDate,
    };
  }

  async createProfile(params: {
    park: YandexFleetParkEntity;
    profileId: string;
    driverProfile: YandexFleetDriverProfile;
    driverCar: YandexFleetVehicleData | undefined;
    stage: string;
    currentHash: string;
    lastOrderDate: Date | null;
    firstOrderDate: Date | null;
    createdDate: Date;
    accounts: YandexFleetDriverProfileItem['accounts'];
  }): Promise<void> {
    const {
      park,
      profileId,
      driverProfile,
      driverCar,
      stage,
      currentHash,
      lastOrderDate,
      firstOrderDate,
      createdDate,
      accounts,
    } = params;

    const flat = this.extractFlatFields(driverProfile, driverCar, lastOrderDate, firstOrderDate);

    const profileEntity: Partial<YandexFleetProfileEntity> = {
      yandexProfileId: profileId,
      parkId: park.id,
      bitrixStageId: stage,
      bitrixContactId: EAT_BITRIX_STUB_CONTACT_ID,
      bitrixDealId: EAT_BITRIX_STUB_DEAL_ID,
      dataHash: currentHash,
      hiredAt: driverProfile.profile.hire_date ? new Date(driverProfile.profile.hire_date) : null,
      fleetCreatedAt: createdDate,
      ...flat,
    };
    applyBalanceToProfile(profileEntity as YandexFleetProfileEntity, accounts);
    await this.profileRepository.save(profileEntity);

    console.log(
      `[YandexFleetProfileLocalMapper] Профиль ${profileId} в парке ${park.name} создан (локально).`,
    );
  }

  async updateProfile(params: {
    park: YandexFleetParkEntity;
    driverProfile: YandexFleetDriverProfile;
    driverCar: YandexFleetVehicleData | undefined;
    stage: string;
    currentHash: string;
    localState: YandexFleetProfileEntity;
    createdDate: Date;
    lastOrderDate: Date | null;
    firstOrderDate: Date | null;
    accounts: YandexFleetDriverProfileItem['accounts'];
  }): Promise<void> {
    const {
      park,
      driverProfile,
      driverCar,
      currentHash,
      localState,
      stage,
      lastOrderDate,
      firstOrderDate,
      createdDate,
      accounts,
    } = params;

    const flat = this.extractFlatFields(driverProfile, driverCar, lastOrderDate, firstOrderDate);
    Object.assign(localState, flat);
    localState.dataHash = currentHash;
    localState.bitrixStageId = stage;
    localState.hiredAt = driverProfile.profile.hire_date
      ? new Date(driverProfile.profile.hire_date)
      : null;
    localState.fleetCreatedAt = createdDate;
    applyBalanceToProfile(localState, accounts);
    await this.profileRepository.save(localState);

    console.log(
      `[YandexFleetProfileLocalMapper] Профиль ${localState.yandexProfileId} в парке ${park.name} обновлен (локально).`,
    );
  }
}
