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
  Eat = 'eat',
  Cargo = 'cargo',
  Bitrix = 'bitrix',
  Uis = 'uis',
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
  CancellationReason = 'Причина отказа',
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
    ContractorsColumn.VacancyType,
    ContractorsColumn.WorkConditions,
    ContractorsColumn.MovementType,
    ContractorsColumn.Status,
    ContractorsColumn.Park,
    ContractorsColumn.Link,
    ContractorsColumn.Balance,
  ],
  [YandexFleetSheetName.Orders]: [
    OrdersColumn.ContractorId,
    OrdersColumn.OrderDate,
    OrdersColumn.Status,
    OrdersColumn.Price,
    OrdersColumn.Bonus,
    OrdersColumn.Id,
    OrdersColumn.Park,
    OrdersColumn.CancellationReason,
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
  Sources = 'Источники',
  FirstOrderTransferredBy = 'Вывод на первый заказ (кто перенес)',
  FirstOrderTransferredAt = 'Вывод на первый заказ (когда перенесено)',
  AssignedBy = 'Ответственный',
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
    BitrixDealsColumn.Sources,
    BitrixDealsColumn.FirstOrderTransferredBy,
    BitrixDealsColumn.FirstOrderTransferredAt,
    BitrixDealsColumn.AssignedBy,
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

export enum UisSheetName {
  Calls = 'Звонки',
  CallLegs = 'Плечи',
  Employees = 'Сотрудники',
  Groups = 'Группы',
  SipLines = 'SIP',
  Numbers = 'Номера',
  Scenarios = 'Сценарии',
  EmployeeStatus = 'Время в статусах',
}

export enum UisCallsColumn {
  Id = 'ID',
  Start = 'Начало (UTC+10)',
  Finish = 'Окончание (UTC+10)',
  Direction = 'Направление',
  Lost = 'Потерян',
  ContactPhone = 'Номер абонента',
  VirtualPhone = 'Виртуальный номер',
  Wait = 'Ожидание, сек',
  Talk = 'Разговор, сек',
  Duration = 'Длительность, сек',
  FinishReason = 'Причина завершения',
  Employee = 'Сотрудник',
  Scenario = 'Сценарий',
  Source = 'Источник',
  Records = 'Записи',
}

export enum UisCallLegsColumn {
  Id = 'ID',
  SessionId = 'ID сессии',
  Start = 'Начало (UTC+10)',
  Duration = 'Длительность, сек',
  Direction = 'Направление',
  Calling = 'Кто звонил',
  Called = 'Кому',
  Employee = 'Сотрудник',
  Group = 'Группа',
  FinishReason = 'Причина',
  Scenario = 'Сценарий',
}

export enum UisEmployeesColumn {
  Id = 'ID',
  FullName = 'ФИО',
  Email = 'Email',
  Status = 'Статус',
  Extension = 'Внутренний номер',
  Phones = 'Телефоны',
}

export enum UisGroupsColumn {
  Id = 'ID',
  Name = 'Название',
}

export enum UisSipLinesColumn {
  Id = 'ID',
  Phone = 'Номер',
  Type = 'Тип',
  Status = 'Статус',
  Employee = 'Сотрудник',
  VirtualPhone = 'Виртуальный номер',
  Billing = 'Биллинг',
  Registration = 'Регистрация',
}

export enum UisNumbersColumn {
  Id = 'ID',
  Phone = 'Номер',
  Status = 'Статус',
  Type = 'Тип',
  Name = 'Название',
  Comment = 'Комментарий',
}

export enum UisScenariosColumn {
  Id = 'ID',
  Name = 'Название',
  Numbers = 'Номера',
}

export enum UisEmployeeStatusColumn {
  Date = 'Дата (UTC+10)',
  Employee = 'Сотрудник',
  Groups = 'Группы',
  Available = 'Доступен',
  Break = 'Перерыв',
  DoNotDisturb = 'Не беспокоить',
  NotAtWorkplace = 'Нет на месте',
  NotAtWork = 'Нет на работе',
  AutoOutCall = 'Исходящий обзвон',
  Unknown = 'Неизвестно',
}

export type UisSheetColumnsMap = {
  [UisSheetName.Calls]: UisCallsColumn;
  [UisSheetName.CallLegs]: UisCallLegsColumn;
  [UisSheetName.Employees]: UisEmployeesColumn;
  [UisSheetName.Groups]: UisGroupsColumn;
  [UisSheetName.SipLines]: UisSipLinesColumn;
  [UisSheetName.Numbers]: UisNumbersColumn;
  [UisSheetName.Scenarios]: UisScenariosColumn;
  [UisSheetName.EmployeeStatus]: UisEmployeeStatusColumn;
};

export const UIS_SHEET_COLUMN_ORDER: {
  [K in UisSheetName]: ReadonlyArray<UisSheetColumnsMap[K]>;
} = {
  [UisSheetName.Calls]: [
    UisCallsColumn.Id,
    UisCallsColumn.Start,
    UisCallsColumn.Finish,
    UisCallsColumn.Direction,
    UisCallsColumn.Lost,
    UisCallsColumn.ContactPhone,
    UisCallsColumn.VirtualPhone,
    UisCallsColumn.Wait,
    UisCallsColumn.Talk,
    UisCallsColumn.Duration,
    UisCallsColumn.FinishReason,
    UisCallsColumn.Employee,
    UisCallsColumn.Scenario,
    UisCallsColumn.Source,
    UisCallsColumn.Records,
  ],
  [UisSheetName.CallLegs]: [
    UisCallLegsColumn.Id,
    UisCallLegsColumn.SessionId,
    UisCallLegsColumn.Start,
    UisCallLegsColumn.Duration,
    UisCallLegsColumn.Direction,
    UisCallLegsColumn.Calling,
    UisCallLegsColumn.Called,
    UisCallLegsColumn.Employee,
    UisCallLegsColumn.Group,
    UisCallLegsColumn.FinishReason,
    UisCallLegsColumn.Scenario,
  ],
  [UisSheetName.Employees]: [
    UisEmployeesColumn.Id,
    UisEmployeesColumn.FullName,
    UisEmployeesColumn.Email,
    UisEmployeesColumn.Status,
    UisEmployeesColumn.Extension,
    UisEmployeesColumn.Phones,
  ],
  [UisSheetName.Groups]: [UisGroupsColumn.Id, UisGroupsColumn.Name],
  [UisSheetName.SipLines]: [
    UisSipLinesColumn.Id,
    UisSipLinesColumn.Phone,
    UisSipLinesColumn.Type,
    UisSipLinesColumn.Status,
    UisSipLinesColumn.Employee,
    UisSipLinesColumn.VirtualPhone,
    UisSipLinesColumn.Billing,
    UisSipLinesColumn.Registration,
  ],
  [UisSheetName.Numbers]: [
    UisNumbersColumn.Id,
    UisNumbersColumn.Phone,
    UisNumbersColumn.Status,
    UisNumbersColumn.Type,
    UisNumbersColumn.Name,
    UisNumbersColumn.Comment,
  ],
  [UisSheetName.Scenarios]: [
    UisScenariosColumn.Id,
    UisScenariosColumn.Name,
    UisScenariosColumn.Numbers,
  ],
  [UisSheetName.EmployeeStatus]: [
    UisEmployeeStatusColumn.Date,
    UisEmployeeStatusColumn.Employee,
    UisEmployeeStatusColumn.Groups,
    UisEmployeeStatusColumn.Available,
    UisEmployeeStatusColumn.Break,
    UisEmployeeStatusColumn.DoNotDisturb,
    UisEmployeeStatusColumn.NotAtWorkplace,
    UisEmployeeStatusColumn.NotAtWork,
    UisEmployeeStatusColumn.AutoOutCall,
    UisEmployeeStatusColumn.Unknown,
  ],
};

export type CellValue = string | number | boolean | null;

export type YandexFleetSheetRow<S extends YandexFleetSheetName> = Partial<
  Record<YandexFleetSheetColumnsMap[S], CellValue>
>;

export type BitrixSheetRow<S extends BitrixSheetName> = Partial<
  Record<BitrixSheetColumnsMap[S], CellValue>
>;

export type UisSheetRow<S extends UisSheetName> = Partial<Record<UisSheetColumnsMap[S], CellValue>>;

export type SheetName = YandexFleetSheetName | BitrixSheetName | UisSheetName;

export type SheetRow<S extends SheetName> = S extends YandexFleetSheetName
  ? YandexFleetSheetRow<S>
  : S extends BitrixSheetName
    ? BitrixSheetRow<S>
    : S extends UisSheetName
      ? UisSheetRow<S>
      : never;

export const SHEET_COLUMN_ORDER = {
  ...YANDEX_FLEET_SHEET_COLUMN_ORDER,
  ...BITRIX_SHEET_COLUMN_ORDER,
} as const;

export interface GoogleSheetsAPIServiceOptions {
  keyFilePath: string;
  deliverySpreadsheetId: string;
  taxiSpreadsheetId: string;
  eatSpreadsheetId: string;
  cargoSpreadsheetId: string;
  bitrixSpreadsheetId: string;
  uisSpreadsheetId: string;
  valueInputOption?: 'RAW' | 'USER_ENTERED';
}

export interface AppendResult {
  updatedRange: string;
  updatedRows: number;
  updatedColumns: number;
  updatedCells: number;
}
