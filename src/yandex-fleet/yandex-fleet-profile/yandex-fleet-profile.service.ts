import { Repository } from 'typeorm';
import { YandexFleetService } from '../yandex-fleet.service';
import { BitrixService } from '../../bitrix/bitrix.service';
import { YandexFleetProfileEntity } from './yandex-fleet-profile.entity';
import { BITRIX_DICT, BITRIX_FIELDS, YANDEX_TO_BITRIX_PARK } from '../../bitrix/bitrix.type';
import {
  DriverWorkStatus,
  VehicleAmenities,
  YandexFleetDriverProfileItem,
} from '../yandex-fleet.type';
import {
  calculateDriverHash,
  cleanPayload,
  formatDateForBitrix,
  mapAggregator,
  mapCategory,
  mapDlCountryToBitrix,
  mapEmploymentType,
  mapFuelType,
  mapTransmission,
  mapVacancy,
  mapVehicleType,
  mapYandexColorToBitrix,
} from '../yandex-fleet.utils';
import { getBitrixCategory } from '../../bitrix/bitrix.utils';

export class YandexFleetProfileService {
  constructor(
    private yandexService: YandexFleetService,
    private bitrixService: BitrixService,
    private yandexFleetProfileRepository: Repository<YandexFleetProfileEntity>,
  ) {}

  async syncProfiles(yandexParkId: string): Promise<void> {
    console.log(`[YandexFleetProfileService] Запуск поллинга профилей для парка: ${yandexParkId}`);
    try {
      let offset = 0;
      const limit = 100;
      let total = 1;

      while (offset < total) {
        const response = await this.yandexService.getProfiles(yandexParkId, limit, offset);

        total = response.total;
        const drivers = response.driver_profiles || [];

        if (drivers.length === 0) {
          break;
        }

        console.log(
          `[YandexFleetProfileService] Обработка пачки: ${offset + 1} - ${offset + drivers.length} из ${total}...`,
        );
        for (const driver of drivers) {
          await this.processYandexProfile(yandexParkId, driver.driver_profile.id, driver);
          total = 0;
        }

        offset += limit;

        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      console.log(
        `[YandexFleetProfileService] Поллинг профилей для парка ${yandexParkId} успешно завершен. Обработано: ${total}`,
      );
    } catch (error) {
      console.error(
        `[YandexFleetProfileService] Ошибка синхронизации профилей парка ${yandexParkId}:`,
        error,
      );
    }
  }

  private async processYandexProfile(
    parkId: string,
    profileId: string,
    driver: YandexFleetDriverProfileItem,
  ): Promise<void> {
    const localState = await this.yandexFleetProfileRepository.findOneBy({
      yandexProfileId: profileId,
    });

    const category = getBitrixCategory(parkId);
    const stagesToSkip: readonly string[] = [category.Archive, category.Duplicates];
    if (localState && stagesToSkip.includes(localState.bitrixStageId)) {
      return;
    }

    let isArchive = false;
    if (driver.driver_profile.work_status !== DriverWorkStatus.Working) {
      isArchive = true;
    }

    if (isArchive && localState) {
      localState.bitrixStageId = category.Archive;
    }

    let driverCar = undefined;
    if (driver.car?.id) {
      driverCar = await this.yandexService.getCar(parkId, driver.car?.id);
    }

    const driverProfile = await this.yandexService.getProfile(parkId, driver.driver_profile.id);

    // Yandex API Bug fix
    if ((driverProfile.person.driver_license.country as string) === 'vnm') {
      driverProfile.person.driver_license.country = undefined;
    }
    const person = driverProfile.person;
    const profile = driverProfile.profile;
    const dl = driverProfile.person.driver_license;

    const cargo = driverCar?.cargo;
    const vehicleSpecifications = driverCar?.vehicle_specifications;
    const vehiclePark = driverCar?.park_profile;
    const vehicleLicenses = driverCar?.vehicle_licenses;

    if (!profileId) return;

    const currentHash = calculateDriverHash(driverProfile, driverCar, localState?.bitrixStageId);

    const phone = person.contact_info.phone;
    const firstName = person.full_name.first_name || 'Неизвестно';
    const lastName = person.full_name.last_name || 'Неизвестно';
    const middleName = person.full_name.middle_name;

    const dealPayload = cleanPayload({
      [BITRIX_FIELDS.FIRST_NAME_DISP]: firstName,
      [BITRIX_FIELDS.LAST_NAME_DISP]: lastName,
      [BITRIX_FIELDS.PATRONYMIC_DISP]: middleName,
      [BITRIX_FIELDS.PHONE_DISP]: phone,
      [BITRIX_FIELDS.PHONE_SYSTEM]: phone,
      [BITRIX_FIELDS.VACANCY]: mapVacancy(driverCar),
      // [BITRIX_FIELDS.CONTRACTOR_TYPE]: undefined,
      [BITRIX_FIELDS.AGGREGATOR]: mapAggregator(parkId),
      [BITRIX_FIELDS.HIRE_DATE]: formatDateForBitrix(profile.hire_date),
      COMMENTS: profile.comment,

      // ВУ
      [BITRIX_FIELDS.DL_SERIES_NUMBER]: dl?.number,
      [BITRIX_FIELDS.DL_ISSUE_DATE]: formatDateForBitrix(dl?.issue_date),
      [BITRIX_FIELDS.DL_EXPIRY_DATE]: formatDateForBitrix(dl?.expiry_date),
      [BITRIX_FIELDS.DL_COUNTRY_ISSUED]: mapDlCountryToBitrix(dl?.country),

      // Автомобиль
      [BITRIX_FIELDS.BRAND]: vehicleSpecifications?.brand,
      [BITRIX_FIELDS.MODEL]: vehicleSpecifications?.model,
      [BITRIX_FIELDS.YEAR]: vehicleSpecifications?.year,
      [BITRIX_FIELDS.LICENSE_PLATE]: vehicleLicenses?.licence_plate_number,
      [BITRIX_FIELDS.STS]: vehicleLicenses?.registration_certificate,
      [BITRIX_FIELDS.COLOR]: mapYandexColorToBitrix(vehicleSpecifications?.color),

      [BITRIX_FIELDS.VEHICLE_TYPE]: mapVehicleType(driverCar),
      [BITRIX_FIELDS.EMPLOYMENT_TYPE]: mapEmploymentType(person.employment_type),

      [BITRIX_FIELDS.EQUIPMENT]: vehiclePark?.amenities?.includes(VehicleAmenities.Conditioner)
        ? [BITRIX_DICT.EQUIPMENT.AIR_CONDITIONING]
        : undefined,

      [BITRIX_FIELDS.TAGS]: !localState ? [BITRIX_DICT.TAGS.NEW_CONTRACTOR] : undefined,

      [BITRIX_FIELDS.LENGTH]: cargo?.cargo_hold_dimensions?.length,
      [BITRIX_FIELDS.HEIGHT]: cargo?.cargo_hold_dimensions?.height,
      [BITRIX_FIELDS.WIDTH]: cargo?.cargo_hold_dimensions?.width,
      [BITRIX_FIELDS.LOAD_CAPACITY]: cargo?.carrying_capacity,
      [BITRIX_FIELDS.TRANSMISSION]: mapTransmission(vehicleSpecifications?.transmission),
      [BITRIX_FIELDS.FUEL_TYPE]: mapFuelType(vehiclePark?.fuel_type),

      [BITRIX_FIELDS.CAR_OWNER]:
        vehiclePark?.is_park_property !== undefined ? !vehiclePark.is_park_property : undefined,
      // [BITRIX_FIELDS.DEVICE_TYPE]: undefined,

      [BITRIX_FIELDS.ADDRESS_DISP]: person.contact_info.address,
      [BITRIX_FIELDS.ORDER_PROVIDER_PLATFORM]: driverProfile.order_provider.platform,
      [BITRIX_FIELDS.ORDER_PROVIDER_PARTNER]: driverProfile.order_provider.partner,
      [BITRIX_FIELDS.DRIVING_EXPERIENCE]: formatDateForBitrix(
        person.driver_license_experience?.total_since_date,
      ),
      // [BITRIX_FIELDS.WORK_TYPE]: undefined,
    });

    if (!localState) {
      console.log(`[YandexFleetProfileService] Найден новый водитель: ${profileId}. Создаем...`);

      try {
        const bitrixDispatcherId = YANDEX_TO_BITRIX_PARK[parkId];
        if (!bitrixDispatcherId) {
          console.warn(`[YandexFleetProfileService] Внимание! Парк ${parkId} не найден.`);
          return;
        }

        const contactId = await this.bitrixService.createContact(
          cleanPayload({
            NAME: firstName,
            LAST_NAME: lastName,
            SECOND_NAME: middleName,
            BIRTHDATE: formatDateForBitrix(dl?.birth_date),
            PHONE: phone ? [{ VALUE: phone, VALUE_TYPE: 'WORK' }] : [],
          }),
        );

        const stage = isArchive ? category.Archive : category.NotProcessed;

        const dealId = await this.bitrixService.createDeal({
          STAGE_ID: stage,
          TITLE: `${lastName} ${firstName}`,
          CONTACT_ID: contactId,
          CATEGORY_ID: mapCategory(parkId),
          [BITRIX_FIELDS.DISPATCHER]: bitrixDispatcherId,
          [BITRIX_FIELDS.PROFILE_ID]: profileId,
          [BITRIX_FIELDS.PROFILE_LINK]:
            'https://fleet.yandex.ru/contractors/' + profileId + '/details?park_id=' + parkId,
          ...dealPayload,
        });

        await this.yandexFleetProfileRepository.save({
          yandexProfileId: profileId,
          parkId,
          bitrixStageId: stage,
          bitrixContactId: String(contactId),
          bitrixDealId: String(dealId),
          dataHash: currentHash,
          hireDate: profile.hire_date ?? new Date().toISOString(),
        });

        console.log(
          `[YandexFleetProfileService] Создан Контакт (${contactId}) и Сделка (${dealId}).`,
        );
      } catch (error) {
        console.error(`[YandexFleetProfileService] Ошибка создания ${profileId}:`, error);
      }

      return;
    }

    if (localState.dataHash !== currentHash) {
      console.log(`[YandexFleetProfileService] Изменения у водителя ${profileId}. Обновляем...`);

      try {
        if (localState.bitrixContactId) {
          await this.bitrixService.updateContact(
            localState.bitrixContactId,
            cleanPayload({
              NAME: firstName,
              LAST_NAME: lastName,
              SECOND_NAME: middleName,
              BIRTHDATE: formatDateForBitrix(dl?.birth_date),
              PHONE: phone ? [{ VALUE: phone, VALUE_TYPE: 'WORK' }] : [],
            }),
          );
        }

        if (isArchive) {
          dealPayload['STAGE_ID'] = category.Archive;
        }

        if (localState.bitrixDealId) {
          await this.bitrixService.updateDeal(localState.bitrixDealId, dealPayload);
        }

        localState.dataHash = currentHash;
        await this.yandexFleetProfileRepository.save(localState);

        console.log(`[YandexFleetProfileService] Успех! Обновлен профиль ${profileId}.`);
      } catch (error) {
        console.error(
          `[YandexFleetProfileService] Ошибка обновления водителя ${profileId}:`,
          error,
        );
      }

      return;
    }
  }

  async saveProfile(
    yandexProfileId: string,
    parkId: string,
    contactId: string,
    dealId: string,
    hash: string,
    stage: string | undefined,
  ) {
    const data: Partial<YandexFleetProfileEntity> = {
      yandexProfileId,
      parkId,
      bitrixContactId: contactId,
      bitrixDealId: dealId,
      dataHash: hash,
    };

    if (stage) {
      data.bitrixStageId = stage;
    }
    await this.yandexFleetProfileRepository.save(data);
  }
}
