import { google, sheets_v4 } from 'googleapis';
import { JWT } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';
import {
  AppendResult,
  CellValue,
  GoogleSheetsAPIServiceOptions,
  SHEET_COLUMN_ORDER,
  SheetName,
  SheetRow,
  SheetType,
} from './google-sheet.type';

function normalizeSheetCell(cell: CellValue): CellValue {
  if (cell === null || cell === undefined || cell === false) return '';
  return cell;
}

export class GoogleSheetsAPIService {
  private readonly sheets: sheets_v4.Sheets;
  private readonly deliverySpreadsheetId: string;
  private readonly taxiSpreadsheetId: string;
  private readonly bitrixSpreadsheetId: string;
  private readonly valueInputOption: 'RAW' | 'USER_ENTERED';

  constructor(options: GoogleSheetsAPIServiceOptions) {
    const { keyFilePath, deliverySpreadsheetId, taxiSpreadsheetId, bitrixSpreadsheetId } = options;

    if (!fs.existsSync(keyFilePath)) {
      throw new Error(`Service account key file not found at: ${path.resolve(keyFilePath)}`);
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth: auth as unknown as JWT });
    this.deliverySpreadsheetId = deliverySpreadsheetId;
    this.taxiSpreadsheetId = taxiSpreadsheetId;
    this.bitrixSpreadsheetId = bitrixSpreadsheetId;
    this.valueInputOption = options.valueInputOption ?? 'RAW';
  }

  public async appendRawRows(
    sheet: SheetName,
    sheetType: SheetType,
    rows: ReadonlyArray<ReadonlyArray<CellValue>>,
  ): Promise<AppendResult> {
    if (rows.length === 0) {
      return {
        updatedRange: '',
        updatedRows: 0,
        updatedColumns: 0,
        updatedCells: 0,
      };
    }

    const response = await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.getSpreadsheetId(sheetType),
      range: sheet,
      valueInputOption: this.valueInputOption,
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: rows.map((row) => row.map((cell) => normalizeSheetCell(cell))),
      },
    });

    const updates = response.data.updates;
    return {
      updatedRange: updates?.updatedRange ?? '',
      updatedRows: updates?.updatedRows ?? 0,
      updatedColumns: updates?.updatedColumns ?? 0,
      updatedCells: updates?.updatedCells ?? 0,
    };
  }

  public async renameSpreadsheet(sheetType: SheetType, newTitle: string): Promise<void> {
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.getSpreadsheetId(sheetType),
      requestBody: {
        requests: [
          {
            updateSpreadsheetProperties: {
              properties: {
                title: newTitle,
              },
              fields: 'title',
            },
          },
        ],
      },
    });
  }

  public async appendRows<S extends SheetName>(
    sheet: S,
    sheetType: SheetType,
    rows: ReadonlyArray<SheetRow<S>>,
  ): Promise<AppendResult> {
    if (rows.length === 0) {
      return {
        updatedRange: '',
        updatedRows: 0,
        updatedColumns: 0,
        updatedCells: 0,
      };
    }

    const columnOrder = SHEET_COLUMN_ORDER[sheet];
    const rawRows: CellValue[][] = rows.map((row) =>
      columnOrder.map((col) => {
        const value = (row as Record<string, CellValue | undefined>)[col];
        return normalizeSheetCell(value === undefined ? '' : value);
      }),
    );

    return this.appendRawRows(sheet, sheetType, rawRows);
  }

  public async batchAppendRawRows(
    batches: ReadonlyArray<{
      sheet: SheetName;
      rows: ReadonlyArray<ReadonlyArray<CellValue>>;
    }>,
    sheetType: SheetType,
  ): Promise<sheets_v4.Schema$BatchUpdateValuesResponse> {
    const data: sheets_v4.Schema$ValueRange[] = batches
      .filter((b) => b.rows.length > 0)
      .map((b) => ({
        range: b.sheet,
        values: b.rows.map((row) => [...row]),
      }));

    if (data.length === 0) {
      return { spreadsheetId: this.getSpreadsheetId(sheetType), totalUpdatedCells: 0 };
    }

    const responses = await Promise.all(
      batches
        .filter((b) => b.rows.length > 0)
        .map((b) => this.appendRawRows(b.sheet, sheetType, b.rows)),
    );

    return {
      spreadsheetId: this.getSpreadsheetId(sheetType),
      totalUpdatedCells: responses.reduce((sum, r) => sum + r.updatedCells, 0),
    };
  }

  public async updateRange(
    range: string,
    values: ReadonlyArray<ReadonlyArray<CellValue>>,
    sheetType: SheetType,
  ): Promise<sheets_v4.Schema$UpdateValuesResponse> {
    const response = await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.getSpreadsheetId(sheetType),
      range,
      valueInputOption: this.valueInputOption,
      requestBody: {
        values: values.map((row) => [...row]),
      },
    });

    return response.data;
  }

  public async clearSheet(
    sheet: SheetName,
    sheetType: SheetType,
    headerRowCount = 0,
  ): Promise<void> {
    const range = headerRowCount > 0 ? `${sheet}!A${headerRowCount + 1}:ZZ` : `${sheet}`;

    await this.sheets.spreadsheets.values.clear({
      spreadsheetId: this.getSpreadsheetId(sheetType),
      range,
    });
  }

  public async ensureHeaders<S extends SheetName>(sheet: S, sheetType: SheetType): Promise<void> {
    const columnOrder = SHEET_COLUMN_ORDER[sheet];
    const lastColLetter = GoogleSheetsAPIService.columnIndexToLetter(columnOrder.length);
    const range = `${sheet}!A1:${lastColLetter}1`;

    await this.updateRange(range, [columnOrder.map((c) => String(c))], sheetType);
  }

  public async readAll(
    sheet: SheetName,
    sheetType: SheetType,
    headerRowCount = 0,
  ): Promise<CellValue[][]> {
    const range = headerRowCount > 0 ? `${sheet}!A${headerRowCount + 1}:ZZ` : `${sheet}`;

    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.getSpreadsheetId(sheetType),
      range,
    });

    return (response.data.values ?? []) as CellValue[][];
  }

  private static columnIndexToLetter(index: number): string {
    let result = '';
    let n = index;
    while (n > 0) {
      const rem = (n - 1) % 26;
      result = String.fromCharCode(65 + rem) + result;
      n = Math.floor((n - 1) / 26);
    }
    return result;
  }

  public async truncateSheet(
    sheet: SheetName,
    sheetType: SheetType,
    keepHeaderRows = 1,
  ): Promise<void> {
    const meta = await this.sheets.spreadsheets.get({
      spreadsheetId: this.getSpreadsheetId(sheetType),
      fields: 'sheets(properties(sheetId,title,gridProperties))',
    });

    const target = meta.data.sheets?.find((s) => s.properties?.title === sheet);
    if (!target?.properties) {
      throw new Error(`Sheet "${sheet}" not found`);
    }

    const sheetId = target.properties.sheetId!;
    const rowCount = target.properties.gridProperties?.rowCount ?? 0;

    if (rowCount <= keepHeaderRows) return;

    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.getSpreadsheetId(sheetType),
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: keepHeaderRows,
                endIndex: rowCount - 1,
              },
            },
          },
        ],
      },
    });
  }

  private getSpreadsheetId(sheet: SheetType): string {
    switch (sheet) {
      case SheetType.Delivery:
        return this.deliverySpreadsheetId;
      case SheetType.Taxi:
        return this.taxiSpreadsheetId;
      case SheetType.Bitrix:
        return this.bitrixSpreadsheetId;
      default:
        throw new Error(`Unknown sheet type: ${sheet}`);
    }
  }
}
