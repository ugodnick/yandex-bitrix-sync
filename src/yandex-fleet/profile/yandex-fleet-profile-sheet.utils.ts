import { getBitrixCategory } from '../../bitrix/bitrix.utils';
import { YandexFleetParkType } from '../park/yandex-fleet-park.entity';

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
