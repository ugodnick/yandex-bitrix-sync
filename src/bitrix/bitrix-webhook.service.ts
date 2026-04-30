import { YandexFleetService } from '../yandex-fleet/yandex-fleet.service';
import { YandexFleetWorkRuleService } from '../yandex-fleet/yandex-fleet-work-rule/yandex-fleet-work-rules.service';

import {
  buildError,
  calculateDriverHash,
  formatDateForYandex,
  formatPhoneNumber,
  getBitrixCategory,
  mapBitrixAmenitiesToYandex,
  mapBitrixColorToYandex,
  mapBitrixCountryToYandex,
  mapBitrixEmploymentTypeToYandex,
  mapBitrixFuelTypeToYandex,
  mapBitrixOwnershipTypeToYandex,
  mapBitrixTransmissionToYandex,
  normalizeBitrixValue,
  ufValueToBool,
} from './bitrix.utils';
import {
  YandexFleetCreateContractorProfile,
  YandexFleetCreateWalkCourier,
  YandexFleetCreateWalkSECourier,
  YandexFleetDriverProfile,
  YandexFleetUpdateCarRequest,
  YandexFleetVehicleData,
} from '../yandex-fleet/yandex-fleet.type';
import {
  BITRIX_DICT,
  BITRIX_FIELDS,
  BITRIX_TO_YANDEX_PARK,
  BitrixContactFields,
  BitrixCrmWebhookBody,
  BitrixDealCategory,
  BitrixDealFields,
} from './bitrix.type';
import { BitrixService } from './bitrix.service';
import { Repository } from 'typeorm';
import { YandexFleetProfileEntity } from '../yandex-fleet/yandex-fleet-profile/yandex-fleet-profile.entity';

export class BitrixWebhookService {
  constructor(
    private yandexFleetProfileRepository: Repository<YandexFleetProfileEntity>,
    private yandexFleetService: YandexFleetService,
    private yandexFleetWorkRuleService: YandexFleetWorkRuleService,
    private bitrixService: BitrixService,
  ) {}

  async handleInboundWebhook(webhookBody: BitrixCrmWebhookBody): Promise<void> {
    const { event, data } = webhookBody;
    const entityId = data?.FIELDS?.ID;
    console.log('event', webhookBody.event);
    if (!entityId) return;

    try {
      if (event === 'ONCRMDEALUPDATE' || event === 'ONCRMDEALADD') {
        await this.syncDealToYandexTest(entityId);
      }
    } catch (error) {
      throw buildError(error, BitrixWebhookService.name);
    }
  }

  private async syncDealToYandex(dealId: string): Promise<void> {
    const deal = await this.bitrixService.getDeal(dealId);

    const category = deal.CATEGORY_ID;

    if (!category || category !== BitrixDealCategory.YANDEX_DELIVERY) return;

    const contactId = deal.CONTACT_ID;
    if (!contactId) return;

    const bitrixDispatcherField = deal[BITRIX_FIELDS.DISPATCHER];
    const dispatcherId = bitrixDispatcherField
      ? Array.isArray(bitrixDispatcherField) && bitrixDispatcherField.length > 0
        ? String(bitrixDispatcherField[0])
        : String(bitrixDispatcherField)
      : '';

    const targetYandexParkId = BITRIX_TO_YANDEX_PARK[dispatcherId];
    if (!targetYandexParkId) return;

    const contactData = await this.bitrixService.getContact(String(contactId));

    if (!contactData) return;

    const phone = formatPhoneNumber(contactData.PHONE?.[0]?.VALUE);
    if (!phone) return;

    const yandexProfileId: string | null = (deal[BITRIX_FIELDS.PROFILE_ID] as string) || null;

    if (!yandexProfileId) {
    } else {
      const localProfile = await this.yandexFleetProfileRepository.findOne({
        where: { yandexProfileId },
      });

      const category = getBitrixCategory(targetYandexParkId);
      const stagesToSkip: readonly string[] = [category.Archive, category.Refusal];

      if (localProfile && stagesToSkip.includes(localProfile.bitrixStageId)) return;

      if (localProfile && localProfile.dataHash !== calculateDriverHash(deal, contactData)) {
        // const currentProfile = await this.yandexFleetService.getProfile(
        //   targetYandexParkId,
        //   yandexProfileId,
        // );
        //
        // const updatedProfile = this.buildYandexProfileUpdatePayload(
        //   currentProfile,
        //   deal,
        //   contactData,
        // );
        // if (deal.STAGE_ID === localProfile.bitrixStageId) {
        //   if (currentProfile.car_id) {
        //     const car = await this.yandexFleetService.getCar(
        //       targetYandexParkId,
        //       currentProfile.car_id,
        //     );
        //     const updatedCar = this.buildYandexCarUpdatePayload(car, deal);
        //
        //     if (updatedCar) {
        //       await this.yandexFleetService.updateCar(
        //         targetYandexParkId,
        //         currentProfile.car_id,
        //         updatedCar,
        //       );
        //     }
        //   }
        //
        //   await this.yandexFleetService.updateProfile(
        //     targetYandexParkId,
        //     yandexProfileId,
        //     updatedProfile,
        //   );
        // }

        await this.saveLocalState(
          yandexProfileId,
          targetYandexParkId,
          contactId,
          dealId,
          deal,
          contactData,
        );
      }
    }
  }

  private async syncDealToYandexTest(dealId: string): Promise<void> {
    const deal = await this.bitrixService.getDeal(dealId);
    console.log(`[Webhook] dealId=${dealId}, category=${deal.CATEGORY_ID}, stage=${deal.STAGE_ID}`);

    const category = deal.CATEGORY_ID;
    if (!category || category !== BitrixDealCategory.YANDEX_DELIVERY) {
      console.log(`[Webhook] Выход: категория не YANDEX_DELIVERY (${category})`);
      return;
    }

    const contactId = deal.CONTACT_ID;
    if (!contactId) {
      console.log(`[Webhook] Выход: нет CONTACT_ID`);
      return;
    }

    const bitrixDispatcherField = deal[BITRIX_FIELDS.DISPATCHER];
    const dispatcherId = bitrixDispatcherField
      ? Array.isArray(bitrixDispatcherField) && bitrixDispatcherField.length > 0
        ? String(bitrixDispatcherField[0])
        : String(bitrixDispatcherField)
      : '';

    const targetYandexParkId = BITRIX_TO_YANDEX_PARK[dispatcherId];
    if (!targetYandexParkId) {
      console.log(`[Webhook] Выход: нет парка для dispatcher=${dispatcherId}`);
      return;
    }

    const contactData = await this.bitrixService.getContact(String(contactId));
    if (!contactData) {
      console.log(`[Webhook] Выход: контакт ${contactId} не найден`);
      return;
    }

    const phone = formatPhoneNumber(contactData.PHONE?.[0]?.VALUE);
    if (!phone) {
      console.log(`[Webhook] Выход: нет телефона у контакта ${contactId}`);
      return;
    }

    const yandexProfileId: string | null = (deal[BITRIX_FIELDS.PROFILE_ID] as string) || null;
    console.log(`[Webhook] yandexProfileId=${yandexProfileId}`);

    if (!yandexProfileId) {
      console.log(`[Webhook] Выход: пустой yandexProfileId`);
      return;
    }

    const localProfile = await this.yandexFleetProfileRepository.findOne({
      where: { yandexProfileId },
    });
    console.log(`[Webhook] localProfile=${!!localProfile}, currentHash=${localProfile?.dataHash}`);

    const cat = getBitrixCategory(targetYandexParkId);
    const stagesToSkip: readonly string[] = [cat.Archive, cat.Refusal];

    if (localProfile && stagesToSkip.includes(localProfile.bitrixStageId)) {
      console.log(`[Webhook] Выход: стадия в skip-листе (${localProfile.bitrixStageId})`);
      return;
    }

    const newHash = localProfile ? calculateDriverHash(deal, contactData) : '';
    console.log(`[Webhook] newHash=${newHash}, equal=${localProfile?.dataHash === newHash}`);

    if (localProfile && localProfile.dataHash !== newHash) {
      await this.saveLocalState(
        yandexProfileId,
        targetYandexParkId,
        contactId,
        dealId,
        deal,
        contactData,
      );
      console.log(`[Webhook] Хеш сохранён для ${yandexProfileId}`);
    } else {
      console.log(`[Webhook] saveLocalState не вызван`);
    }
  }

  private buildYandexWalkCourierCreationPayload(
    data: YandexFleetCreateContractorProfile,
  ): YandexFleetCreateWalkCourier {
    return {
      full_name: data.contractor.person.full_name,
      phone: data.contractor.person.contact_info.phone,
      birth_date: data.contractor.person.driver_license.birth_date,
      work_rule_id: data.contractor.account?.work_rule_id,
    };
  }

  private buildYandexWalkCourierSECreationPayload(
    data: YandexFleetCreateContractorProfile,
  ): YandexFleetCreateWalkSECourier {
    return {
      profile: this.buildYandexWalkCourierCreationPayload(data),
      selfemployed: {
        address: data.contractor.person.contact_info.address,
        phone: data.contractor.person.contact_info.phone,
      },
    };
  }

  private buildYandexProfileUpdatePayload(
    currentProfile: YandexFleetDriverProfile,
    deal: BitrixDealFields,
    contact: BitrixContactFields,
  ): YandexFleetDriverProfile {
    const n = normalizeBitrixValue;

    const phone = formatPhoneNumber(contact.PHONE?.[0]?.VALUE);
    const firstName = contact.NAME;
    const lastName = contact.LAST_NAME;
    const middleName = contact.SECOND_NAME;

    const personObj: YandexFleetDriverProfile['person'] = {
      ...currentProfile.person,
      full_name: {
        first_name: firstName || currentProfile.person.full_name.first_name,
        last_name: lastName || currentProfile.person.full_name.last_name,
        middle_name: middleName || currentProfile.person.full_name.middle_name,
      },
      contact_info: {
        ...currentProfile.person.contact_info,
        phone: phone || currentProfile.person.contact_info.phone,
        ...(n(deal[BITRIX_FIELDS.ADDRESS_DISP]) && {
          address: String(deal[BITRIX_FIELDS.ADDRESS_DISP]).split('|')[0].trim(),
        }),
      },
      driver_license: {
        number: n(deal[BITRIX_FIELDS.DL_SERIES_NUMBER])
          ? String(deal[BITRIX_FIELDS.DL_SERIES_NUMBER])
          : currentProfile.person.driver_license.number,
        issue_date: n(deal[BITRIX_FIELDS.DL_ISSUE_DATE])
          ? formatDateForYandex(String(deal[BITRIX_FIELDS.DL_ISSUE_DATE])) ||
            currentProfile.person.driver_license.issue_date
          : currentProfile.person.driver_license.issue_date,
        expiry_date: n(deal[BITRIX_FIELDS.DL_EXPIRY_DATE])
          ? formatDateForYandex(String(deal[BITRIX_FIELDS.DL_EXPIRY_DATE])) ||
            currentProfile.person.driver_license.expiry_date
          : currentProfile.person.driver_license.expiry_date,
        country: n(deal[BITRIX_FIELDS.DL_COUNTRY_ISSUED])
          ? mapBitrixCountryToYandex(deal[BITRIX_FIELDS.DL_COUNTRY_ISSUED]) ||
            currentProfile.person.driver_license.country
          : currentProfile.person.driver_license.country,
        birth_date: deal[BITRIX_FIELDS.BIRTH_DATE]
          ? formatDateForYandex(String(deal[BITRIX_FIELDS.BIRTH_DATE])) ||
            currentProfile.person.driver_license.birth_date
          : currentProfile.person.driver_license.birth_date,
      },
      employment_type: mapBitrixEmploymentTypeToYandex(deal[BITRIX_FIELDS.EMPLOYMENT_TYPE]),
    };

    return {
      account: {
        ...currentProfile.account,
        ...(n(deal[BITRIX_FIELDS.BALANCE_LIMIT]) && {
          balance_limit: String(deal[BITRIX_FIELDS.BALANCE_LIMIT]),
        }),
      },
      person: personObj,
      profile: {
        ...currentProfile.profile,
        ...(n(deal[BITRIX_FIELDS.HIRE_DATE]) && {
          hire_date:
            formatDateForYandex(String(deal[BITRIX_FIELDS.HIRE_DATE])) ||
            currentProfile.profile.hire_date,
        }),
      },
      car_id: currentProfile.car_id,
      order_provider: {
        platform:
          n(deal[BITRIX_FIELDS.ORDER_PROVIDER_PLATFORM]) !== undefined
            ? ufValueToBool(deal[BITRIX_FIELDS.ORDER_PROVIDER_PLATFORM])
            : currentProfile.order_provider.platform,
        partner:
          n(deal[BITRIX_FIELDS.ORDER_PROVIDER_PARTNER]) !== undefined
            ? ufValueToBool(deal[BITRIX_FIELDS.ORDER_PROVIDER_PARTNER])
            : currentProfile.order_provider.partner,
      },
    };
  }

  private extractVehicleSpecifications(
    deal: BitrixDealFields,
    current?: YandexFleetVehicleData['vehicle_specifications'],
  ): YandexFleetUpdateCarRequest['vehicle_specifications'] | null {
    const n = normalizeBitrixValue;

    const brand = n(deal[BITRIX_FIELDS.BRAND]) ? String(deal[BITRIX_FIELDS.BRAND]) : current?.brand;
    const model = n(deal[BITRIX_FIELDS.MODEL]) ? String(deal[BITRIX_FIELDS.MODEL]) : current?.model;
    const year = n(deal[BITRIX_FIELDS.YEAR])
      ? Number(deal[BITRIX_FIELDS.YEAR]) || current?.year
      : current?.year;
    const color = n(deal[BITRIX_FIELDS.COLOR])
      ? mapBitrixColorToYandex(deal[BITRIX_FIELDS.COLOR]) || current?.color
      : current?.color;
    const transmission = n(deal[BITRIX_FIELDS.TRANSMISSION])
      ? mapBitrixTransmissionToYandex(deal[BITRIX_FIELDS.TRANSMISSION]) || current?.transmission
      : current?.transmission;
    const vin = n(deal[BITRIX_FIELDS.VIN]) ? String(deal[BITRIX_FIELDS.VIN]) : current?.vin;

    if (!brand || !model || !year || !color || !transmission || !vin) return null;

    return {
      ...current,
      brand,
      model,
      year,
      color,
      transmission,
      vin,
    };
  }

  private extractVehicleLicenses(
    deal: BitrixDealFields,
    current?: YandexFleetVehicleData['vehicle_licenses'],
  ): YandexFleetUpdateCarRequest['vehicle_licenses'] | null {
    const n = normalizeBitrixValue;

    const licensePlate = n(deal[BITRIX_FIELDS.LICENSE_PLATE])
      ? String(deal[BITRIX_FIELDS.LICENSE_PLATE])
      : current?.licence_plate_number;

    if (!licensePlate) return null;

    return {
      ...current,
      licence_plate_number: licensePlate,
      ...(n(deal[BITRIX_FIELDS.STS])
        ? { registration_certificate: String(deal[BITRIX_FIELDS.STS]) }
        : current?.registration_certificate && {
            registration_certificate: current.registration_certificate,
          }),
    };
  }

  private extractParkProfile(
    deal: BitrixDealFields,
    current?: YandexFleetVehicleData['park_profile'],
  ): YandexFleetUpdateCarRequest['park_profile'] | null {
    const n = normalizeBitrixValue;

    const fuelType = n(deal[BITRIX_FIELDS.FUEL_TYPE])
      ? mapBitrixFuelTypeToYandex(deal[BITRIX_FIELDS.FUEL_TYPE]) || current?.fuel_type
      : current?.fuel_type;

    const licensePlate = n(deal[BITRIX_FIELDS.LICENSE_PLATE])
      ? String(deal[BITRIX_FIELDS.LICENSE_PLATE])
      : undefined;
    const callsign = current?.callsign ?? licensePlate;

    if (!fuelType || !callsign) return null;

    const equipmentRaw = deal[BITRIX_FIELDS.EQUIPMENT];
    const equipmentIds =
      Array.isArray(equipmentRaw) && equipmentRaw.length > 0
        ? (equipmentRaw as Array<string | number>).map(Number).filter((v) => !Number.isNaN(v))
        : [];

    const isParkProperty = deal[BITRIX_FIELDS.CAR_OWNER] === BITRIX_DICT.CAR_OWNER.OWN;

    const parkProfile: YandexFleetUpdateCarRequest['park_profile'] = {
      ...current,
      callsign,
      status: current?.status ?? 'working',
      fuel_type: fuelType,
      is_park_property: isParkProperty,
      leasing_conditions:
        current?.leasing_conditions as YandexFleetUpdateCarRequest['park_profile']['leasing_conditions'],
      ...(equipmentIds.length > 0 && {
        amenities: mapBitrixAmenitiesToYandex(equipmentIds) || current?.amenities,
      }),
    };

    if (isParkProperty) {
      parkProfile.ownership_type =
        mapBitrixOwnershipTypeToYandex(deal[BITRIX_FIELDS.CAR_OWNER]) || current?.ownership_type;
    }

    return parkProfile;
  }

  private extractCargo(
    deal: BitrixDealFields,
    current?: YandexFleetVehicleData['cargo'],
  ): YandexFleetUpdateCarRequest['cargo'] | undefined {
    const n = normalizeBitrixValue;

    const lengthRaw = n(deal[BITRIX_FIELDS.LENGTH]);
    const widthRaw = n(deal[BITRIX_FIELDS.WIDTH]);
    const heightRaw = n(deal[BITRIX_FIELDS.HEIGHT]);
    const capacityRaw = n(deal[BITRIX_FIELDS.LOAD_CAPACITY]);

    const hasCargoFromDeal =
      lengthRaw !== undefined ||
      widthRaw !== undefined ||
      heightRaw !== undefined ||
      capacityRaw !== undefined;

    if (!hasCargoFromDeal && !current) return undefined;

    const currentDims = current?.cargo_hold_dimensions;

    return {
      cargo_loaders: current?.cargo_loaders ?? 0,
      carrying_capacity:
        capacityRaw !== undefined
          ? Number(capacityRaw) || current?.carrying_capacity || 0
          : (current?.carrying_capacity ?? 0),
      cargo_hold_dimensions: {
        length:
          lengthRaw !== undefined
            ? Number(lengthRaw) || currentDims?.length || 0
            : (currentDims?.length ?? 0),
        width:
          widthRaw !== undefined
            ? Number(widthRaw) || currentDims?.width || 0
            : (currentDims?.width ?? 0),
        height:
          heightRaw !== undefined
            ? Number(heightRaw) || currentDims?.height || 0
            : (currentDims?.height ?? 0),
      },
    };
  }

  private buildYandexCarUpdatePayload(
    currentCar: YandexFleetVehicleData,
    deal: BitrixDealFields,
  ): YandexFleetUpdateCarRequest | null {
    const vehicleSpecifications = this.extractVehicleSpecifications(
      deal,
      currentCar.vehicle_specifications,
    );

    const vehicleLicenses = this.extractVehicleLicenses(deal, currentCar.vehicle_licenses);
    const parkProfile = this.extractParkProfile(deal, currentCar.park_profile);

    if (!vehicleSpecifications || !vehicleLicenses || !parkProfile) return null;

    const payload: YandexFleetUpdateCarRequest = {
      vehicle_specifications: vehicleSpecifications,
      vehicle_licenses: vehicleLicenses,
      park_profile: parkProfile,
    };

    if (currentCar.child_safety) {
      payload.child_safety = currentCar.child_safety;
    }

    const cargo = this.extractCargo(deal, currentCar.cargo);
    if (cargo) payload.cargo = cargo;

    return payload;
  }

  // private buildYandexCarCreatePayload(deal: BitrixDealFields): YandexFleetUpdateCarRequest | null {
  //   const vehicleSpecifications = this.extractVehicleSpecifications(deal);
  //   const vehicleLicenses = this.extractVehicleLicenses(deal);
  //   const parkProfile = this.extractParkProfile(deal);
  //
  //   if (!vehicleSpecifications || !vehicleLicenses || !parkProfile) return null;
  //
  //   const payload: YandexFleetUpdateCarRequest = {
  //     vehicle_specifications: vehicleSpecifications,
  //     vehicle_licenses: vehicleLicenses,
  //     park_profile: parkProfile,
  //   };
  //
  //   const cargo = this.extractCargo(deal);
  //   if (cargo) payload.cargo = cargo;
  //
  //   return payload;
  // }

  private async saveLocalState(
    yandexProfileId: string,
    parkId: string,
    bitrixContactId: string | number,
    bitrixDealId: string | number,
    deal: BitrixDealFields,
    contact: BitrixContactFields,
  ): Promise<void> {
    const dataHash = calculateDriverHash(deal, contact);

    const stage = deal.STAGE_ID;

    const hireDate = deal[BITRIX_FIELDS.HIRE_DATE]
      ? new Date(String(deal[BITRIX_FIELDS.HIRE_DATE]))
      : null;
    const fleetCreatedAt = deal.DATE_CREATE ? new Date(deal.DATE_CREATE) : new Date();
    const phone = formatPhoneNumber(contact.PHONE?.[0]?.VALUE);

    await this.yandexFleetProfileRepository.save({
      yandexProfileId,
      parkId,
      bitrixContactId: String(bitrixContactId),
      bitrixDealId: String(bitrixDealId),
      dataHash,
      bitrixStageId: stage,
      hireDate,
      fleetCreatedAt,
      firstName: contact.NAME,
      lastName: contact.LAST_NAME,
      middleName: contact.SECOND_NAME,
      phone: phone,
    });
  }
}
