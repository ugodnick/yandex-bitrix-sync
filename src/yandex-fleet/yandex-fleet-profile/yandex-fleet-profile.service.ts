import { In, IsNull, LessThanOrEqual, Not, Repository } from 'typeorm';
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
import { YandexFleetOrderEntity } from '../yandex-fleet-order/yandex-fleet-order.entity';

export class YandexFleetProfileService {
  constructor(
    private yandexService: YandexFleetService,
    private bitrixService: BitrixService,
    private yandexFleetOrderService: YandexFleetOrderService,
    private yandexFleetProfileRepository: Repository<YandexFleetProfileEntity>,
    private yandexFleetOrderRepository: Repository<YandexFleetOrderEntity>,
  ) {}

  async syncProfiles(yandexParkId: string, newOnly: boolean): Promise<void> {
    console.log(
      `[YandexFleetProfileService] Запуск синхронизации ${newOnly ? 'новых' : 'всех'} профилей: ${yandexParkId}`,
    );
    try {
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const twelveHoursAgo = new Date();
      twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);

      let offset = 0;
      const limit = newOnly ? 100 : 25;
      let total = 1;

      while (offset < total) {
        const response = await this.yandexService.getProfiles(
          yandexParkId,
          limit,
          offset,
          newOnly ? oneHourAgo : twelveHoursAgo,
        );

        total = response.total;
        const drivers = response.driver_profiles || [];

        if (drivers.length === 0) break;

        console.log(
          `[YandexFleetProfileService] Обработка пачки: ${offset + 1} - ${offset + drivers.length} из ${total}...`,
        );

        for (const driver of drivers) {
          try {
            await this.processYandexProfile(
              yandexParkId,
              driver.driver_profile.id,
              driver,
              newOnly,
            );
          } catch (error) {
            console.error(
              `[YandexFleetProfileService] Ошибка обработки водителя ${driver.driver_profile.id}:`,
              error,
            );
          }
        }

        offset += limit;
      }

      console.log(
        `[YandexFleetProfileService] Синхронизация новых профилей ${yandexParkId} завершена.`,
      );
    } catch (error) {
      console.error(
        `[YandexFleetProfileService] Ошибка синхронизации новых ${yandexParkId}:`,
        error,
      );
    }
  }

  async syncProfileStages(yandexParkId: string): Promise<void> {
    console.log(`[YandexFleetProfileService] Запуск синхронизации стадий: ${yandexParkId}`);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const category = getBitrixCategory(yandexParkId);
    const stagesToSkip: string[] = [
      category.Duplicates,
      category.Refusal,
      category.SpamAdvertisingIlliquid,
      category.Pause,
      category.Archive,
      category.Cold,
    ];

    const BATCH_SIZE = 200;
    let offset = 0;
    let updated = 0;

    try {
      while (true) {
        const profiles = await this.yandexFleetProfileRepository.find({
          where: [
            {
              parkId: yandexParkId,
              bitrixStageId: Not(In(stagesToSkip)),
              lastOrderDate: LessThanOrEqual(thirtyDaysAgo),
            },
            {
              parkId: yandexParkId,
              bitrixStageId: Not(In(stagesToSkip)),
              lastOrderDate: IsNull(),
              hiredAt: LessThanOrEqual(thirtyDaysAgo),
            },
            {
              parkId: yandexParkId,
              bitrixStageId: Not(In(stagesToSkip)),
              lastOrderDate: IsNull(),
              hiredAt: IsNull(),
              fleetCreatedAt: LessThanOrEqual(thirtyDaysAgo),
            },
          ],
          order: { yandexProfileId: 'ASC' },
          take: BATCH_SIZE,
          skip: offset,
        });

        if (profiles.length === 0) break;

        for (const profile of profiles) {
          try {
            const lastOrders = await this.yandexFleetOrderRepository.find({
              where: { profileId: profile.yandexProfileId, parkId: yandexParkId },
              order: { bookedAt: 'DESC' },
              take: 30,
            });

            const nextStage = this.yandexFleetOrderService.resolveNextStage(
              lastOrders,
              profile.hiredAt ?? profile.fleetCreatedAt,
            );

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
        `[YandexFleetProfileService] Синхронизация стадий ${yandexParkId} завершена. Обновлено: ${updated}.`,
      );
    } catch (error) {
      console.error(
        `[YandexFleetProfileService] Ошибка синхронизации стадий ${yandexParkId}:`,
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
    const bitrixDispatcherId = YANDEX_TO_BITRIX_PARK[parkId];

    return cleanPayload({
      [BITRIX_FIELDS.DISPATCHER]: bitrixDispatcherId,
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
      CATEGORY_ID: mapCategory(parkId),
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
    createdDate: Date;
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
      createdDate,
      existingContactId,
    } = params;

    const flat = this.extractFlatFields(driverProfile, driverCar, lastOrderDate, firstOrderDate);
    const contactPayload = this.buildContactPayload(driverProfile);
    const dealPayload = this.buildDealPayload(profileId, parkId, driverProfile, driverCar, true);

    let contactId: number;
    if (existingContactId) {
      await this.bitrixService.updateContact(String(existingContactId), contactPayload);
      contactId = existingContactId;
    } else {
      contactId = await this.bitrixService.createContact(contactPayload);
    }

    const dealId = await this.bitrixService.createDeal({
      STAGE_ID: stage,
      TITLE: `${flat.lastName} ${flat.firstName}`,
      CONTACT_ID: contactId,
      ...dealPayload,
    });

    await this.yandexFleetProfileRepository.save({
      yandexProfileId: profileId,
      parkId,
      bitrixStageId: stage,
      bitrixContactId: String(contactId),
      bitrixDealId: String(dealId),
      dataHash: currentHash,
      hiredAt: driverProfile.profile.hire_date ? new Date(driverProfile.profile.hire_date) : null,
      fleetCreatedAt: createdDate,
      ...flat,
    });

    console.log(
      `[YandexFleetProfileService] Профиль ${profileId} в парке ${parkId} создан. Сделка: ${String(dealId)}. Контакт: ${String(contactId)}`,
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
    createdDate: Date;
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
      createdDate,
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
    localState.hiredAt = driverProfile.profile.hire_date
      ? new Date(driverProfile.profile.hire_date)
      : null;
    localState.fleetCreatedAt = createdDate;
    await this.yandexFleetProfileRepository.save(localState);
    console.log(
      `[YandexFleetProfileService] Профиль ${profileId} в парке ${parkId} обновлен. Сделка: ${String(localState.bitrixDealId)}. Контакт: ${String(localState.bitrixContactId)}`,
    );
  }

  private async processYandexProfile(
    parkId: string,
    profileId: string,
    driver: YandexFleetDriverProfileItem,
    newOnly: boolean,
  ): Promise<void> {
    let localState = await this.yandexFleetProfileRepository.findOneBy({
      yandexProfileId: profileId,
    });

    if (newOnly && localState) return;

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

    if ((driverProfile.person.driver_license.country as string) === 'vnm') {
      driverProfile.person.driver_license.country = undefined;
    }

    let existingContactId: number | undefined;
    let needsRelink = false;

    if (!localState) {
      needsRelink = true;
    } else {
      const contact = await this.bitrixService.getContact(localState.bitrixContactId);

      if (!contact) {
        await this.yandexFleetProfileRepository.remove(localState);
        localState = null;
        needsRelink = true;
      } else {
        const deals = await this.bitrixService.getDealsByContact(localState.bitrixContactId);
        const dealExists = deals.some((d) => String(d.ID) === localState!.bitrixDealId);

        if (!dealExists) {
          await this.yandexFleetProfileRepository.remove(localState);
          localState = null;
          needsRelink = true;
        }
      }
    }

    let wasLinked = false;

    if (needsRelink) {
      const result = await this.findAndLinkExistingBitrixProfile(
        parkId,
        profileId,
        driver,
        driverProfile,
        driverCar,
      );

      if (result.kind === 'linked') {
        localState = result.state;
        wasLinked = true;
      } else if (result.kind === 'contact-only') {
        existingContactId = result.contactId;
      }
    }

    const lastOrders = await this.yandexFleetOrderRepository.find({
      where: { profileId, parkId },
      order: { bookedAt: 'DESC' },
      take: 30,
    });

    let stage: string = localState ? localState.bitrixStageId : category.NotProcessed;
    const createdDate = new Date(driver.driver_profile.created_date);
    const hireDate = driverProfile.profile.hire_date
      ? new Date(driverProfile.profile.hire_date)
      : null;
    const nextStage = this.yandexFleetOrderService.resolveNextStage(
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

    if (!firstOrderDate && (!localState || localState.bitrixStageId !== category.Archive)) {
      const oldestLocalOrder = await this.yandexFleetOrderRepository.findOne({
        where: { profileId, parkId },
        order: { bookedAt: 'ASC' },
      });

      if (oldestLocalOrder && (hireDate ?? createdDate) >= oldestLocalOrder.bookedAt) {
        firstOrderDate = oldestLocalOrder.bookedAt;
      } else if (!localState || wasLinked) {
        firstOrderDate = await this.yandexService.getFirstOrderDate(
          parkId,
          profileId,
          hireDate ?? createdDate,
        );
      }
    }

    const currentHash = calculateDriverHash(driverProfile, driverCar, stage);

    if (!localState) {
      await this.createProfile({
        parkId,
        profileId,
        driverProfile,
        driverCar,
        stage,
        currentHash,
        lastOrderDate,
        firstOrderDate,
        createdDate,
        existingContactId,
      });
      return;
    } else if (localState.dataHash !== currentHash) {
      await this.updateProfile({
        parkId,
        profileId,
        driverProfile,
        driverCar,
        stage,
        currentHash,
        localState,
        lastOrderDate,
        createdDate,
        firstOrderDate,
      });
      return;
    } else if (
      localState.lastOrderDate?.getTime() !== lastOrderDate?.getTime() ||
      localState.firstOrderDate?.getTime() !== firstOrderDate?.getTime()
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
      const hiredAt = hireDateRaw ? String(hireDateRaw) : null;

      const state = await this.yandexFleetProfileRepository.save({
        yandexProfileId: profileId,
        parkId,
        bitrixStageId: stage,
        bitrixContactId: String(matchedDeal.CONTACT_ID),
        bitrixDealId: String(matchedDeal.ID),
        dataHash: calculateDriverHash(driverProfile, driverCar, stage),
        hiredAt,
        fleetCreatedAt: matchedDeal.DATE_CREATE ? new Date(matchedDeal.DATE_CREATE) : new Date(),
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
