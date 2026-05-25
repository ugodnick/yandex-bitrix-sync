import type { BitrixYesOrNoType } from './bitrix-common.type';

export interface BitrixUserFieldListItem {
  ID?: string;
  VALUE: string;
  DEF?: BitrixYesOrNoType;
  SORT?: string;
  XML_ID?: string;
}

export interface BitrixUserFieldFields {
  FIELD_NAME?: string;
  USER_TYPE_ID?: string;
  XML_ID?: string;
  SORT?: string;
  MULTIPLE?: BitrixYesOrNoType;
  MANDATORY?: BitrixYesOrNoType;
  SHOW_FILTER?: string;
  SHOW_IN_LIST?: BitrixYesOrNoType;
  EDIT_IN_LIST?: BitrixYesOrNoType;
  LIST?: BitrixUserFieldListItem[];
  EDIT_FORM_LABEL?: string | Record<string, string>;
  LIST_COLUMN_LABEL?: string | Record<string, string>;
  LIST_FILTER_LABEL?: string | Record<string, string>;

  [key: string]: unknown;
}

export interface BitrixUserField extends BitrixUserFieldFields {
  ID: string;
  ENTITY_ID: string;
  FIELD_NAME: string;
}

export interface GetUserFieldResponse {
  result: BitrixUserField;
}
