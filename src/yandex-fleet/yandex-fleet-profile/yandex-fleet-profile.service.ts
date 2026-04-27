import { Repository } from 'typeorm';
import { YandexFleetService } from '../yandex-fleet.service';
import { BitrixService } from '../../bitrix/bitrix.service';
import { YandexFleetProfileEntity } from './yandex-fleet-profile.entity';
import {
  BITRIX_DICT,
  BITRIX_FIELDS,
  BITRIX_TO_YANDEX_PARK,
  BitrixContactFields,
  BitrixDealFields,
  YANDEX_TO_BITRIX_PARK,
} from '../../bitrix/bitrix.type';
import {
  DriverWorkStatus,
  VehicleAmenities,
  YandexFleetDriverProfile,
  YandexFleetDriverProfileItem,
  YandexFleetVehicleData,
} from '../yandex-fleet.type';
import {
  calculateDriverHash,
  cleanPayload,
  formatDateForBitrix,
  mapVehicleTypeName,
  mapAggregator,
  mapCategory,
  mapDlCountryToBitrix,
  mapEmploymentType,
  mapEmploymentTypeName,
  mapFuelType,
  mapTransmission,
  mapVacancy,
  mapVehicleType,
  mapYandexColorToBitrix,
  mapContractorType,
  mapCarOwnership,
} from '../yandex-fleet.utils';
import { getBitrixCategory } from '../../bitrix/bitrix.utils';
import { YandexFleetOrderService } from '../yandex-fleet-order/yandex-fleet-order.service';

export class YandexFleetProfileService {
  constructor(
    private yandexService: YandexFleetService,
    private bitrixService: BitrixService,
    private yandexFleetOrderService: YandexFleetOrderService,
    private yandexFleetProfileRepository: Repository<YandexFleetProfileEntity>,
  ) {}

  async syncProfiles(yandexParkId: string): Promise<void> {
    console.log(`[YandexFleetProfileService] Запуск поллинга профилей для парка: ${yandexParkId}`);
    try {
      let offset = 0;
      const limit = 25;
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
          try {
            const exist = await this.yandexFleetProfileRepository.findOne({
              where: { yandexProfileId: driver.driver_profile.id },
            });
            if (exist) continue; // temp for fast first sync

            await this.processYandexProfile(yandexParkId, driver.driver_profile.id, driver);
          } catch (error) {
            console.error(
              `[YandexFleetProfileService] Ошибка обработки водителя ${driver.driver_profile.id} в парке ${yandexParkId}:`,
              error,
            );
          }
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

  private buildContactPayload(driverProfile: YandexFleetDriverProfile) {
    const person = driverProfile.person;
    const dl = person.driver_license;
    const phone = person.contact_info.phone;
    const firstName = person.full_name.first_name || 'Неизвестно';
    const lastName = person.full_name.last_name || 'Неизвестно';
    const middleName = person.full_name.middle_name;

    return cleanPayload({
      NAME: firstName,
      LAST_NAME: lastName,
      SECOND_NAME: middleName,
      BIRTHDATE: formatDateForBitrix(dl?.birth_date),
      PHONE: phone ? [{ VALUE: phone, VALUE_TYPE: 'WORK' }] : [],
    });
  }

  private buildDealPayload(
    profileId: string,
    parkId: string,
    driverProfile: YandexFleetDriverProfile,
    driverCar: YandexFleetVehicleData | undefined,
    isNew: boolean,
  ) {
    const person = driverProfile.person;
    const profile = driverProfile.profile;
    const dl = person.driver_license;
    const phone = person.contact_info.phone;
    const firstName = person.full_name.first_name || 'Неизвестно';
    const lastName = person.full_name.last_name || 'Неизвестно';
    const middleName = person.full_name.middle_name;

    const cargo = driverCar?.cargo;
    const vehicleSpecifications = driverCar?.vehicle_specifications;
    const vehiclePark = driverCar?.park_profile;
    const vehicleLicenses = driverCar?.vehicle_licenses;

    return cleanPayload({
      [BITRIX_FIELDS.BIRTH_DATE]: formatDateForBitrix(dl.birth_date),
      [BITRIX_FIELDS.FIRST_NAME_DISP]: firstName,
      [BITRIX_FIELDS.LAST_NAME_DISP]: lastName,
      [BITRIX_FIELDS.PATRONYMIC_DISP]: middleName,
      [BITRIX_FIELDS.PHONE_DISP]: phone,
      [BITRIX_FIELDS.PHONE_SYSTEM]: phone,
      [BITRIX_FIELDS.VACANCY]: mapVacancy(driverCar),
      [BITRIX_FIELDS.CONTRACTOR_TYPE]: mapContractorType(driverCar),
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
      [BITRIX_FIELDS.VIN]: vehicleSpecifications?.vin,

      [BITRIX_FIELDS.VEHICLE_TYPE]: mapVehicleType(driverCar),
      [BITRIX_FIELDS.EMPLOYMENT_TYPE]: mapEmploymentType(person.employment_type),

      [BITRIX_FIELDS.EQUIPMENT]: vehiclePark?.amenities?.includes(VehicleAmenities.Conditioner)
        ? [BITRIX_DICT.EQUIPMENT.AIR_CONDITIONING]
        : undefined,

      [BITRIX_FIELDS.TAGS]: isNew ? [BITRIX_DICT.TAGS.NEW_CONTRACTOR] : undefined,

      [BITRIX_FIELDS.LENGTH]: cargo?.cargo_hold_dimensions?.length,
      [BITRIX_FIELDS.HEIGHT]: cargo?.cargo_hold_dimensions?.height,
      [BITRIX_FIELDS.WIDTH]: cargo?.cargo_hold_dimensions?.width,
      [BITRIX_FIELDS.LOAD_CAPACITY]: cargo?.carrying_capacity,
      [BITRIX_FIELDS.TRANSMISSION]: mapTransmission(vehicleSpecifications?.transmission),
      [BITRIX_FIELDS.FUEL_TYPE]: mapFuelType(vehiclePark?.fuel_type),

      [BITRIX_FIELDS.CAR_OWNER]: mapCarOwnership(driverCar),

      [BITRIX_FIELDS.ADDRESS_DISP]: person.contact_info.address,
      [BITRIX_FIELDS.ORDER_PROVIDER_PLATFORM]: driverProfile.order_provider.platform,
      [BITRIX_FIELDS.ORDER_PROVIDER_PARTNER]: driverProfile.order_provider.partner,
      [BITRIX_FIELDS.DRIVING_EXPERIENCE]: formatDateForBitrix(
        person.driver_license_experience?.total_since_date,
      ),
      [BITRIX_FIELDS.BALANCE_LIMIT]: driverProfile.account.balance_limit,
      [BITRIX_FIELDS.PROFILE_ID]: profileId,
      [BITRIX_FIELDS.PROFILE_LINK]:
        'https://fleet.yandex.ru/contractors/' + profileId + '/details?park_id=' + parkId,
    });
  }

  private async createProfile(params: {
    parkId: string;
    profileId: string;
    driverProfile: YandexFleetDriverProfile;
    driverCar: YandexFleetVehicleData | undefined;
    stage: string;
    currentHash: string;
    lastOrderDate: Date | null;
    firstOrderDate: Date | null;
    hiredAt: Date;
    existingContactId?: number;
  }): Promise<void> {
    const {
      parkId,
      profileId,
      driverProfile,
      driverCar,
      stage,
      currentHash,
      lastOrderDate,
      firstOrderDate,
      hiredAt,
      existingContactId,
    } = params;

    const bitrixDispatcherId = YANDEX_TO_BITRIX_PARK[parkId];
    if (!bitrixDispatcherId) {
      console.warn(`[YandexFleetProfileService] Внимание! Парк ${parkId} не найден.`);
      return;
    }

    const flat = this.extractFlatFields(driverProfile, driverCar, lastOrderDate, firstOrderDate);
    const contactPayload = this.buildContactPayload(driverProfile);
    const dealPayload = this.buildDealPayload(profileId, parkId, driverProfile, driverCar, true);

    let contactId: number;
    if (existingContactId) {
      await this.bitrixService.updateContact(String(existingContactId), contactPayload);
      contactId = existingContactId;
      console.log(
        `[YandexFleetProfileService] Используем существующий контакт ${contactId}, создаём для него сделку.`,
      );
    } else {
      contactId = await this.bitrixService.createContact(contactPayload);
    }

    const dealId = await this.bitrixService.createDeal({
      STAGE_ID: stage,
      TITLE: `${flat.lastName} ${flat.firstName}`,
      CONTACT_ID: contactId,
      CATEGORY_ID: mapCategory(parkId),
      [BITRIX_FIELDS.DISPATCHER]: bitrixDispatcherId,
      ...dealPayload,
    });

    await this.yandexFleetProfileRepository.save({
      yandexProfileId: profileId,
      parkId,
      bitrixStageId: stage,
      bitrixContactId: String(contactId),
      bitrixDealId: String(dealId),
      dataHash: currentHash,
      hiredAt,
      ...flat,
    });

    console.log(
      `[YandexFleetProfileService] Создана Сделка (${dealId}) для контакта (${contactId}).`,
    );
  }

  private async updateProfile(params: {
    parkId: string;
    profileId: string;
    driverProfile: YandexFleetDriverProfile;
    driverCar: YandexFleetVehicleData | undefined;
    stage: string;
    currentHash: string;
    localState: YandexFleetProfileEntity;
    lastOrderDate: Date | null;
    firstOrderDate: Date | null;
  }): Promise<void> {
    const {
      parkId,
      profileId,
      driverProfile,
      driverCar,
      currentHash,
      localState,
      stage,
      lastOrderDate,
      firstOrderDate,
    } = params;

    const contactPayload = this.buildContactPayload(driverProfile);
    const dealPayload = this.buildDealPayload(profileId, parkId, driverProfile, driverCar, false);
    dealPayload.STAGE_ID = stage;

    if (localState.bitrixContactId) {
      await this.bitrixService.updateContact(localState.bitrixContactId, contactPayload);
    }

    if (localState.bitrixDealId) {
      await this.bitrixService.updateDeal(localState.bitrixDealId, dealPayload);
    }

    const flat = this.extractFlatFields(driverProfile, driverCar, lastOrderDate, firstOrderDate);
    Object.assign(localState, flat);
    localState.dataHash = currentHash;
    localState.bitrixStageId = stage;
    await this.yandexFleetProfileRepository.save(localState);

    console.log(`[YandexFleetProfileService] Успех! Обновлен профиль ${profileId}.`);
  }

  private async processYandexProfile(
    parkId: string,
    profileId: string,
    driver: YandexFleetDriverProfileItem,
  ): Promise<void> {
    let localState = await this.yandexFleetProfileRepository.findOneBy({
      yandexProfileId: profileId,
    });

    const category = getBitrixCategory(parkId);
    const stagesToSkip: readonly string[] = [
      category.Duplicates,
      category.Refusal,
      category.SpamAdvertisingIlliquid,
      category.Pause,
    ];
    if (localState && stagesToSkip.includes(localState.bitrixStageId)) return;

    let driverCar = undefined;
    if (driver.car?.id) {
      driverCar = await this.yandexService.getCar(parkId, driver.car.id);
    }

    const driverProfile = await this.yandexService.getProfile(parkId, driver.driver_profile.id);

    // Yandex API Bug fix
    if ((driverProfile.person.driver_license.country as string) === 'vnm') {
      driverProfile.person.driver_license.country = undefined;
    }

    let existingContactId: number | undefined;

    if (!localState) {
      const result = await this.findAndLinkExistingBitrixProfile(
        parkId,
        profileId,
        driver,
        driverProfile,
        driverCar,
      );

      if (result.kind === 'linked') {
        localState = result.state;
      } else if (result.kind === 'contact-only') {
        existingContactId = result.contactId;
      }
    }

    const hiredAt = new Date(driverProfile.profile.hire_date || driver.driver_profile.created_date);
    const lastOrders = await this.yandexService.getLastDriverOrders(parkId, profileId, hiredAt);
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    let stage: string = localState ? localState.bitrixStageId : category.NotProcessed;
    const nextStage = this.yandexFleetOrderService.resolveNextStage(lastOrders);

    if (
      driver.driver_profile.work_status &&
      driver.driver_profile.work_status !== DriverWorkStatus.Working
    ) {
      stage = category.Archive;
    } else if (nextStage && hiredAt < monthAgo) {
      stage = nextStage;
    }

    const lastOrderDate = lastOrders.length > 0 ? new Date(lastOrders[0].booked_at) : null;
    let firstOrderDate = localState?.firstOrderDate || null;

    if (!firstOrderDate) {
      firstOrderDate = await this.yandexService.getFirstOrderDate(parkId, profileId, hiredAt);
    }

    const currentHash = calculateDriverHash(driverProfile, driverCar, stage);

    if (!localState) {
      console.log(
        existingContactId
          ? `[YandexFleetProfileService] Создаём сделку для существующего контакта ${existingContactId}, профиль ${profileId}.`
          : `[YandexFleetProfileService] Найден новый водитель: ${profileId}. Создаём...`,
      );

      await this.createProfile({
        parkId,
        profileId,
        driverProfile,
        driverCar,
        stage,
        currentHash,
        lastOrderDate,
        firstOrderDate,
        hiredAt,
        existingContactId,
      });

      return;
    }

    if (localState.dataHash !== currentHash) {
      console.log(`[YandexFleetProfileService] Изменения у водителя ${profileId}. Обновляем...`);

      await this.updateProfile({
        parkId,
        profileId,
        driverProfile,
        driverCar,
        stage,
        currentHash,
        localState,
        lastOrderDate,
        firstOrderDate,
      });

      return;
    } else if (
      localState.lastOrderDate !== lastOrderDate ||
      localState.firstOrderDate !== firstOrderDate
    ) {
      localState.lastOrderDate = lastOrderDate;
      localState.firstOrderDate = firstOrderDate;
      await this.yandexFleetProfileRepository.save(localState);
    }
  }

  private extractFlatFields(
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

  private async findAndLinkExistingBitrixProfile(
    parkId: string,
    profileId: string,
    driver: YandexFleetDriverProfileItem,
    driverProfile: YandexFleetDriverProfile,
    driverCar: YandexFleetVehicleData | undefined,
  ): Promise<
    | { kind: 'linked'; state: YandexFleetProfileEntity }
    | { kind: 'contact-only'; contactId: number }
    | { kind: 'none' }
  > {
    const category = getBitrixCategory(parkId);

    const phones = Array.from(
      new Set(
        [...driver.driver_profile.phones, driverProfile.person.contact_info.phone].filter(Boolean),
      ),
    );

    const contactArrays = await Promise.all(
      phones.map((phone) => this.bitrixService.getContactsByPhone(phone)),
    );

    const uniqueContacts = Array.from(
      new Map(
        contactArrays
          .flat()
          .filter((c) => c.ID)
          .map((c) => [c.ID, c]),
      ).values(),
    );

    if (uniqueContacts.length === 0) return { kind: 'none' };

    const best = await this.pickBestContact(uniqueContacts, category.Duplicates);
    if (!best) return { kind: 'none' };

    const { contact, deals } = best;
    const candidateDeals = deals.filter((d) => d.STAGE_ID !== category.Duplicates);

    const getDispatcherId = (deal: BitrixDealFields): string => {
      const field = deal[BITRIX_FIELDS.DISPATCHER];
      if (!field) return '';
      return Array.isArray(field) && field.length > 0 ? String(field[0]) : String(field);
    };

    let matchedDeal: BitrixDealFields | undefined;

    for (const deal of candidateDeals) {
      const dealProfileId = deal[BITRIX_FIELDS.PROFILE_ID]
        ? String(deal[BITRIX_FIELDS.PROFILE_ID])
        : undefined;

      if (dealProfileId === profileId) {
        matchedDeal = deal;
        break;
      }
    }

    if (!matchedDeal) {
      for (const deal of candidateDeals) {
        const dispatcherId = getDispatcherId(deal);
        const dealProfileId = deal[BITRIX_FIELDS.PROFILE_ID]
          ? String(deal[BITRIX_FIELDS.PROFILE_ID])
          : undefined;

        if (BITRIX_TO_YANDEX_PARK[dispatcherId] !== parkId) continue;
        if (dealProfileId && dealProfileId !== profileId) continue;

        const alreadyLinked = await this.yandexFleetProfileRepository.findOneBy({
          bitrixDealId: String(deal.ID),
        });
        if (alreadyLinked && alreadyLinked.yandexProfileId !== profileId) continue;

        matchedDeal = deal;
        break;
      }
    }

    if (!matchedDeal) {
      for (const deal of candidateDeals) {
        if (deal[BITRIX_FIELDS.DISPATCHER] || deal[BITRIX_FIELDS.PROFILE_ID]) continue;

        const alreadyLinked = await this.yandexFleetProfileRepository.findOneBy({
          bitrixDealId: String(deal.ID),
        });
        if (alreadyLinked && alreadyLinked.yandexProfileId !== profileId) continue;

        matchedDeal = deal;
        break;
      }
    }

    if (matchedDeal) {
      const stage = matchedDeal.STAGE_ID;
      const hireDateRaw = matchedDeal[BITRIX_FIELDS.HIRE_DATE];
      const hiredAt =
        (hireDateRaw ? String(hireDateRaw) : undefined) ??
        matchedDeal.DATE_CREATE ??
        new Date().toISOString();

      const state = await this.yandexFleetProfileRepository.save({
        yandexProfileId: profileId,
        parkId,
        bitrixStageId: stage,
        bitrixContactId: String(matchedDeal.CONTACT_ID),
        bitrixDealId: String(matchedDeal.ID),
        dataHash: calculateDriverHash(driverProfile, driverCar, stage),
        hiredAt,
        firstOrderDate: null,
        lastOrderDate: null,
        firstName: driverProfile.person.full_name.first_name || 'Неизвестно',
        lastName: driverProfile.person.full_name.last_name || 'Неизвестно',
        middleName: driverProfile.person.full_name.middle_name,
        phone: driverProfile.person.contact_info.phone || null,
        employmentType: mapEmploymentTypeName(driverProfile.person.employment_type),
        workRuleId: driverProfile.account.work_rule_id,
        vehicleType: mapVehicleTypeName(driverCar),
      });

      return { kind: 'linked', state };
    }

    return { kind: 'contact-only', contactId: Number(contact.ID) };
  }

  private async pickBestContact(
    contacts: BitrixContactFields[],
    duplicatesStage: string,
  ): Promise<{ contact: BitrixContactFields; deals: BitrixDealFields[] } | null> {
    if (contacts.length === 0) return null;

    const contactsWithDeals = await Promise.all(
      contacts.map(async (contact) => {
        const allDeals = await this.bitrixService.getDealsByContact(contact.ID!);

        const validDeals = allDeals.filter((d) => d.STAGE_ID !== duplicatesStage);
        return { contact, deals: allDeals, validDealsCount: validDeals.length };
      }),
    );

    const usable = contactsWithDeals.filter((c) => c.validDealsCount > 0);
    const pool = usable.length > 0 ? usable : contactsWithDeals;

    pool.sort((a, b) => b.validDealsCount - a.validDealsCount);

    return { contact: pool[0].contact, deals: pool[0].deals };
  }
}
