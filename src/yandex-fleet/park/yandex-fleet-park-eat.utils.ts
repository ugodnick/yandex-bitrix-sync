import { getBitrixCategory } from '../../bitrix/bitrix.utils';
import { YandexFleetParkEntity, YandexFleetParkType } from './yandex-fleet-park.entity';

export const isEatPark = (park: YandexFleetParkEntity): boolean =>
  park.type === YandexFleetParkType.Eat;

export const getProfileStages = (
  park: YandexFleetParkEntity,
): ReturnType<typeof getBitrixCategory> => getBitrixCategory(park.type);
