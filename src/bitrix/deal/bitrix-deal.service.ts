import { isAxiosError } from 'axios';
import { BitrixDealCategory } from './bitrix-deal.type';
import type {
  AddBitrixDealDto,
  BitrixDealFields,
  BitrixListResponse,
  CreateDealResponse,
  GetDealResponse,
  UpdateBitrixDealDto,
  UpdateEntityResponse,
} from '../bitrix.type';
import { BitrixClient } from '../common/bitrix-client';
import { buildError } from '../common/bitrix-common.utils';

export class BitrixDealService {
  constructor(private readonly client: BitrixClient) {}

  async get(id: string | number): Promise<BitrixDealFields> {
    try {
      const data = await this.client.get<GetDealResponse>('crm.deal.get.json', {
        params: { id },
      });
      if (!data.result) throw new Error('Deal not found');
      return data.result;
    } catch (error) {
      throw buildError(error, BitrixDealService.name);
    }
  }

  async list(
    categories: BitrixDealCategory[] = [
      BitrixDealCategory.YANDEX_DELIVERY,
      BitrixDealCategory.YANDEX_TAXI,
    ],
  ): Promise<BitrixDealFields[]> {
    try {
      const allDeals: BitrixDealFields[] = [];
      let start = 0;

      while (true) {
        const data = await this.client.get<BitrixListResponse<BitrixDealFields>>(
          'crm.deal.list.json',
          {
            params: {
              filter: { CATEGORY_ID: categories },
              order: { ID: 'DESC' },
              select: [
                'ID',
                'CONTACT_ID',
                'DATE_CREATE',
                'DATE_MODIFY',
                'COMMENTS',
                'STAGE_ID',
                'SOURCE_ID',
                'SOURCE_DESCRIPTION',
                'UF_*',
              ],
              start,
            },
          },
        );

        allDeals.push(...(data.result ?? []));

        const next = data.next;
        if (typeof next !== 'number') break;
        start = next;
      }

      return allDeals;
    } catch (error) {
      throw buildError(error, BitrixDealService.name);
    }
  }

  async listModifiedSince(modifiedSince: string): Promise<BitrixDealFields[]> {
    try {
      const allDeals: BitrixDealFields[] = [];
      let start = 0;

      while (true) {
        const data = await this.client.get<BitrixListResponse<BitrixDealFields>>(
          'crm.deal.list.json',
          {
            params: {
              filter: {
                CATEGORY_ID: [BitrixDealCategory.YANDEX_DELIVERY, BitrixDealCategory.YANDEX_TAXI],
                '>DATE_MODIFY': modifiedSince,
              },
              order: { DATE_MODIFY: 'ASC' },
              select: [
                'ID',
                'CONTACT_ID',
                'DATE_CREATE',
                'DATE_MODIFY',
                'COMMENTS',
                'STAGE_ID',
                'SOURCE_ID',
                'SOURCE_DESCRIPTION',
                'UF_*',
              ],
              start,
            },
          },
        );

        allDeals.push(...(data.result ?? []));

        const next = data.next;
        if (typeof next !== 'number') break;
        start = next;
      }

      return allDeals;
    } catch (error) {
      throw buildError(error, BitrixDealService.name);
    }
  }

  async listByContact(contactId: string | number): Promise<BitrixDealFields[]> {
    try {
      const allDeals: BitrixDealFields[] = [];
      let start = 0;

      while (true) {
        const data = await this.client.get<BitrixListResponse<BitrixDealFields>>(
          'crm.deal.list.json',
          {
            params: {
              filter: {
                CONTACT_ID: contactId,
                CATEGORY_ID: [BitrixDealCategory.YANDEX_DELIVERY, BitrixDealCategory.YANDEX_TAXI],
              },
              order: { ID: 'DESC' },
              select: ['*', 'UF_*'],
              start,
            },
          },
        );

        allDeals.push(...(data.result ?? []));

        const next = data.next;
        if (typeof next !== 'number') break;
        start = next;
      }

      return allDeals;
    } catch (error) {
      throw buildError(error, BitrixDealService.name);
    }
  }

  async create(fields: BitrixDealFields): Promise<number> {
    try {
      const dto: AddBitrixDealDto = { fields };
      const data = await this.client.post<CreateDealResponse>('crm.deal.add.json', dto);
      if (!data.result) throw new Error('Failed to create deal');
      return data.result;
    } catch (error) {
      throw buildError(error, BitrixDealService.name);
    }
  }

  async update(id: string | number, fields: Partial<BitrixDealFields>): Promise<boolean> {
    try {
      const dto: UpdateBitrixDealDto = { id, fields };
      const data = await this.client.post<UpdateEntityResponse>('crm.deal.update.json', dto);
      return data.result || false;
    } catch (error) {
      if (isAxiosError(error)) {
        console.error('updateDeal error:', error?.response?.data || error);
      }
      throw buildError(error, BitrixDealService.name);
    }
  }
}
