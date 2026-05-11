export enum SheetName {
  Contractors = 'Исполнители',
  Orders = 'Заказы',
  SupplyHoursMonth = 'Время на линии месяц',
  SupplyWeekMonth = 'Время на линии неделя',
  Transactions = 'Транзакции',
}

export enum ContractorsColumn {
  Id = 'ID',
  FullName = 'ФИО',
  Phone = 'Телефон',
  DateCreated = 'Дата создания профиля (UTC+10)',
  DateHired = 'Дата принятия',
  FirstOrderDate = 'Дата первого заказа (UTC+10)',
  LastOrderDate = 'Дата последнего заказа (UTC+10)',
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

export type SheetColumnsMap = {
  [SheetName.Contractors]: ContractorsColumn;
  [SheetName.Orders]: OrdersColumn;
  [SheetName.SupplyHoursMonth]: SupplyHoursMonthColumn;
  [SheetName.SupplyWeekMonth]: SupplyWeekMonthColumn;
  [SheetName.Transactions]: TransactionsColumn;
};

export const SHEET_COLUMN_ORDER: {
  [K in SheetName]: ReadonlyArray<SheetColumnsMap[K]>;
} = {
  [SheetName.Contractors]: [
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
  ],
  [SheetName.Orders]: [
    OrdersColumn.ContractorId,
    OrdersColumn.OrderDate,
    OrdersColumn.Status,
    OrdersColumn.Price,
    OrdersColumn.Bonus,
    OrdersColumn.Id,
    OrdersColumn.Park,
  ],
  [SheetName.SupplyHoursMonth]: [
    SupplyHoursMonthColumn.ContractorId,
    SupplyHoursMonthColumn.SupplyHours,
  ],
  [SheetName.SupplyWeekMonth]: [
    SupplyWeekMonthColumn.ContractorId,
    SupplyWeekMonthColumn.SupplyHours,
  ],
  [SheetName.Transactions]: [
    TransactionsColumn.Id,
    TransactionsColumn.ProfileId,
    TransactionsColumn.OrderId,
    TransactionsColumn.CategoryName,
    TransactionsColumn.Amount,
    TransactionsColumn.Date,
    TransactionsColumn.Park,
  ],
};

export type SheetRow<S extends SheetName> = Partial<
  Record<SheetColumnsMap[S], string | number | boolean | null>
>;

export type CellValue = string | number | boolean | null;

export interface GoogleSheetsAPIServiceOptions {
  keyFilePath: string;
  spreadsheetId: string;
  valueInputOption?: 'RAW' | 'USER_ENTERED';
}

export interface AppendResult {
  updatedRange: string;
  updatedRows: number;
  updatedColumns: number;
  updatedCells: number;
}
