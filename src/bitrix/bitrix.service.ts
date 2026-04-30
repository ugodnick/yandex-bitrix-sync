import axios, { AxiosInstance, isAxiosError } from 'axios';
import {
  AddBitrixContactDto,
  AddBitrixDealDto,
  BitrixContactFields,
  BitrixDealCategory,
  BitrixDealFields,
  BitrixListResponse,
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
  private readonly REQUEST_DELAY_MS = 700;

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

  async getContact(contactId: string | number): Promise<BitrixContactFields | null> {
    let data: GetContactResponse;

    try {
      const response = await this.client.get<GetContactResponse>('crm.contact.get.json', {
        params: { id: contactId },
      });
      data = response.data;
    } catch (error) {
      throw buildError(error, BitrixService.name);
    }

    return data.result || null;
  }

  async getContactsByPhone(phone: string): Promise<BitrixContactFields[]> {
    let data: BitrixListResponse<BitrixContactFields>;

    try {
      const response = await this.client.post<BitrixListResponse<BitrixContactFields>>(
        'crm.contact.list.json',
        {
          filter: {
            PHONE: phone,
          },
          select: ['ID', 'NAME', 'LAST_NAME', 'PHONE', 'EMAIL', 'ASSIGNED_BY_ID'],
        },
      );
      data = response.data;
    } catch (error) {
      throw buildError(error, BitrixService.name);
    }

    if (!data.result || data.result.length === 0) return [];

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

  async getDealsByContact(contactId: string | number): Promise<BitrixDealFields[]> {
    try {
      const allDeals: BitrixDealFields[] = [];
      let start = 0;

      while (true) {
        const response = await this.client.get('crm.deal.list.json', {
          params: {
            filter: { CONTACT_ID: contactId, CATEGORY_ID: BitrixDealCategory.YANDEX_DELIVERY },
            order: { ID: 'DESC' },
            select: ['*', 'UF_*'],
            start,
          },
        });

        const deals: BitrixDealFields[] = response.data.result ?? [];
        allDeals.push(...deals);

        const next = response.data.next;
        if (typeof next !== 'number') break;
        start = next;
      }

      return allDeals;
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
