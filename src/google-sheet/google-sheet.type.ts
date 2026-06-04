export enum YandexFleetSheetName {
  Contractors = 'Исполнители',
  Orders = 'Заказы',
  SupplyHoursMonth = 'Время на линии месяц',
  SupplyWeekMonth = 'Время на линии неделя',
  SupplyHoursDay = 'Время на линии за прошлый день',
  Transactions = 'Транзакции',
}

export enum SheetType {
  Delivery = 'delivery',
  Taxi = 'taxi',
  Bitrix = 'bitrix',
}

export enum ContractorsColumn {
  Id = 'ID',
  FullName = 'ФИО',
  Phone = 'Телефон',
  DateCreated = 'Дата создания профиля (UTC+10)',
  DateHired = 'Дата принятия',
  FirstOrderDate = 'Дата первого заказа (UTC+10)',
  LastOrderDate = 'Дата последнего заказа (UTC+10)',
  Balance = 'Баланс (RUB)',
  VacancyType = 'Тип устройства',
  WorkConditions = 'Условия работы',
  MovementType = 'Тип передвижения',
  Status = 'Статус',
  Park = 'Парк',
  Link = 'Ссылка на профиль',
}

export enum OrdersColumn {
  ContractorId = 'ID исполнителя',
  OrderDate = 'Дата заказа (UTC+10)',
  Status = 'Статус',
  Price = 'Стоимость заказа (RUB)',
  Bonus = 'Сумма бонусов (RUB)',
  Id = 'ID заказа',
  Park = 'Парк',
}

export enum TransactionsColumn {
  Id = 'ID транзакции',
  ProfileId = 'ID профиля',
  OrderId = 'ID заказа',
  CategoryName = 'Категория',
  Amount = 'Сумма (RUB)',
  Date = 'Дата (UTC+10)',
  Park = 'Парк',
}

export enum SupplyHoursMonthColumn {
  ContractorId = 'ID исполнителя',
  SupplyHours = 'Время на линии (ч)',
}

export enum SupplyWeekMonthColumn {
  ContractorId = 'ID исполнителя',
  SupplyHours = 'Время на линии (ч)',
}

export enum SupplyHoursDayColumn {
  ContractorId = 'ID исполнителя',
  SupplyHours = 'Время на линии (ч)',
}

export type YandexFleetSheetColumnsMap = {
  [YandexFleetSheetName.Contractors]: ContractorsColumn;
  [YandexFleetSheetName.Orders]: OrdersColumn;
  [YandexFleetSheetName.SupplyHoursMonth]: SupplyHoursMonthColumn;
  [YandexFleetSheetName.SupplyWeekMonth]: SupplyWeekMonthColumn;
  [YandexFleetSheetName.SupplyHoursDay]: SupplyHoursDayColumn;
  [YandexFleetSheetName.Transactions]: TransactionsColumn;
};

export const YANDEX_FLEET_SHEET_COLUMN_ORDER: {
  [K in YandexFleetSheetName]: ReadonlyArray<YandexFleetSheetColumnsMap[K]>;
} = {
  [YandexFleetSheetName.Contractors]: [
    ContractorsColumn.Id,
    ContractorsColumn.FullName,
    ContractorsColumn.Phone,
    ContractorsColumn.DateCreated,
    ContractorsColumn.DateHired,
    ContractorsColumn.FirstOrderDate,
    ContractorsColumn.LastOrderDate,
    ContractorsColumn.Balance,
    ContractorsColumn.VacancyType,
    ContractorsColumn.WorkConditions,
    ContractorsColumn.MovementType,
    ContractorsColumn.Status,
    ContractorsColumn.Park,
    ContractorsColumn.Link,
  ],
  [YandexFleetSheetName.Orders]: [
    OrdersColumn.ContractorId,
    OrdersColumn.OrderDate,
    OrdersColumn.Status,
    OrdersColumn.Price,
    OrdersColumn.Bonus,
    OrdersColumn.Id,
    OrdersColumn.Park,
  ],
  [YandexFleetSheetName.SupplyHoursMonth]: [
    SupplyHoursMonthColumn.ContractorId,
    SupplyHoursMonthColumn.SupplyHours,
  ],
  [YandexFleetSheetName.SupplyWeekMonth]: [
    SupplyWeekMonthColumn.ContractorId,
    SupplyWeekMonthColumn.SupplyHours,
  ],
  [YandexFleetSheetName.SupplyHoursDay]: [
    SupplyHoursDayColumn.ContractorId,
    SupplyHoursDayColumn.SupplyHours,
  ],
  [YandexFleetSheetName.Transactions]: [
    TransactionsColumn.Id,
    TransactionsColumn.ProfileId,
    TransactionsColumn.OrderId,
    TransactionsColumn.CategoryName,
    TransactionsColumn.Amount,
    TransactionsColumn.Date,
    TransactionsColumn.Park,
  ],
};

export enum BitrixSheetName {
  NewDeals = 'Новые сделки',
  Contacts = 'Контакты',
  Deals = 'Сделки',
  Calls = 'Звонки',
}

export enum NewDealsColumn {
  Phone = 'Телефон',
  FullName = 'ФИО',
  Park = 'Парк',
  EmploymentType = 'Тип устройства',
  DateCreated = 'Дата создания профиля (UTC+10)',
  ProfileId = 'ID профиля',
}

export enum BitrixContactsColumn {
  Id = 'ID',
  FullName = 'ФИО',
  Phone = 'Телефон',
  DateCreate = 'Дата создания (UTC+10)',
}

export enum BitrixDealsColumn {
  Id = 'ID',
  ContactId = 'ID контакта',
  DateCreate = 'Дата создания (UTC+10)',
  DateModify = 'Дата изменения (UTC+10)',
  Dispatcher = 'Диспетчерская',
  ProfileId = 'ID профиля',
  Vacancy = 'Вакансия',
  Aggregator = 'Агрегатор',
  Comment = 'Комментарий',
  Stage = 'Стадия',
  Source = 'Источник',
  City = 'Город',
}

export enum BitrixCallsColumn {
  Manager = 'Менеджер',
  Phone = 'Телефон',
  CallType = 'Тип звонка',
  CallTime = 'Время звонка',
  CallDate = 'Дата звонка (UTC+10)',
  Status = 'Статус',
  ContactId = 'ID контакта',
}

export type BitrixSheetColumnsMap = {
  [BitrixSheetName.NewDeals]: NewDealsColumn;
  [BitrixSheetName.Contacts]: BitrixContactsColumn;
  [BitrixSheetName.Deals]: BitrixDealsColumn;
  [BitrixSheetName.Calls]: BitrixCallsColumn;
};

export const BITRIX_SHEET_COLUMN_ORDER: {
  [K in BitrixSheetName]: ReadonlyArray<BitrixSheetColumnsMap[K]>;
} = {
  [BitrixSheetName.NewDeals]: [
    NewDealsColumn.Phone,
    NewDealsColumn.FullName,
    NewDealsColumn.Park,
    NewDealsColumn.EmploymentType,
    NewDealsColumn.DateCreated,
    NewDealsColumn.ProfileId,
  ],
  [BitrixSheetName.Contacts]: [
    BitrixContactsColumn.Id,
    BitrixContactsColumn.FullName,
    BitrixContactsColumn.Phone,
    BitrixContactsColumn.DateCreate,
  ],
  [BitrixSheetName.Deals]: [
    BitrixDealsColumn.Id,
    BitrixDealsColumn.ContactId,
    BitrixDealsColumn.DateCreate,
    BitrixDealsColumn.DateModify,
    BitrixDealsColumn.Dispatcher,
    BitrixDealsColumn.ProfileId,
    BitrixDealsColumn.Vacancy,
    BitrixDealsColumn.Aggregator,
    BitrixDealsColumn.Comment,
    BitrixDealsColumn.Stage,
    BitrixDealsColumn.Source,
    BitrixDealsColumn.City,
  ],
  [BitrixSheetName.Calls]: [
    BitrixCallsColumn.Manager,
    BitrixCallsColumn.Phone,
    BitrixCallsColumn.CallType,
    BitrixCallsColumn.CallTime,
    BitrixCallsColumn.CallDate,
    BitrixCallsColumn.Status,
    BitrixCallsColumn.ContactId,
  ],
};

export type CellValue = string | number | boolean | null;

export type YandexFleetSheetRow<S extends YandexFleetSheetName> = Partial<
  Record<YandexFleetSheetColumnsMap[S], CellValue>
>;

export type BitrixSheetRow<S extends BitrixSheetName> = Partial<
  Record<BitrixSheetColumnsMap[S], CellValue>
>;

export type SheetName = YandexFleetSheetName | BitrixSheetName;

export type SheetRow<S extends SheetName> =
  | YandexFleetSheetRow<Exclude<S, BitrixSheetName>>
  | BitrixSheetRow<Exclude<S, YandexFleetSheetName>>;

export const SHEET_COLUMN_ORDER = {
  ...YANDEX_FLEET_SHEET_COLUMN_ORDER,
  ...BITRIX_SHEET_COLUMN_ORDER,
} as const;

export interface GoogleSheetsAPIServiceOptions {
  keyFilePath: string;
  deliverySpreadsheetId: string;
  taxiSpreadsheetId: string;
  bitrixSpreadsheetId: string;
  valueInputOption?: 'RAW' | 'USER_ENTERED';
}

export interface AppendResult {
  updatedRange: string;
  updatedRows: number;
  updatedColumns: number;
  updatedCells: number;
}
