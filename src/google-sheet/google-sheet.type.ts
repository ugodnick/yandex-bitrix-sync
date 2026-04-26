export enum SheetName {
  Contractors = 'Исполнители',
  Orders = 'Заказы',
}

export enum ContractorsColumn {
  Id = 'ID',
  FullName = 'ФИО',
  Phone = 'Телефон',
  DateAdded = 'Дата добавления',
  FirstOrderDate = 'Дата первого заказа',
  LastOrderDate = 'Дата последнего заказа',
  VacancyType = 'Тип устройства',
  WorkConditions = 'Условия работы',
  MovementType = 'Тип передвижения',
  Status = 'Статус',
}

export enum OrdersColumn {
  ContractorId = 'ID исполнителя',
  OrderDate = 'Дата заказа',
  Status = 'Статус',
}

export type SheetColumnsMap = {
  [SheetName.Contractors]: ContractorsColumn;
  [SheetName.Orders]: OrdersColumn;
};

export const SHEET_COLUMN_ORDER: {
  [K in SheetName]: ReadonlyArray<SheetColumnsMap[K]>;
} = {
  [SheetName.Contractors]: [
    ContractorsColumn.Id,
    ContractorsColumn.FullName,
    ContractorsColumn.Phone,
    ContractorsColumn.DateAdded,
    ContractorsColumn.FirstOrderDate,
    ContractorsColumn.LastOrderDate,
    ContractorsColumn.VacancyType,
    ContractorsColumn.WorkConditions,
    ContractorsColumn.MovementType,
    ContractorsColumn.Status,
  ],
  [SheetName.Orders]: [OrdersColumn.ContractorId, OrdersColumn.OrderDate, OrdersColumn.Status],
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
