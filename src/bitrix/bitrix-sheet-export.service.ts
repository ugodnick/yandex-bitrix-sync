import { GoogleSheetsAPIService } from '../google-sheet/google-sheet.service';
import { SheetType } from '../google-sheet/google-sheet.type';
import { BitrixSheetName } from '../google-sheet/google-sheet.type';
import { BitrixService } from './bitrix.service';

export class BitrixSheetExportService {
  constructor(
    private readonly bitrixService: BitrixService,
    private readonly googleSheetsApiService: GoogleSheetsAPIService,
  ) {}

  async appendNewDeal(payload: string[]): Promise<void> {
    await this.googleSheetsApiService.ensureHeaders(BitrixSheetName.NewDeals, SheetType.Bitrix);
    await this.googleSheetsApiService.appendRawRows(BitrixSheetName.NewDeals, SheetType.Bitrix, [
      payload,
    ]);
  }
}
