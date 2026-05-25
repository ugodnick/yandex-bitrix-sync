import type { BitrixListResponse } from '../common/bitrix-common.type';

/** 1 — исходящий, 2 — входящий, 3 — входящий с переадресацией, 4 — callback, 5 — информационный */
export type BitrixCallType = '1' | '2' | '3' | '4' | '5';

export type BitrixCrmEntityType = 'CONTACT' | 'COMPANY' | 'LEAD';

export interface BitrixCallStatistic {
  ID: string;
  PORTAL_USER_ID: string;
  PORTAL_NUMBER: string;
  PHONE_NUMBER: string;
  CALL_ID: string;
  CALL_DURATION: string;
  CALL_START_DATE: string;
  CALL_FAILED_CODE: string;
  CALL_FAILED_REASON: string;
  CRM_ENTITY_TYPE?: BitrixCrmEntityType;
  CRM_ENTITY_ID?: string;
  CRM_ACTIVITY_ID?: string;
  CALL_TYPE: BitrixCallType;
}

export interface BitrixCallStatisticFilter {
  '>=CALL_START_DATE'?: string;
  '<=CALL_START_DATE'?: string;
  CRM_ENTITY_TYPE?: BitrixCrmEntityType;
  CRM_ENTITY_ID?: string | number;
  PORTAL_USER_ID?: string | number;
  PHONE_NUMBER?: string;
}

export interface BitrixCallStatisticGetParams {
  FILTER?: BitrixCallStatisticFilter;
  SORT?: keyof BitrixCallStatistic | 'CALL_START_DATE';
  ORDER?: 'ASC' | 'DESC';
  start?: number;
}

export type BitrixCallStatisticListResponse = BitrixListResponse<BitrixCallStatistic>;

export interface BitrixUser {
  ID: string;
  NAME?: string;
  LAST_NAME?: string;
  SECOND_NAME?: string;
  EMAIL?: string;
  ACTIVE?: boolean;
}

export type BitrixUserListResponse = BitrixListResponse<BitrixUser>;
