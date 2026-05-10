import { BITRIX_DICT, BitrixDealCategory } from '../bitrix/bitrix.type';
import {
  CountryCode,
  EmploymentType,
  FuelType,
  OrderStatus,
  TransmissionType,
  VehicleColor,
  YandexFleetDriverProfile,
  YandexFleetVehicleData,
} from './yandex-fleet.type';
import crypto from 'crypto';
import { YandexFleetParkEntity, YandexFleetParkType } from './yandex-park.entity';
import { getBitrixCategory } from '../bitrix/bitrix.utils';

export const mapYandexColorToBitrix = (color?: VehicleColor): number | undefined => {
  if (!color) return undefined;

  const colorMap: Record<VehicleColor, number> = {
    [VehicleColor.White]: BITRIX_DICT.COLOR.WHITE,
    [VehicleColor.Yellow]: BITRIX_DICT.COLOR.YELLOW,
    [VehicleColor.Black]: BITRIX_DICT.COLOR.BLACK,
    [VehicleColor.Gray]: BITRIX_DICT.COLOR.GRAY,
    [VehicleColor.Red]: BITRIX_DICT.COLOR.RED,
    [VehicleColor.Blue]: BITRIX_DICT.COLOR.BLUE,
    [VehicleColor.LightBlue]: BITRIX_DICT.COLOR.LIGHT_BLUE,
    [VehicleColor.Brown]: BITRIX_DICT.COLOR.BROWN,
    [VehicleColor.Green]: BITRIX_DICT.COLOR.GREEN,
    [VehicleColor.Pink]: BITRIX_DICT.COLOR.PINK,
    [VehicleColor.Orange]: BITRIX_DICT.COLOR.ORANGE,
    [VehicleColor.Purple]: BITRIX_DICT.COLOR.PURPLE,
    [VehicleColor.Beige]: BITRIX_DICT.COLOR.BEIGE,
  };

  return colorMap[color];
};

export const mapDlCountryToBitrix = (country?: string | CountryCode): number | undefined => {
  if (!country) return undefined;

  const c = country.toLowerCase();

  const countryMap: Record<string, number> = {
    [CountryCode.RU]: BITRIX_DICT.DL_COUNTRY_ISSUED.RU,
    [CountryCode.BY]: BITRIX_DICT.DL_COUNTRY_ISSUED.BY,
    [CountryCode.KZ]: BITRIX_DICT.DL_COUNTRY_ISSUED.KZ,
    [CountryCode.KG]: BITRIX_DICT.DL_COUNTRY_ISSUED.KG,
    [CountryCode.TJ]: BITRIX_DICT.DL_COUNTRY_ISSUED.TJ,
    [CountryCode.UA]: BITRIX_DICT.DL_COUNTRY_ISSUED.UA,
    [CountryCode.GE]: BITRIX_DICT.DL_COUNTRY_ISSUED.GE,
  };

  return countryMap[c] ?? BITRIX_DICT.DL_COUNTRY_ISSUED.OTHER;
};

export const mapEmploymentType = (type?: EmploymentType): number | undefined => {
  if (!type) return undefined;

  const map: Record<EmploymentType, number> = {
    [EmploymentType.SelfEmployed]: BITRIX_DICT.EMPLOYMENT_TYPE.PARK_SELF_EMPLOYED,
    [EmploymentType.ParkEmployee]: BITRIX_DICT.EMPLOYMENT_TYPE.PARK_COURIER,
    [EmploymentType.IndividualEntrepreneur]: BITRIX_DICT.EMPLOYMENT_TYPE.PARK_IE,
  };

  return map[type];
};

export const mapTransmission = (type?: TransmissionType) => {
  if (!type) return BITRIX_DICT.TRANSMISSION.UNKNOWN;

  const map: Record<TransmissionType, number> = {
    [TransmissionType.Automatic]: BITRIX_DICT.TRANSMISSION.AUTOMATIC,
    [TransmissionType.Robotic]: BITRIX_DICT.TRANSMISSION.ROBOT,
    [TransmissionType.Variator]: BITRIX_DICT.TRANSMISSION.CVT,
    [TransmissionType.Mechanical]: BITRIX_DICT.TRANSMISSION.MANUAL,
    [TransmissionType.Unknown]: BITRIX_DICT.TRANSMISSION.UNKNOWN,
  };

  return map[type];
};

export const mapFuelType = (type?: FuelType) => {
  if (!type) return undefined;

  const map: Record<FuelType, number> = {
    [FuelType.Electricity]: BITRIX_DICT.FUEL_TYPE.ELECTRIC,
    [FuelType.Methane]: BITRIX_DICT.FUEL_TYPE.METHANE,
    [FuelType.Petrol]: BITRIX_DICT.FUEL_TYPE.GASOLINE,
    [FuelType.Propane]: BITRIX_DICT.FUEL_TYPE.PROPANE,
  };

  return map[type];
};

export const mapCarOwnership = (
  car: YandexFleetVehicleData | undefined,
): (typeof BITRIX_DICT.CAR_OWNER)[keyof typeof BITRIX_DICT.CAR_OWNER] => {
  if (!car || !car.vehicle_specifications.vin) return BITRIX_DICT.CAR_OWNER.OTHER;

  return car.park_profile.is_park_property ? BITRIX_DICT.CAR_OWNER.PARK : BITRIX_DICT.CAR_OWNER.OWN;
};

export const mapVehicleType = (car: YandexFleetVehicleData | undefined): number => {
  if (!car || !car.vehicle_specifications.vin) return BITRIX_DICT.VEHICLE_TYPE.NONE;
  if (car.cargo) return BITRIX_DICT.VEHICLE_TYPE.TRUCK;

  return BITRIX_DICT.VEHICLE_TYPE.CAR;
};

export const mapVacancy = (
  park: YandexFleetParkEntity,
  car: YandexFleetVehicleData | undefined,
): (typeof BITRIX_DICT.VACANCY)[keyof typeof BITRIX_DICT.VACANCY] => {
  if (park.type === YandexFleetParkType.Taxi) BITRIX_DICT.VACANCY.TAXI;
  if (!car || !car.vehicle_specifications.vin) return BITRIX_DICT.VACANCY.FOOT_BIKE;
  if (car.cargo) return BITRIX_DICT.VACANCY.CARGO;

  return BITRIX_DICT.VACANCY.AUTO_COURIER;
};

export const mapContractorType = (
  park: YandexFleetParkEntity,
  car: YandexFleetVehicleData | undefined,
): (typeof BITRIX_DICT.CONTRACTOR_TYPE)[keyof typeof BITRIX_DICT.CONTRACTOR_TYPE] => {
  if (park.type === YandexFleetParkType.Taxi) BITRIX_DICT.CONTRACTOR_TYPE.TAXI_DRIVER;
  if (!car || !car.vehicle_specifications.vin)
    return BITRIX_DICT.CONTRACTOR_TYPE.BICYCLE_FOOT_COURIER;
  if (car.cargo) return BITRIX_DICT.CONTRACTOR_TYPE.CARGO_DRIVER;

  return BITRIX_DICT.CONTRACTOR_TYPE.AUTO_COURIER;
};

export const mapCategory = (
  parkType: YandexFleetParkType,
): (typeof BitrixDealCategory)[keyof typeof BitrixDealCategory] => {
  if (parkType === YandexFleetParkType.Delivery) return BitrixDealCategory.YANDEX_DELIVERY;
  if (parkType === YandexFleetParkType.Taxi) return BitrixDealCategory.YANDEX_TAXI;

  throw new Error('No such park type in constants');
};

export const mapAggregator = (
  parkType: YandexFleetParkType,
): (typeof BITRIX_DICT.AGGREGATOR)[keyof typeof BITRIX_DICT.AGGREGATOR] => {
  if (parkType === YandexFleetParkType.Delivery) return BITRIX_DICT.AGGREGATOR.YANDEX_DELIVERY;
  if (parkType === YandexFleetParkType.Taxi) return BITRIX_DICT.AGGREGATOR.YANDEX_TAXI;

  throw new Error('No such park type in constants');
};

export const formatDateForBitrix = (dateStr?: string): string | undefined => {
  if (!dateStr) return undefined;
  return dateStr.substring(0, 10);
};

export const cleanPayload = (obj: Record<string, any>) => {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== ''));
};

export function calculateDriverHash(
  driverProfile: YandexFleetDriverProfile,
  driverCar: YandexFleetVehicleData | undefined,
  bitrixStageId?: string,
): string {
  const person = driverProfile.person;
  const dl = driverProfile.person.driver_license;

  const cargo = driverCar?.cargo;
  const vehicleSpecifications = driverCar?.vehicle_specifications;
  const vehiclePark = driverCar?.park_profile;
  const vehicleLicenses = driverCar?.vehicle_licenses;

  const significantData = {
    // Личные данные
    phone: person.contact_info.phone,
    firstName: person.full_name.first_name,
    lastName: person.full_name.last_name,
    middleName: person.full_name.middle_name,
    employmentType: person.employment_type,
    address: person.contact_info?.address,
    comment: undefined,

    balanceLimit: driverProfile.account.balance_limit,

    // Водительское удостоверение
    dlNumber: dl?.number,
    dlIssueDate: dl?.issue_date,
    dlExpiryDate: dl?.expiry_date,
    // dlCountry: dl?.country,
    dlBirthdate: dl?.birth_date,

    // Автомобиль — идентификация
    carBrand: vehicleSpecifications?.brand,
    carModel: vehicleSpecifications?.model,
    carYear: vehicleSpecifications?.year,
    carColor: vehicleSpecifications?.color,
    carTransmission: vehicleSpecifications?.transmission,
    carVin: vehicleSpecifications?.vin,
    licensePlate: vehicleLicenses?.licence_plate_number,
    registrationCert: vehicleLicenses?.registration_certificate,

    // Автомобиль — характеристики
    cargoLength: cargo?.cargo_hold_dimensions?.length,
    cargoHeight: cargo?.cargo_hold_dimensions?.height,
    cargoWidth: cargo?.cargo_hold_dimensions?.width,
    carryingCapacity: cargo?.carrying_capacity,
    fuelType: vehiclePark?.fuel_type,
    amenities: vehiclePark?.amenities ?? [],
    platform: driverProfile.order_provider.platform,
    partner: driverProfile.order_provider.partner,

    bitrixStageId,
  };

  return crypto.createHash('md5').update(JSON.stringify(significantData)).digest('hex');
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ru-RU');
}

export function formatDateInTz(date: Date, withTime = false): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Vladivostok',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  };

  if (withTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.second = '2-digit';
    options.hour12 = false;
  }

  return new Intl.DateTimeFormat('ru-RU', options).format(date);
}

export enum ProfileStatus {
  New = 'Новый',
  Active = 'Активный',
  Outflow = 'Отток',
  Cold = 'Холод',
  Pause = 'Пауза',
  Archive = 'Архив',
  Unknown = 'Неизвестно',
}

export function stageToStatus(parkType: YandexFleetParkType, stageId: string): ProfileStatus {
  const stages = getBitrixCategory(parkType);
  switch (stageId) {
    case stages.NotProcessed:
    case stages.TakenToWork:
    case stages.CallBack:
    case stages.NdzLead:
    case stages.Thinking:
    case stages.DocumentCollection:
    case stages.TransferToSmz:
    case stages.OutputFor1Order:
    case stages.NdzNotComeOut:
      return ProfileStatus.New;
    case stages.Orders25:
    case stages.Working:
      return ProfileStatus.Active;
    case stages.Outflow:
      return ProfileStatus.Outflow;
    case stages.Cold:
      return ProfileStatus.Cold;
    case stages.Pause:
      return ProfileStatus.Pause;
    case stages.Archive:
    case stages.Cps:
    case stages.Duplicates:
    case stages.DoNotClick:
    case stages.SpamAdvertisingIlliquid:
    case stages.Refusal:
      return ProfileStatus.Archive;
    default:
      return ProfileStatus.Unknown;
  }
}

export const mapVehicleTypeName = (car: YandexFleetVehicleData | undefined): string => {
  if (!car || !car.vehicle_specifications.vin) return 'Пеший';
  if (car.cargo) return 'Грузовое авто';

  return 'Авто';
};

export const mapEmploymentTypeName = (type: EmploymentType | undefined): string => {
  if (!type) return '';

  const map = {
    [EmploymentType.SelfEmployed]: 'Самозанятой',
    [EmploymentType.ParkEmployee]: 'Парковый сотрудник',
    [EmploymentType.IndividualEntrepreneur]: 'ИП',
  };
  return map[type];
};

export function mapOrderStatusName(status: OrderStatus): string {
  const statusMap: Record<OrderStatus, string> = {
    [OrderStatus.None]: 'без статуса',
    [OrderStatus.Driving]: 'в пути',
    [OrderStatus.Waiting]: 'ждёт клиента',
    [OrderStatus.Transporting]: 'везёт клиента',
    [OrderStatus.Complete]: 'выполнен',
    [OrderStatus.Cancelled]: 'отменён',
    [OrderStatus.Calling]: 'ошибка, технический статус',
    [OrderStatus.Expired]: 'ошибка, технический статус',
    [OrderStatus.Failed]: 'ошибка, технический статус',
  };

  return statusMap[status];
}
