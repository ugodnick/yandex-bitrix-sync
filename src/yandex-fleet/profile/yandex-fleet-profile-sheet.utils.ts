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

function eatStageToStatus(stageId: string): ProfileStatus {
  const eatStages = getBitrixCategory(YandexFleetParkType.Eat) as ReturnType<
    typeof getBitrixCategory
  > & {
    Orders100?: string;
  };
  switch (stageId) {
    case eatStages.NotProcessed:
    case eatStages.TakenToWork:
    case eatStages.CallBack:
    case eatStages.NdzLead:
    case eatStages.Thinking:
    case eatStages.DocumentCollection:
    case eatStages.TransferToSmz:
    case eatStages.OutputFor1Order:
    case eatStages.NdzNotComeOut:
      return ProfileStatus.New;
    case eatStages.Orders25:
    case eatStages.Working:
    case eatStages.Orders100:
      return ProfileStatus.Active;
    case eatStages.Outflow:
      return ProfileStatus.Outflow;
    case eatStages.Cold:
      return ProfileStatus.Cold;
    case eatStages.Pause:
      return ProfileStatus.Pause;
    case eatStages.Archive:
    case eatStages.Cps:
    case eatStages.Duplicates:
    case eatStages.DoNotClick:
    case eatStages.SpamAdvertisingIlliquid:
    case eatStages.Refusal:
      return ProfileStatus.Archive;
    default:
      return ProfileStatus.Unknown;
  }
}

function cargoStageToStatus(stageId: string): ProfileStatus {
  const cargoStages = getBitrixCategory(YandexFleetParkType.Cargo) as ReturnType<
    typeof getBitrixCategory
  > & {
    WillComeToOffice: string;
    SentToLeadgen: string;
  };
  switch (stageId) {
    case cargoStages.NotProcessed:
    case cargoStages.TakenToWork:
    case cargoStages.CallBack:
    case cargoStages.NdzLead:
    case cargoStages.Thinking:
    case cargoStages.WillComeToOffice:
    case cargoStages.DocumentCollection:
    case cargoStages.TransferToSmz:
    case cargoStages.OutputFor1Order:
    case cargoStages.NdzNotComeOut:
      return ProfileStatus.New;
    case cargoStages.Orders25:
    case cargoStages.Working:
      return ProfileStatus.Active;
    case cargoStages.Outflow:
      return ProfileStatus.Outflow;
    case cargoStages.Cold:
      return ProfileStatus.Cold;
    case cargoStages.Pause:
      return ProfileStatus.Pause;
    case cargoStages.Archive:
    case cargoStages.SentToLeadgen:
    case cargoStages.Cps:
    case cargoStages.Duplicates:
    case cargoStages.DoNotClick:
    case cargoStages.SpamAdvertisingIlliquid:
    case cargoStages.Refusal:
      return ProfileStatus.Archive;
    default:
      return ProfileStatus.Unknown;
  }
}

export function stageToStatus(parkType: YandexFleetParkType, stageId: string): ProfileStatus {
  if (parkType === YandexFleetParkType.Eat) {
    return eatStageToStatus(stageId);
  }
  if (parkType === YandexFleetParkType.Cargo) {
    return cargoStageToStatus(stageId);
  }

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
