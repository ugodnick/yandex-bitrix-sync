export enum SheetName {
  Contractors = 'Исполнители',
  Orders = 'Заказы',
  SupplyHoursMonth = 'Время на линии месяц',
  SupplyWeekMonth = 'Время на линии неделя',
}

export enum ContractorsColumn {
  Id = 'ID',
  FullName = 'ФИО',
  Phone = 'Телефон',
  DateCreated = 'Дата создания профиля',
  DateHired = 'Дата принятия',
  FirstOrderDate = 'Дата первого заказа',
  LastOrderDate = 'Дата последнего заказа',
  VacancyType = 'Тип устройства',
  WorkConditions = 'Условия работы',
  MovementType = 'Тип передвижения',
  Status = 'Статус',
  Park = 'Парк',
  Link = 'Ссылка на профиль',
}

export enum OrdersColumn {
  ContractorId = 'ID исполнителя',
  OrderDate = 'Дата заказа',
  Status = 'Статус',
  Price = 'Стоимость заказа',
}

export enum SupplyHoursMonthColumn {
  ContractorId = 'ID исполнителя',
  SupplyHours = 'Время на линии',
}

export enum SupplyWeekMonthColumn {
  ContractorId = 'ID исполнителя',
  SupplyHours = 'Время на линии',
}

export type SheetColumnsMap = {
  [SheetName.Contractors]: ContractorsColumn;
  [SheetName.Orders]: OrdersColumn;
  [SheetName.SupplyHoursMonth]: SupplyHoursMonthColumn;
  [SheetName.SupplyWeekMonth]: SupplyWeekMonthColumn;
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
  ],
  [SheetName.SupplyHoursMonth]: [
    SupplyHoursMonthColumn.ContractorId,
    SupplyHoursMonthColumn.SupplyHours,
  ],
  [SheetName.SupplyWeekMonth]: [
    SupplyWeekMonthColumn.ContractorId,
    SupplyWeekMonthColumn.SupplyHours,
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
