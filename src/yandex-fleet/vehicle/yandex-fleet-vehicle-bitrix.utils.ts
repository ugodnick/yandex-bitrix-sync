import { BITRIX_DICT } from '../../bitrix/bitrix.type';
import {
  FuelType,
  TransmissionType,
  VehicleColor,
  YandexFleetVehicleData,
} from './yandex-fleet-vehicle.type';

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

export const mapVehicleTypeName = (car: YandexFleetVehicleData | undefined): string => {
  if (!car || !car.vehicle_specifications.vin) return 'Пеший';
  if (car.cargo) return 'Грузовое авто';

  return 'Авто';
};
