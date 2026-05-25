import { BITRIX_CATEGORY_STAGE, BITRIX_DICT } from './deal/bitrix-deal.type';

const STAGE_NAME_BY_KEY: Record<string, string> = {
  NotProcessed: 'Не обработан',
  TakenToWork: 'Взят в работу',
  CallBack: 'Перезвонить',
  NdzLead: 'НДЗ лид',
  Thinking: 'Думает',
  DocumentCollection: 'Сбор документов',
  TransferToSmz: 'Перевод в СМЗ',
  OutputFor1Order: 'Вывод на 1 заказ',
  NdzNotComeOut: 'НДЗ не вышедший',
  Orders25: '1-25 заказов',
  Working: 'Работает',
  Outflow: 'Отток',
  Pause: 'Пауза',
  Cold: 'Холод',
  Archive: 'Архив',
  Cps: 'ЦПС',
  Duplicates: 'Дубли',
  DoNotClick: 'Сюда не нажимать',
  SpamAdvertisingIlliquid: 'Спам/Реклама/Неликвид',
  Refusal: 'Отказ',
};

function buildStageLabels(): Record<string, string> {
  const labels: Record<string, string> = {};

  for (const stages of Object.values(BITRIX_CATEGORY_STAGE)) {
    for (const [key, statusId] of Object.entries(stages)) {
      labels[statusId] = STAGE_NAME_BY_KEY[key] ?? statusId;
    }
  }

  return labels;
}

export const BITRIX_STAGE_LABELS = buildStageLabels();

export const BITRIX_VACANCY_LABELS: Record<string, string> = {
  [BITRIX_DICT.VACANCY.TAXI]: 'Такси',
  [BITRIX_DICT.VACANCY.AUTO_COURIER]: 'Автокурьер',
  [BITRIX_DICT.VACANCY.FOOT_BIKE]: 'Пеший / вело',
  [BITRIX_DICT.VACANCY.MOTO]: 'Мото курьер',
  [BITRIX_DICT.VACANCY.CARGO]: 'Грузовой',
};

export const BITRIX_AGGREGATOR_LABELS: Record<string, string> = {
  [BITRIX_DICT.AGGREGATOR.KUPER]: 'Купер',
  [BITRIX_DICT.AGGREGATOR.YANDEX_TAXI]: 'Яндекс Такси',
  [BITRIX_DICT.AGGREGATOR.YANDEX_EDA]: 'Яндекс Еда',
  [BITRIX_DICT.AGGREGATOR.YANDEX_MARKET]: 'Яндекс Маркет',
  [BITRIX_DICT.AGGREGATOR.YANDEX_DELIVERY]: 'Яндекс Доставка',
};
