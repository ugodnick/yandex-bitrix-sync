import type {
  AddBitrixContactDto,
  BitrixContactFields,
  BitrixListResponse,
  CreateContactResponse,
  GetContactResponse,
  UpdateBitrixContactDto,
  UpdateEntityResponse,
} from '../bitrix.type';
import { BitrixClient } from '../common/bitrix-client';
import { buildError } from '../common/bitrix-common.utils';

export class BitrixContactService {
  constructor(private readonly client: BitrixClient) {}

  async get(contactId: string | number): Promise<BitrixContactFields | null> {
    try {
      const data = await this.client.get<GetContactResponse>('crm.contact.get.json', {
        params: { id: contactId },
      });
      return data.result || null;
    } catch (error) {
      throw buildError(error, BitrixContactService.name);
    }
  }

  async listByPhone(phone: string): Promise<BitrixContactFields[]> {
    try {
      const data = await this.client.post<BitrixListResponse<BitrixContactFields>>(
        'crm.contact.list.json',
        {
          filter: { PHONE: phone },
          select: ['ID', 'NAME', 'LAST_NAME', 'SECOND_NAME', 'PHONE', 'DATE_MODIFY'],
        },
      );
      return data.result?.length ? data.result : [];
    } catch (error) {
      throw buildError(error, BitrixContactService.name);
    }
  }

  async create(fields: BitrixContactFields): Promise<number> {
    try {
      const dto: AddBitrixContactDto = { fields };
      const data = await this.client.post<CreateContactResponse>('crm.contact.add.json', dto);
      if (!data.result) throw new Error('Failed to create contact');
      return data.result;
    } catch (error) {
      throw buildError(error, BitrixContactService.name);
    }
  }

  async update(id: string | number, fields: Partial<BitrixContactFields>): Promise<boolean> {
    try {
      const dto: UpdateBitrixContactDto = { id, fields };
      const data = await this.client.post<UpdateEntityResponse>('crm.contact.update.json', dto);
      return data.result || false;
    } catch (error) {
      throw buildError(error, BitrixContactService.name);
    }
  }

  async list(): Promise<BitrixContactFields[]> {
    try {
      const all: BitrixContactFields[] = [];
      let start = 0;

      while (true) {
        const data = await this.client.post<BitrixListResponse<BitrixContactFields>>(
          'crm.contact.list.json',
          {
            order: { ID: 'ASC' },
            select: ['ID', 'NAME', 'LAST_NAME', 'SECOND_NAME', 'PHONE'],
            start,
          },
        );

        all.push(...(data.result ?? []));

        const next = data.next;
        if (typeof next !== 'number') break;
        start = next;
      }

      return all;
    } catch (error) {
      throw buildError(error, BitrixContactService.name);
    }
  }

  async listModifiedSince(modifiedSince: string): Promise<BitrixContactFields[]> {
    try {
      const all: BitrixContactFields[] = [];
      let start = 0;

      while (true) {
        const data = await this.client.post<BitrixListResponse<BitrixContactFields>>(
          'crm.contact.list.json',
          {
            filter: { '>DATE_MODIFY': modifiedSince },
            order: { DATE_MODIFY: 'ASC' },
            select: ['ID', 'NAME', 'LAST_NAME', 'SECOND_NAME', 'PHONE', 'DATE_MODIFY'],
            start,
          },
        );

        all.push(...(data.result ?? []));

        const next = data.next;
        if (typeof next !== 'number') break;
        start = next;
      }

      return all;
    } catch (error) {
      throw buildError(error, BitrixContactService.name);
    }
  }
}
