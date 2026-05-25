import type { BitrixUserField, BitrixUserFieldFields } from './bitrix-userfield.type';
import type { GetUserFieldResponse, UpdateEntityResponse } from '../bitrix.type';
import { BitrixClient } from './bitrix-client';
import { buildError } from './bitrix-common.utils';

export class BitrixUserFieldService {
  constructor(private readonly client: BitrixClient) {}

  async get(id: string | number): Promise<BitrixUserField> {
    try {
      const data = await this.client.get<GetUserFieldResponse>('crm.userfield.get.json', {
        params: { id },
      });
      if (!data.result) throw new Error('UserField not found');
      return data.result;
    } catch (error) {
      throw buildError(error, BitrixUserFieldService.name);
    }
  }

  async update(id: string | number, fields: Partial<BitrixUserFieldFields>): Promise<boolean> {
    try {
      const data = await this.client.post<UpdateEntityResponse>('crm.userfield.update.json', {
        id,
        fields,
      });
      return data.result || false;
    } catch (error) {
      throw buildError(error, BitrixUserFieldService.name);
    }
  }
}
