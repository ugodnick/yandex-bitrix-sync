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
} from './google-sheet.type';

export class GoogleSheetsAPIService {
  private readonly sheets: sheets_v4.Sheets;
  private readonly spreadsheetId: string;
  private readonly valueInputOption: 'RAW' | 'USER_ENTERED';

  constructor(options: GoogleSheetsAPIServiceOptions) {
    const { keyFilePath, spreadsheetId } = options;

    if (!fs.existsSync(keyFilePath)) {
      throw new Error(`Service account key file not found at: ${path.resolve(keyFilePath)}`);
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth: auth as unknown as JWT });
    this.spreadsheetId = spreadsheetId;
    this.valueInputOption = options.valueInputOption ?? 'RAW';
  }

  public async appendRawRows(
    sheet: SheetName,
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
      spreadsheetId: this.spreadsheetId,
      range: sheet,
      valueInputOption: this.valueInputOption,
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: rows.map((row) => [...row]),
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

  public async renameSpreadsheet(newTitle: string): Promise<void> {
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
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
        return value === undefined ? '' : value;
      }),
    );

    return this.appendRawRows(sheet, rawRows);
  }

  public async batchAppendRawRows(
    batches: ReadonlyArray<{
      sheet: SheetName;
      rows: ReadonlyArray<ReadonlyArray<CellValue>>;
    }>,
  ): Promise<sheets_v4.Schema$BatchUpdateValuesResponse> {
    const data: sheets_v4.Schema$ValueRange[] = batches
      .filter((b) => b.rows.length > 0)
      .map((b) => ({
        range: b.sheet,
        values: b.rows.map((row) => [...row]),
      }));

    if (data.length === 0) {
      return { spreadsheetId: this.spreadsheetId, totalUpdatedCells: 0 };
    }

    const responses = await Promise.all(
      batches.filter((b) => b.rows.length > 0).map((b) => this.appendRawRows(b.sheet, b.rows)),
    );

    return {
      spreadsheetId: this.spreadsheetId,
      totalUpdatedCells: responses.reduce((sum, r) => sum + r.updatedCells, 0),
    };
  }

  public async updateRange(
    range: string,
    values: ReadonlyArray<ReadonlyArray<CellValue>>,
  ): Promise<sheets_v4.Schema$UpdateValuesResponse> {
    const response = await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range,
      valueInputOption: this.valueInputOption,
      requestBody: {
        values: values.map((row) => [...row]),
      },
    });

    return response.data;
  }

  public async clearSheet(sheet: SheetName, headerRowCount = 0): Promise<void> {
    const range = headerRowCount > 0 ? `${sheet}!A${headerRowCount + 1}:ZZ` : `${sheet}`;

    await this.sheets.spreadsheets.values.clear({
      spreadsheetId: this.spreadsheetId,
      range,
    });
  }

  public async ensureHeaders<S extends SheetName>(sheet: S): Promise<void> {
    const columnOrder = SHEET_COLUMN_ORDER[sheet];
    const lastColLetter = GoogleSheetsAPIService.columnIndexToLetter(columnOrder.length);
    const range = `${sheet}!A1:${lastColLetter}1`;

    await this.updateRange(range, [columnOrder.map((c) => String(c))]);
  }

  public async readAll(sheet: SheetName, headerRowCount = 0): Promise<CellValue[][]> {
    const range = headerRowCount > 0 ? `${sheet}!A${headerRowCount + 1}:ZZ` : `${sheet}`;

    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
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
}
