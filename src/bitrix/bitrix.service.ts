import type { BitrixContactFields, BitrixDealFields, BitrixUserFieldFields } from './bitrix.type';
import { BitrixCallService } from './call/bitrix-call.service';
import { BitrixClient } from './common/bitrix-client';
import { BitrixUserFieldService } from './common/bitrix-userfield.service';
import { BitrixContactService } from './contact/bitrix-contact.service';
import { BitrixDealService } from './deal/bitrix-deal.service';

export class BitrixService {
  readonly client: BitrixClient;
  readonly contacts: BitrixContactService;
  readonly deals: BitrixDealService;
  readonly calls: BitrixCallService;
  readonly userFields: BitrixUserFieldService;

  constructor(inboundWebhookUrl: string) {
    this.client = new BitrixClient(inboundWebhookUrl);
    this.contacts = new BitrixContactService(this.client);
    this.deals = new BitrixDealService(this.client);
    this.calls = new BitrixCallService(this.client);
    this.userFields = new BitrixUserFieldService(this.client);
  }

  getContact(contactId: string | number): Promise<BitrixContactFields | null> {
    return this.contacts.get(contactId);
  }

  getContactsByPhone(phone: string): Promise<BitrixContactFields[]> {
    return this.contacts.listByPhone(phone);
  }

  createContact(fields: BitrixContactFields): Promise<number> {
    return this.contacts.create(fields);
  }

  updateContact(id: string | number, fields: Partial<BitrixContactFields>): Promise<boolean> {
    return this.contacts.update(id, fields);
  }

  getDeal(id: string | number): Promise<BitrixDealFields> {
    return this.deals.get(id);
  }

  getDealsByContact(contactId: string | number): Promise<BitrixDealFields[]> {
    return this.deals.listByContact(contactId);
  }

  createDeal(fields: BitrixDealFields): Promise<number> {
    return this.deals.create(fields);
  }

  updateDeal(id: string | number, fields: Partial<BitrixDealFields>): Promise<boolean> {
    return this.deals.update(id, fields);
  }

  deleteDeal(id: string | number): Promise<boolean> {
    return this.deals.delete(id);
  }

  getUserField(id: string | number) {
    return this.userFields.get(id);
  }

  updateUserField(id: string | number, fields: Partial<BitrixUserFieldFields>) {
    return this.userFields.update(id, fields);
  }

  listContacts() {
    return this.contacts.list();
  }

  listContactsModifiedSince(modifiedSince: string) {
    return this.contacts.listModifiedSince(modifiedSince);
  }

  listDeals() {
    return this.deals.list();
  }

  listDealsModifiedSince(modifiedSince: string) {
    return this.deals.listModifiedSince(modifiedSince);
  }

  listCallsForPeriod(from: string, to?: string) {
    return this.calls.listStatisticsForPeriod(from, to);
  }

  listUsers() {
    return this.calls.listUsers();
  }
}
