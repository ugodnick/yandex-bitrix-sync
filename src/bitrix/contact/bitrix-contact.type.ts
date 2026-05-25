import type {
  BitrixRestResponse,
  BitrixYesOrNoType,
  CrmMultifield,
} from '../common/bitrix-common.type';

export interface BitrixContactFields {
  ID?: string;
  NAME?: string;
  SECOND_NAME?: string;
  LAST_NAME?: string;
  BIRTHDATE?: string;
  TYPE_ID?: string;
  SOURCE_ID?: string;
  SOURCE_DESCRIPTION?: string;
  POST?: string;
  COMMENTS?: string;
  OPENED?: BitrixYesOrNoType;
  EXPORT?: BitrixYesOrNoType;
  ASSIGNED_BY_ID?: number;
  COMPANY_ID?: number;
  COMPANY_IDS?: number[];
  PHONE?: CrmMultifield[];
  EMAIL?: CrmMultifield[];

  [key: `UF_${string}`]: string | number | undefined | number[] | string[] | boolean;
}

export interface AddBitrixContactDto {
  fields: BitrixContactFields;
  params?: { REGISTER_SONET_EVENT: BitrixYesOrNoType };
}

export interface UpdateBitrixContactDto {
  id: string | number;
  fields: Partial<BitrixContactFields>;
  params?: { REGISTER_SONET_EVENT: BitrixYesOrNoType };
}

export type CreateContactResponse = BitrixRestResponse<number>;
export type GetContactResponse = BitrixRestResponse<BitrixContactFields>;
