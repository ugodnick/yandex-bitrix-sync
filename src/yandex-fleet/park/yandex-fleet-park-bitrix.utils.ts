import { BitrixDealCategory } from '../../bitrix/bitrix.type';
import { BITRIX_DICT } from '../../bitrix/bitrix.type';
import { YandexFleetParkType } from './yandex-fleet-park.entity';

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
