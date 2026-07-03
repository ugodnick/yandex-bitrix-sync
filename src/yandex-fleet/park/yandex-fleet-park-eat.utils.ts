import { getBitrixCategory } from '../../bitrix/bitrix.utils';
import { YandexFleetParkEntity, YandexFleetParkType } from './yandex-fleet-park.entity';

export const EAT_BITRIX_STUB_CONTACT_ID = '0';
export const EAT_BITRIX_STUB_DEAL_ID = '0';

export const EAT_PROFILE_STAGES = {
  NotProcessed: 'eat:NOT_PROCESSED',
  Orders25: 'eat:ORDERS25',
  Working: 'eat:WORKING',
  Outflow: 'eat:OUTFLOW',
  Cold: 'eat:COLD',
  Archive: 'eat:ARCHIVE',
} as const;

export type EatProfileStages = typeof EAT_PROFILE_STAGES;

export const isEatPark = (park: YandexFleetParkEntity): boolean =>
  park.type === YandexFleetParkType.Eat;

export const getProfileStages = (
  park: YandexFleetParkEntity,
): EatProfileStages | ReturnType<typeof getBitrixCategory> =>
  isEatPark(park) ? EAT_PROFILE_STAGES : getBitrixCategory(park.type);
