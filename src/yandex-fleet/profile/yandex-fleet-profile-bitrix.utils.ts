import { BITRIX_DICT } from '../../bitrix/bitrix.type';
import { CountryCode, EmploymentType } from '../common/yandex-fleet-common.type';
import { YandexFleetParkEntity, YandexFleetParkType } from '../park/yandex-fleet-park.entity';
import { YandexFleetVehicleData } from '../vehicle/yandex-fleet-vehicle.type';

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

export const mapVacancy = (
  park: YandexFleetParkEntity,
  car: YandexFleetVehicleData | undefined,
): (typeof BITRIX_DICT.VACANCY)[keyof typeof BITRIX_DICT.VACANCY] => {
  if (park.type === YandexFleetParkType.Taxi) return BITRIX_DICT.VACANCY.TAXI;
  if (!car || !car.vehicle_specifications.vin) return BITRIX_DICT.VACANCY.FOOT_BIKE;
  if (car.cargo) return BITRIX_DICT.VACANCY.CARGO;

  return BITRIX_DICT.VACANCY.AUTO_COURIER;
};

export const mapContractorType = (
  park: YandexFleetParkEntity,
  car: YandexFleetVehicleData | undefined,
): (typeof BITRIX_DICT.CONTRACTOR_TYPE)[keyof typeof BITRIX_DICT.CONTRACTOR_TYPE] => {
  if (park.type === YandexFleetParkType.Taxi) return BITRIX_DICT.CONTRACTOR_TYPE.TAXI_DRIVER;
  if (!car || !car.vehicle_specifications.vin)
    return BITRIX_DICT.CONTRACTOR_TYPE.BICYCLE_FOOT_COURIER;
  if (car.cargo) return BITRIX_DICT.CONTRACTOR_TYPE.CARGO_DRIVER;

  return BITRIX_DICT.CONTRACTOR_TYPE.AUTO_COURIER;
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
