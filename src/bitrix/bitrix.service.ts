import axios, { AxiosInstance, isAxiosError } from 'axios';
import {
  AddBitrixContactDto,
  AddBitrixDealDto,
  BITRIX_FIELDS,
  BitrixContactFields,
  BitrixDealFields,
  BitrixUserField,
  BitrixUserFieldFields,
  CreateContactResponse,
  CreateDealResponse,
  GetContactResponse,
  GetDealResponse,
  GetUserFieldResponse,
  UpdateBitrixContactDto,
  UpdateBitrixDealDto,
  UpdateEntityResponse,
} from './bitrix.type';
import { buildError } from './bitrix.utils';

export class BitrixService {
  private client: AxiosInstance;
  private lastRequestTime = 0;
  private readonly REQUEST_DELAY_MS = 500;

  constructor(inboundWebhookUrl: string) {
    const baseURL = inboundWebhookUrl.endsWith('/') ? inboundWebhookUrl : `${inboundWebhookUrl}/`;

    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(async (config) => {
      const now = Date.now();
      const timeToWait = Math.max(0, this.REQUEST_DELAY_MS - (now - this.lastRequestTime));

      if (timeToWait > 0) {
        await new Promise((resolve) => setTimeout(resolve, timeToWait));
      }

      this.lastRequestTime = Date.now();
      return config;
    });
  }

  async getContact(contactId: string | number): Promise<BitrixContactFields> {
    let data: GetContactResponse;

    try {
      const response = await this.client.get<GetContactResponse>('crm.contact.get.json', {
        params: { id: contactId },
      });
      data = response.data;
    } catch (error) {
      throw buildError(error, BitrixService.name);
    }

    if (!data.result) throw new Error('Contact not found');

    return data.result;
  }

  async createContact(fields: BitrixContactFields): Promise<number> {
    let data: CreateContactResponse;
    try {
      const dto: AddBitrixContactDto = { fields };
      const response = await this.client.post<CreateContactResponse>('crm.contact.add.json', dto);
      data = response.data;
    } catch (error) {
      throw buildError(error, BitrixService.name);
    }

    if (!data.result) throw new Error('Failed to create contact');

    return data.result;
  }

  async updateContact(id: string | number, fields: Partial<BitrixContactFields>): Promise<boolean> {
    let data: UpdateEntityResponse;
    try {
      const dto: UpdateBitrixContactDto = { id, fields };
      const response = await this.client.post<UpdateEntityResponse>('crm.contact.update.json', dto);
      data = response.data;
    } catch (error) {
      throw buildError(error, BitrixService.name);
    }

    return data.result || false;
  }

  async createDeal(fields: BitrixDealFields): Promise<number> {
    let data: CreateDealResponse;
    try {
      const dto: AddBitrixDealDto = { fields };
      const response = await this.client.post<CreateDealResponse>('crm.deal.add.json', dto);
      data = response.data;
    } catch (error) {
      throw buildError(error, BitrixService.name);
    }

    if (!data.result) throw new Error('Failed to create deal');

    return data.result;
  }

  async updateDeal(id: string | number, fields: Partial<BitrixDealFields>): Promise<boolean> {
    let data: UpdateEntityResponse;
    try {
      const dto: UpdateBitrixDealDto = { id, fields };
      const response = await this.client.post<UpdateEntityResponse>('crm.deal.update.json', dto);
      data = response.data;
    } catch (error) {
      if (isAxiosError(error)) {
        console.error('updateDeal error:', error?.response?.data || error);
      }

      throw buildError(error, BitrixService.name);
    }

    return data.result || false;
  }

  async getDeal(id: string | number): Promise<BitrixDealFields> {
    let data: GetDealResponse;

    try {
      const response = await this.client.get<GetDealResponse>('crm.deal.get.json', {
        params: { id },
      });
      data = response.data;
    } catch (error) {
      throw buildError(error, BitrixService.name);
    }

    if (!data.result) throw new Error('Deal not found');

    return data.result;
  }

  async getLatestDealByContact(contactId: string | number): Promise<BitrixDealFields | null> {
    try {
      const response = await this.client.get('crm.deal.list.json', {
        params: {
          filter: { CONTACT_ID: contactId },
          order: { ID: 'DESC' },
          select: ['*', BITRIX_FIELDS.AGGREGATOR, BITRIX_FIELDS.DISPATCHER, BITRIX_FIELDS.VACANCY],
        },
      });

      const deals = response.data.result;
      return deals && deals.length > 0 ? deals[0] : null;
    } catch (error) {
      throw buildError(error, BitrixService.name);
    }
  }

  async getUserField(id: string | number): Promise<BitrixUserField> {
    let data: GetUserFieldResponse;

    try {
      const response = await this.client.get<GetUserFieldResponse>('crm.userfield.get.json', {
        params: { id },
      });
      data = response.data;
    } catch (error) {
      throw buildError(error, BitrixService.name);
    }

    if (!data.result) throw new Error('UserField not found');

    return data.result;
  }

  async updateUserField(id: string | number, fields: Partial<BitrixUserFieldFields>) {
    let data: UpdateEntityResponse;

    try {
      const dto = { id, fields };
      const response = await this.client.post<UpdateEntityResponse>(
        'crm.userfield.update.json',
        dto,
      );
      data = response.data;
    } catch (error) {
      throw buildError(error, BitrixService.name);
    }

    return data.result;
  }
}
