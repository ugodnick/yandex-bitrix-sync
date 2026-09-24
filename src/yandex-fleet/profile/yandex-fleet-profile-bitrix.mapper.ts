import { Repository } from 'typeorm';
import { BitrixService } from '../../bitrix/bitrix.service';
import {
  BITRIX_DICT,
  BITRIX_FIELDS,
  BitrixContactFields,
  BitrixDealFields,
} from '../../bitrix/bitrix.type';
import { BitrixSheetExportService } from '../../bitrix/bitrix-sheet-export.service';
import { getBitrixCategory } from '../../bitrix/bitrix.utils';
import { YandexFleetParkEntity } from '../park/yandex-fleet-park.entity';
import {
  YandexFleetDriverProfile,
  YandexFleetDriverProfileItem,
} from './yandex-fleet-profile.type';
import { YandexFleetVehicleData } from '../vehicle/yandex-fleet-vehicle.type';
import { VehicleAmenities } from '../vehicle/yandex-fleet-vehicle.type';
import { YandexFleetProfileEntity } from './yandex-fleet-profile.entity';
import { applyBalanceToProfile } from './yandex-fleet-profile-balance.utils';
import { calculateDriverHash } from './yandex-fleet-profile.utils';
import { formatDateInTz } from '../common/yandex-fleet-format.utils';
import { mapAggregator, mapCategory } from '../park/yandex-fleet-park-bitrix.utils';
import {
  mapCarOwnership,
  mapFuelType,
  mapTransmission,
  mapVehicleType,
  mapYandexColorToBitrix,
} from '../vehicle/yandex-fleet-vehicle-bitrix.utils';
import {
  mapContractorType,
  mapDlCountryToBitrix,
  mapEmploymentType,
  mapEmploymentTypeName,
  mapVacancy,
} from './yandex-fleet-profile-bitrix.utils';
import { cleanPayload, formatDateForBitrix } from '../common/yandex-fleet-format.utils';
import { mapVehicleTypeName } from '../vehicle/yandex-fleet-vehicle-bitrix.utils';

export class YandexFleetProfileBitrixMapper {
  constructor(
    private readonly bitrixService: BitrixService,
    private readonly bitrixSheetExportService: BitrixSheetExportService,
    private readonly profileRepository: Repository<YandexFleetProfileEntity>,
  ) {}

  buildContactPayload(driverProfile: YandexFleetDriverProfile) {
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

  buildDealPayload(
    profileId: string,
    park: YandexFleetParkEntity,
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
      [BITRIX_FIELDS.DISPATCHER]: park.bitrixDispatcherId,
      [BITRIX_FIELDS.BIRTH_DATE]: formatDateForBitrix(dl.birth_date),
      [BITRIX_FIELDS.FIRST_NAME_DISP]: firstName,
      [BITRIX_FIELDS.LAST_NAME_DISP]: lastName,
      [BITRIX_FIELDS.PATRONYMIC_DISP]: middleName,
      [BITRIX_FIELDS.PHONE_DISP]: phone,
      [BITRIX_FIELDS.PHONE_SYSTEM]: phone,
      [BITRIX_FIELDS.VACANCY]: mapVacancy(park, driverCar),
      [BITRIX_FIELDS.CONTRACTOR_TYPE]: mapContractorType(park, driverCar),
      [BITRIX_FIELDS.AGGREGATOR]: mapAggregator(park.type),
      [BITRIX_FIELDS.HIRE_DATE]: formatDateForBitrix(profile.hire_date),
      CATEGORY_ID: mapCategory(park.type),
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
        'https://fleet.yandex.ru/contractors/' + profileId + '/details?park_id=' + park.id,
    });
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
    existingContactId?: number;
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
      existingContactId,
      accounts,
    } = params;

    const flat = this.extractFlatFields(driverProfile, driverCar, lastOrderDate, firstOrderDate);
    const contactPayload = this.buildContactPayload(driverProfile);
    const dealPayload = this.buildDealPayload(profileId, park, driverProfile, driverCar, true);

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

    const profileEntity: Partial<YandexFleetProfileEntity> = {
      yandexProfileId: profileId,
      parkId: park.id,
      bitrixStageId: stage,
      bitrixContactId: String(contactId),
      bitrixDealId: String(dealId),
      dataHash: currentHash,
      hiredAt: driverProfile.profile.hire_date ? new Date(driverProfile.profile.hire_date) : null,
      fleetCreatedAt: createdDate,
      ...flat,
    };
    applyBalanceToProfile(profileEntity as YandexFleetProfileEntity, accounts);
    await this.profileRepository.save(profileEntity);

    await this.bitrixSheetExportService.appendNewDeal(
      this.buildNewDealPayload({
        profileId,
        phone: flat.phone ? flat.phone.replace(/^\+/, '') : '',
        fullName: flat.lastName + ' ' + flat.firstName + ' ' + (flat.middleName || ''),
        park: park.name,
        employmentType: flat.employmentType,
        createdDate: formatDateInTz(createdDate, true, park.timezone),
      }),
    );

    console.log(
      `[YandexFleetProfileService] Профиль ${profileId} в парке ${park.name} создан. Сделка: ${String(dealId)}. Контакт: ${String(contactId)}`,
    );
  }

  buildNewDealPayload(params: {
    profileId: string;
    phone: string;
    fullName: string;
    park: string;
    employmentType: string;
    createdDate: string;
  }): string[] {
    return [
      params.phone,
      params.fullName,
      params.park,
      params.employmentType,
      params.createdDate,
      params.profileId,
    ];
  }

  async updateProfile(params: {
    park: YandexFleetParkEntity;
    profileId: string;
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
      profileId,
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

    const contactPayload = this.buildContactPayload(driverProfile);
    const dealPayload = this.buildDealPayload(profileId, park, driverProfile, driverCar, false);
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
    applyBalanceToProfile(localState, accounts);
    await this.profileRepository.save(localState);
    console.log(
      `[YandexFleetProfileService] Профиль ${profileId} в парке ${park.name} обновлен. Сделка: ${String(localState.bitrixDealId)}. Контакт: ${String(localState.bitrixContactId)}`,
    );
  }

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

  async findAndLinkExistingBitrixProfile(
    park: YandexFleetParkEntity,
    driver: YandexFleetDriverProfileItem,
    driverProfile: YandexFleetDriverProfile,
    driverCar: YandexFleetVehicleData | undefined,
  ): Promise<
    | { kind: 'linked'; state: YandexFleetProfileEntity }
    | { kind: 'contact-only'; contactId: number }
    | { kind: 'none' }
  > {
    const category = getBitrixCategory(park.type);

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
    const expectedCategoryId = mapCategory(park.type);
    const candidateDeals = deals.filter(
      (d) =>
        String(d.CATEGORY_ID) === String(expectedCategoryId) && d.STAGE_ID !== category.Duplicates,
    );

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

      if (dealProfileId === driver.driver_profile.id) {
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

        if (dispatcherId !== park.bitrixDispatcherId) continue;
        if (dealProfileId && dealProfileId !== driver.driver_profile.id) continue;

        const alreadyLinked = await this.profileRepository.findOneBy({
          bitrixDealId: String(deal.ID),
        });
        if (alreadyLinked && alreadyLinked.yandexProfileId !== driver.driver_profile.id) continue;

        matchedDeal = deal;
        break;
      }
    }

    let predecessor: YandexFleetProfileEntity | null = null;
    if (!matchedDeal) {
      const newCreatedAt = new Date(driver.driver_profile.created_date).getTime();
      const reclaimCandidates: Array<{
        deal: BitrixDealFields;
        linked: YandexFleetProfileEntity;
        predecessorCreatedAt: number;
      }> = [];

      for (const deal of candidateDeals) {
        const dispatcherId = getDispatcherId(deal);
        const dealProfileId = deal[BITRIX_FIELDS.PROFILE_ID]
          ? String(deal[BITRIX_FIELDS.PROFILE_ID])
          : undefined;

        if (dispatcherId !== park.bitrixDispatcherId) continue;
        if (!dealProfileId || dealProfileId === driver.driver_profile.id) continue;

        const linked =
          (await this.profileRepository.findOneBy({ bitrixDealId: String(deal.ID) })) ??
          (await this.profileRepository.findOneBy({
            yandexProfileId: dealProfileId,
            parkId: park.id,
          }));

        if (!linked || linked.yandexProfileId === driver.driver_profile.id) continue;
        // Already handed off to a different successor
        if (
          linked.supersededByProfileId &&
          linked.supersededByProfileId !== driver.driver_profile.id
        ) {
          continue;
        }

        const predecessorCreatedAt =
          linked.fleetCreatedAt?.getTime() ??
          (deal.DATE_CREATE ? new Date(deal.DATE_CREATE).getTime() : 0);

        // Keep history on the earlier profile's deal; only a later profile may take it over
        if (!(newCreatedAt > predecessorCreatedAt)) continue;

        reclaimCandidates.push({ deal, linked, predecessorCreatedAt });
      }

      if (reclaimCandidates.length > 0) {
        // Several deals for this phone+dispatcher → prefer the earliest one
        reclaimCandidates.sort((a, b) => a.predecessorCreatedAt - b.predecessorCreatedAt);
        matchedDeal = reclaimCandidates[0].deal;
        predecessor = reclaimCandidates[0].linked;
      }
    }

    if (!matchedDeal) {
      for (const deal of candidateDeals) {
        if (deal[BITRIX_FIELDS.DISPATCHER] || deal[BITRIX_FIELDS.PROFILE_ID]) continue;

        const alreadyLinked = await this.profileRepository.findOneBy({
          bitrixDealId: String(deal.ID),
        });
        if (alreadyLinked && alreadyLinked.yandexProfileId !== driver.driver_profile.id) continue;

        matchedDeal = deal;
        break;
      }
    }

    if (!matchedDeal) {
      predecessor = await this.findLocalEmploymentPredecessor(
        park,
        phones,
        driver.driver_profile.id,
        new Date(driver.driver_profile.created_date).getTime(),
      );
      if (predecessor?.bitrixDealId) {
        matchedDeal = candidateDeals.find((d) => String(d.ID) === predecessor!.bitrixDealId);
        if (!matchedDeal) {
          matchedDeal = {
            ID: predecessor.bitrixDealId,
            CONTACT_ID: Number(predecessor.bitrixContactId),
            STAGE_ID: predecessor.bitrixStageId,
            [BITRIX_FIELDS.HIRE_DATE]: predecessor.hiredAt
              ? predecessor.hiredAt.toISOString().slice(0, 10)
              : undefined,
            DATE_CREATE: predecessor.fleetCreatedAt?.toISOString(),
          } as unknown as BitrixDealFields;
        }
      } else {
        predecessor = null;
      }
    }

    if (matchedDeal) {
      const stage =
        matchedDeal.STAGE_ID === category.Archive &&
        predecessor &&
        predecessor.yandexProfileId !== driver.driver_profile.id
          ? category.NotProcessed
          : matchedDeal.STAGE_ID;
      const hireDateRaw = matchedDeal[BITRIX_FIELDS.HIRE_DATE];
      const hiredAt = hireDateRaw ? new Date(String(hireDateRaw)) : (predecessor?.hiredAt ?? null);

      const fleetCreatedAt = predecessor
        ? (predecessor.fleetCreatedAt ??
          (matchedDeal.DATE_CREATE ? new Date(matchedDeal.DATE_CREATE) : new Date()))
        : matchedDeal.DATE_CREATE
          ? new Date(matchedDeal.DATE_CREATE)
          : new Date();

      const state = await this.profileRepository.save({
        yandexProfileId: driver.driver_profile.id,
        parkId: park.id,
        bitrixStageId: stage,
        bitrixContactId: String(matchedDeal.CONTACT_ID ?? contact.ID),
        bitrixDealId: String(matchedDeal.ID),
        dataHash: calculateDriverHash(driverProfile, driverCar, stage),
        hiredAt,
        fleetCreatedAt,
        firstOrderDate: predecessor?.firstOrderDate ?? null,
        lastOrderDate: predecessor?.lastOrderDate ?? null,
        firstName: driverProfile.person.full_name.first_name || 'Неизвестно',
        lastName: driverProfile.person.full_name.last_name || 'Неизвестно',
        middleName: driverProfile.person.full_name.middle_name,
        phone: driverProfile.person.contact_info.phone || null,
        employmentType: mapEmploymentTypeName(driverProfile.person.employment_type),
        workRuleId: driverProfile.account.work_rule_id,
        vehicleType: mapVehicleTypeName(driverCar),
        supersededByProfileId: null,
      });

      if (predecessor && predecessor.yandexProfileId !== state.yandexProfileId) {
        await this.markPredecessorSuperseded(predecessor, state.yandexProfileId, park);
        console.log(
          `[YandexFleetProfileService] Профиль ${state.yandexProfileId} перенял сделку ${state.bitrixDealId} у более раннего ${predecessor.yandexProfileId}`,
        );
      }

      return { kind: 'linked', state };
    }

    return { kind: 'contact-only', contactId: Number(contact.ID) };
  }

  private async findLocalEmploymentPredecessor(
    park: YandexFleetParkEntity,
    phones: string[],
    newProfileId: string,
    newCreatedAt: number,
  ): Promise<YandexFleetProfileEntity | null> {
    const normalizedPhones = new Set(phones.map((p) => p.replace(/\D/g, '')).filter(Boolean));
    if (normalizedPhones.size === 0) return null;

    const candidates = await this.profileRepository
      .createQueryBuilder('p')
      .where('p.park_id = :parkId', { parkId: park.id })
      .andWhere('p.phone IS NOT NULL')
      .andWhere("p.bitrix_deal_id IS NOT NULL AND p.bitrix_deal_id != '0'")
      .getMany();

    const matches = candidates.filter((p) => {
      if (p.yandexProfileId === newProfileId) return false;
      if (p.supersededByProfileId && p.supersededByProfileId !== newProfileId) return false;
      const phoneDigits = (p.phone || '').replace(/\D/g, '');
      if (!phoneDigits || !normalizedPhones.has(phoneDigits)) return false;

      const predecessorCreatedAt = p.fleetCreatedAt?.getTime() ?? 0;
      return newCreatedAt > predecessorCreatedAt;
    });

    if (matches.length === 0) return null;

    // Prefer the earliest local profile (keep the original deal/history)
    matches.sort((a, b) => (a.fleetCreatedAt?.getTime() ?? 0) - (b.fleetCreatedAt?.getTime() ?? 0));

    return matches[0];
  }

  private async markPredecessorSuperseded(
    predecessor: YandexFleetProfileEntity,
    successorProfileId: string,
    park: YandexFleetParkEntity,
  ): Promise<void> {
    predecessor.supersededByProfileId = successorProfileId;
    predecessor.bitrixStageId = getBitrixCategory(park.type).Archive;
    predecessor.dataHash = '';
    await this.profileRepository.save(predecessor);
  }

  async pickBestContact(
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
