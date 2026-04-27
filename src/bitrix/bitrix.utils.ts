import {
  BITRIX_CATEGORY_STAGE,
  BITRIX_DICT,
  BITRIX_FIELDS,
  BitrixContactFields,
  BitrixDealCategory,
  BitrixDealFields,
  YANDEX_DELIVERY_PARKS,
  YANDEX_PARKS_NAMES,
  YANDEX_TAXI_PARKS,
} from './bitrix.type';
import crypto from 'crypto';
import {
  CountryCode,
  EmploymentType,
  FuelType,
  OwnerShipType,
  TaxSystemRus,
  TransmissionType,
  VehicleAmenities,
  VehicleColor,
  YandexDriverProfessionType,
  YandexFleetEmployment,
} from '../yandex-fleet/yandex-fleet.type';
import axios from 'axios';

const BITRIX_COLOR_TO_YANDEX: Record<number, VehicleColor> = {
  [BITRIX_DICT.COLOR.WHITE]: VehicleColor.White,
  [BITRIX_DICT.COLOR.YELLOW]: VehicleColor.Yellow,
  [BITRIX_DICT.COLOR.BLACK]: VehicleColor.Black,
  [BITRIX_DICT.COLOR.GRAY]: VehicleColor.Gray,
  [BITRIX_DICT.COLOR.RED]: VehicleColor.Red,
  [BITRIX_DICT.COLOR.BLUE]: VehicleColor.Blue,
  [BITRIX_DICT.COLOR.LIGHT_BLUE]: VehicleColor.LightBlue,
  [BITRIX_DICT.COLOR.BROWN]: VehicleColor.Brown,
  [BITRIX_DICT.COLOR.GREEN]: VehicleColor.Green,
  [BITRIX_DICT.COLOR.PINK]: VehicleColor.Pink,
  [BITRIX_DICT.COLOR.ORANGE]: VehicleColor.Orange,
  [BITRIX_DICT.COLOR.PURPLE]: VehicleColor.Purple,
  [BITRIX_DICT.COLOR.BEIGE]: VehicleColor.Beige,
};

const BITRIX_AMENITIES_TO_YANDEX: Record<number, VehicleAmenities> = {
  [BITRIX_DICT.EQUIPMENT.AIR_CONDITIONING]: VehicleAmenities.Conditioner,
};

const BITRIX_COUNTRY_TO_YANDEX: Record<number, CountryCode> = {
  [BITRIX_DICT.DL_COUNTRY_ISSUED.RU]: CountryCode.RU,
  [BITRIX_DICT.DL_COUNTRY_ISSUED.BY]: CountryCode.BY,
  [BITRIX_DICT.DL_COUNTRY_ISSUED.GE]: CountryCode.GE,
  [BITRIX_DICT.DL_COUNTRY_ISSUED.KZ]: CountryCode.KZ,
  [BITRIX_DICT.DL_COUNTRY_ISSUED.KG]: CountryCode.KG,
  [BITRIX_DICT.DL_COUNTRY_ISSUED.TJ]: CountryCode.TJ,
  [BITRIX_DICT.DL_COUNTRY_ISSUED.UA]: CountryCode.UA,
};

const BITRIX_VEHICLE_TO_YANDEX: Record<number, string[]> = {
  [BITRIX_DICT.VEHICLE_TYPE.CAR]: ['econom'],
  [BITRIX_DICT.VEHICLE_TYPE.TRUCK]: ['cargo'],
  [BITRIX_DICT.VEHICLE_TYPE.NONE]: [],
};

const BITRIX_EMPLOYMENT_TO_YANDEX: Record<number, EmploymentType> = {
  [BITRIX_DICT.EMPLOYMENT_TYPE.PARK_SELF_EMPLOYED]: EmploymentType.SelfEmployed,
  [BITRIX_DICT.EMPLOYMENT_TYPE.PARK_COURIER]: EmploymentType.ParkEmployee,
  [BITRIX_DICT.EMPLOYMENT_TYPE.PARK_IE]: EmploymentType.IndividualEntrepreneur,
};

const BITRIX_FUEL_TO_YANDEX: Record<number, FuelType> = {
  [BITRIX_DICT.FUEL_TYPE.ELECTRIC]: FuelType.Electricity,
  [BITRIX_DICT.FUEL_TYPE.METHANE]: FuelType.Methane,
  [BITRIX_DICT.FUEL_TYPE.GASOLINE]: FuelType.Petrol,
  [BITRIX_DICT.FUEL_TYPE.PROPANE]: FuelType.Propane,
};

const BITRIX_TRANSMISSION_TO_YANDEX: Record<number, TransmissionType> = {
  [BITRIX_DICT.TRANSMISSION.AUTOMATIC]: TransmissionType.Automatic,
  [BITRIX_DICT.TRANSMISSION.ROBOT]: TransmissionType.Robotic,
  [BITRIX_DICT.TRANSMISSION.CVT]: TransmissionType.Variator,
  [BITRIX_DICT.TRANSMISSION.MANUAL]: TransmissionType.Mechanical,
  [BITRIX_DICT.TRANSMISSION.UNKNOWN]: TransmissionType.Unknown,
};

const BITRIX_OWNERSHIP_TO_YANDEX: Record<number, OwnerShipType> = {
  [BITRIX_DICT.CAR_OWNER.PARK]: OwnerShipType.Park,
  [BITRIX_DICT.CAR_OWNER.OTHER]: OwnerShipType.Leasing,
};

const BITRIX_VACANCY_TO_YANDEX_PROFESSION: Record<number, YandexDriverProfessionType> = {
  [BITRIX_DICT.VACANCY.TAXI]: YandexDriverProfessionType.TaxiDriver,
  [BITRIX_DICT.VACANCY.AUTO_COURIER]: YandexDriverProfessionType.CargoCourierOnCar,
  [BITRIX_DICT.VACANCY.FOOT_BIKE]: YandexDriverProfessionType.CargoCourierOnFoot,
  [BITRIX_DICT.VACANCY.MOTO]: YandexDriverProfessionType.CargoCourierOnMotorcycle,
  [BITRIX_DICT.VACANCY.CARGO]: YandexDriverProfessionType.CargoCourierOnCar,
};

const BITRIX_TAX_SYSTEM_TYPE: Record<number, TaxSystemRus> = {
  [BITRIX_DICT.TAX_SYSTEM_TYPE.OSN]: TaxSystemRus.OSN,
  [BITRIX_DICT.TAX_SYSTEM_TYPE.USN]: TaxSystemRus.USN,
  [BITRIX_DICT.TAX_SYSTEM_TYPE.AUSN]: TaxSystemRus.AUSN,
  [BITRIX_DICT.TAX_SYSTEM_TYPE.OSNP]: TaxSystemRus.OSNP,
  [BITRIX_DICT.TAX_SYSTEM_TYPE.USNP]: TaxSystemRus.USNP,
};

type BitrixUfValue = string | number | undefined | number[] | string[] | boolean;

export const normalizeBitrixValue = (value: BitrixUfValue): BitrixUfValue => {
  if (value === false || value === '') return undefined;
  return value;
};

export const mapBitrixColorToYandex = (colorId?: BitrixUfValue): VehicleColor => {
  const val = normalizeBitrixValue(colorId);
  return BITRIX_COLOR_TO_YANDEX[Number(val)];
};

export const mapBitrixCountryToYandex = (countryId?: BitrixUfValue): CountryCode => {
  const val = normalizeBitrixValue(countryId);
  return BITRIX_COUNTRY_TO_YANDEX[Number(val)];
};

export const mapBitrixVehicleTypeToYandex = (typeId?: BitrixUfValue): string[] => {
  const val = normalizeBitrixValue(typeId);
  if (val === undefined || val === null) return [];
  return BITRIX_VEHICLE_TO_YANDEX[Number(val)] ?? [];
};

export const mapBitrixEmploymentTypeToYandex = (typeId?: BitrixUfValue): EmploymentType => {
  const val = normalizeBitrixValue(typeId);
  return BITRIX_EMPLOYMENT_TO_YANDEX[Number(val)];
};

export const mapBitrixFuelTypeToYandex = (typeId: BitrixUfValue): FuelType => {
  const val = normalizeBitrixValue(typeId);
  return BITRIX_FUEL_TO_YANDEX[Number(val)];
};

export const mapBitrixVacancyToYandexProfession = (
  vacancyId?: BitrixUfValue,
): YandexDriverProfessionType => {
  const val = normalizeBitrixValue(vacancyId);
  if (val === undefined || val === null) return YandexDriverProfessionType.CargoCourierOnFoot;
  return (
    BITRIX_VACANCY_TO_YANDEX_PROFESSION[Number(val)] ??
    YandexDriverProfessionType.CargoCourierOnFoot
  );
};

export const mapBitrixTransmissionToYandex = (transmissionId?: BitrixUfValue): TransmissionType => {
  const val = normalizeBitrixValue(transmissionId);
  return BITRIX_TRANSMISSION_TO_YANDEX[Number(val)];
};

export const mapBitrixAmenitiesToYandex = (amenities: number[]) => {
  return amenities.map((amenities) => {
    const val = normalizeBitrixValue(amenities);

    return BITRIX_AMENITIES_TO_YANDEX[Number(val)];
  });
};

export const mapBitrixOwnershipTypeToYandex = (type?: BitrixUfValue) => {
  const val = normalizeBitrixValue(type);

  return BITRIX_OWNERSHIP_TO_YANDEX[Number(val)];
};

export const mapBitrixTaxSystemToYandex = (type?: BitrixUfValue): TaxSystemRus => {
  const val = normalizeBitrixValue(type);
  return BITRIX_TAX_SYSTEM_TYPE[Number(val)];
};

export const mapEmployment = (
  employmentType: EmploymentType,
  taxSystem: TaxSystemRus,
  phone: string,
): YandexFleetEmployment => {
  switch (employmentType) {
    case EmploymentType.ParkEmployee: {
      return {
        type: EmploymentType.ParkEmployee,
      };
    }
    case EmploymentType.SelfEmployed: {
      return {
        type: EmploymentType.SelfEmployed,
        phone,
      };
    }
    case EmploymentType.IndividualEntrepreneur: {
      return {
        type: EmploymentType.IndividualEntrepreneur,
        tax_system: taxSystem,
      };
    }
  }
};

export const ufValueToBool = (value?: BitrixUfValue): boolean => {
  const val = normalizeBitrixValue(value);
  return val === true || val === 'Y' || val == '1';
};

export const ufValueIncludesNumber = (value: BitrixUfValue, target: number): boolean => {
  const val = normalizeBitrixValue(value);
  if (val === undefined || val === null) return false;
  if (Array.isArray(val)) return (val as number[]).includes(target);
  if (typeof val === 'number') return val === target;
  return false;
};

export const formatDateForYandex = (dateStr?: string): string | undefined => {
  if (!dateStr) return undefined;
  const dotMatch = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (dotMatch) return `${dotMatch[3]}-${dotMatch[2]}-${dotMatch[1]}`;
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  return undefined;
};

export const getBitrixCategory = (
  parkId: string,
): (typeof BITRIX_CATEGORY_STAGE)[keyof typeof BITRIX_CATEGORY_STAGE] => {
  if (YANDEX_DELIVERY_PARKS.includes(parkId))
    return BITRIX_CATEGORY_STAGE[BitrixDealCategory.YANDEX_DELIVERY];
  if (YANDEX_TAXI_PARKS.includes(parkId))
    return BITRIX_CATEGORY_STAGE[BitrixDealCategory.YANDEX_TAXI];

  throw new Error('No such parkId in constants');
};

export const formatPhoneNumber = (phone?: string) => {
  if (!phone?.trim()) return undefined;
  return '+' + phone.replace(/\D/g, '').replace(/^8/, '7');
};

export const calculateDriverHash = (deal: BitrixDealFields, contact: BitrixContactFields) => {
  const significantData = {
    phone: contact.PHONE?.[0]?.VALUE || '',
    firstName: contact.NAME,
    lastName: contact.LAST_NAME,
    middleName: contact.SECOND_NAME,
    employmentType: mapBitrixEmploymentTypeToYandex(deal[BITRIX_FIELDS.EMPLOYMENT_TYPE]),
    address: deal[BITRIX_FIELDS.ADDRESS_DISP]
      ? String(deal[BITRIX_FIELDS.ADDRESS_DISP]).split('|')[0].trim()
      : undefined,
    comment: deal.COMMENTS ?? undefined,

    balanceLimit: deal[BITRIX_FIELDS.BALANCE_LIMIT],

    dlNumber: deal[BITRIX_FIELDS.DL_SERIES_NUMBER]
      ? String(deal[BITRIX_FIELDS.DL_SERIES_NUMBER])
      : undefined,
    dlIssueDate: formatDateForYandex(String(deal[BITRIX_FIELDS.DL_ISSUE_DATE] || '')) || undefined,
    dlExpiryDate:
      formatDateForYandex(String(deal[BITRIX_FIELDS.DL_EXPIRY_DATE] || '')) || undefined,
    // dlCountry: mapBitrixCountryToYandex(deal[BITRIX_FIELDS.DL_COUNTRY_ISSUED]),
    dlBirthdate: formatDateForYandex(String(deal[BITRIX_FIELDS.BIRTH_DATE] || '')) || undefined,

    carBrand: deal[BITRIX_FIELDS.BRAND] ? String(deal[BITRIX_FIELDS.BRAND]) : undefined,
    carModel: deal[BITRIX_FIELDS.MODEL] ? String(deal[BITRIX_FIELDS.MODEL]) : undefined,
    carYear: deal[BITRIX_FIELDS.YEAR] ? Number(deal[BITRIX_FIELDS.YEAR]) : undefined,
    carColor: mapBitrixColorToYandex(deal[BITRIX_FIELDS.COLOR]),
    carTransmission: mapBitrixTransmissionToYandex(deal[BITRIX_FIELDS.TRANSMISSION]),
    carVin: deal[BITRIX_FIELDS.VIN] ? String(deal[BITRIX_FIELDS.VIN]) : undefined,
    licensePlate: deal[BITRIX_FIELDS.LICENSE_PLATE]
      ? String(deal[BITRIX_FIELDS.LICENSE_PLATE])
      : undefined,
    registrationCert: deal[BITRIX_FIELDS.STS] ? String(deal[BITRIX_FIELDS.STS]) : undefined,

    cargoLength: deal[BITRIX_FIELDS.LENGTH] ? Number(deal[BITRIX_FIELDS.LENGTH]) : undefined,
    cargoHeight: deal[BITRIX_FIELDS.HEIGHT] ? Number(deal[BITRIX_FIELDS.HEIGHT]) : undefined,
    cargoWidth: deal[BITRIX_FIELDS.WIDTH] ? Number(deal[BITRIX_FIELDS.WIDTH]) : undefined,
    carryingCapacity: deal[BITRIX_FIELDS.LOAD_CAPACITY]
      ? Number(deal[BITRIX_FIELDS.LOAD_CAPACITY])
      : undefined,
    fuelType: mapBitrixFuelTypeToYandex(deal[BITRIX_FIELDS.FUEL_TYPE]),
    amenities: ufValueIncludesNumber(
      deal[BITRIX_FIELDS.EQUIPMENT],
      BITRIX_DICT.EQUIPMENT.AIR_CONDITIONING,
    )
      ? ['conditioner']
      : [],
    platform: deal[BITRIX_FIELDS.ORDER_PROVIDER_PLATFORM] === '1',
    partner: deal[BITRIX_FIELDS.ORDER_PROVIDER_PARTNER] === '1',

    bitrixStageId: deal.STAGE_ID,
  };

  return crypto.createHash('md5').update(JSON.stringify(significantData)).digest('hex');
};

export const buildError = (error: unknown, service: string): Error => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const details = error.response?.data;
    console.error(`${service} Error [${status}]:`, JSON.stringify(details, null, 2));
    return new Error(
      `${service} Error (status: ${status}): ${details?.error_description || error.message}`,
    );
  } else if (error instanceof Error) {
    return error;
  } else {
    return new Error(String(error));
  }
};

export const mapParkName = (parkId: string) => {
  const parkName = YANDEX_PARKS_NAMES[parkId];

  if (!parkName) {
    throw new Error(`No name with such park is provided. ParkId: ${parkId}`);
  }

  return parkName;
};
