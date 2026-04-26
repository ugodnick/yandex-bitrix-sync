export type BitrixYesOrNoType = 'Y' | 'N';

export enum BitrixDealCategory {
  BLOCK = 1,
  YANDEX_DELIVERY = 3,
  YANDEX_TAXI = 5,
  YANDEX_EAT = 7,
}

export const BITRIX_CATEGORY_STAGE = {
  [BitrixDealCategory.YANDEX_DELIVERY]: {
    NotProcessed: 'C3:NEW',
    NewLead: 'C3:UC_3Q3VT7',
    TakenToWork: 'C3:PREPARATION',
    Ndz: 'C3:UC_L3KDM6',
    Thinking: 'C3:UC_LW45DH',
    DocumentCollection: 'C3:PREPAYMENT_INVOICE',
    TransferToSmz: 'C3:UC_2CL0T5',
    OutputFor1Order: 'C3:UC_46LTTM',
    NdzNotComeOut: 'C3:UC_023RU4',
    Orders25: 'C3:UC_N3IZNW',
    Working: 'C3:UC_M9CKHN',
    Outflow: 'C3:UC_O9PXU5',
    Pause: 'C3:UC_NFJLN9',
    Cold: 'C3:UC_S71G81',
    Archive: 'C3:UC_242CHI',
    Cps: 'C3:UC_ED0AAW',
    Duplicates: 'C3:UC_1A121F',
    DoNotClick: 'C3:WON',
    SpamAdvertisingIlliquid: 'C3:LOSE',
    Refusal: 'C3:APOLOGY',
  },
  [BitrixDealCategory.YANDEX_TAXI]: {
    NotProcessed: 'C5:NEW',
    TakenToWork: 'C5:PREPARATION',
    Thinking: 'C5:PREPAYMENT_INVOICE',
    NdzLid: 'C5:EXECUTING',
    DocumentCollection: 'C5:FINAL_INVOICE',
    TransferToSmz: 'C5:UC_XV3P8H',
    Output: 'C5:UC_RREXQ0',
    NdzNotComeOut: 'C5:UC_BB8B8W',
    Working: 'C5:UC_QKD6SW',
    Outflow: 'C5:UC_OUUMS0',
    Pause: 'C5:UC_QF9VUT',
    Cold: 'C5:UC_QOQVBZ',
    Archive: 'C5:UC_O5OZKJ',
    Duplicates: 'C5:UC_S1PJEX',
    DoNotClick: 'C5:WON',
    SpamAdvertisingIlliquid: 'C5:LOSE',
    Refusal: 'C5:APOLOGY',
  },
} as const;

export interface CrmMultifield {
  ID?: string;
  VALUE_TYPE: 'WORK' | 'HOME' | 'MOBILE' | 'OTHER';
  VALUE: string;
}

export const BITRIX_DICT = {
  AGGREGATOR: {
    YANDEX: 185,
    KUPER: 57,
    YANDEX_EDA: 59,
    YANDEX_MARKET: 61,
    YANDEX_DELIVERY: 55,
  },
  VACANCY: {
    TAXI: 45,
    AUTO_COURIER: 47,
    FOOT_BIKE: 49,
    MOTO: 51,
    CARGO: 53,
  },
  WORK_TYPE: {
    SELF_EMPLOYED: 299,
    YANDEX: 303,
    REGULAR: 301,
  },
  CITIZENSHIP: {
    RU: 305,
    BY: 307,
    AM: 309,
    AZ: 311,
    KG: 313,
    TJ: 315,
    TM: 317,
    UA: 319,
  },
  DEVICE_TYPE: {
    PIP: 75,
    PSMZ: 73,
    PARK_FL: 183,
  },
  CAR_OWNER: {
    PARK: 291,
    OWN: 293,
    OTHER: 295,
  },
  VEHICLE_TYPE: {
    CAR: 237,
    TRUCK: 297,
    NONE: 239,
  },
  COLOR: {
    YELLOW: 241,
    WHITE: 243,
    BLACK: 245,
    GRAY: 247,
    RED: 249,
    BLUE: 251,
    LIGHT_BLUE: 253,
    BROWN: 255,
    GREEN: 257,
    PINK: 259,
    ORANGE: 261,
    PURPLE: 263,
    BEIGE: 265,
  },
  TRANSMISSION: {
    UNKNOWN: 267,
    MANUAL: 269,
    AUTOMATIC: 271,
    ROBOT: 273,
    CVT: 275,
  },
  FUEL_TYPE: {
    PROPANE: 277,
    ELECTRIC: 279,
    METHANE: 281,
    DIESEL: 283,
    HYBRID: 285,
    GASOLINE: 287,
  },
  EQUIPMENT: {
    AIR_CONDITIONING: 289,
  },
  DL_COUNTRY_ISSUED: {
    RU: 209,
    BY: 211,
    GE: 213,
    KZ: 215,
    KG: 217,
    OTHER: 219,
    TJ: 221,
    UA: 223,
  },
  DISPATCHER_OFFICE: {
    OFFICE_1: 225,
    OFFICE_2: 227,
    OFFICE_3: 229,
    OFFICE_4: 231,
    OFFICE_5: 233,
    OFFICE_6: 235,
  },
  TAGS: {
    NEW_CONTRACTOR: 99,
    PAID_HIRING: 101,
    FARPOST: 181,
  },
  CONTRACTOR_TYPE: {
    BICYCLE_FOOT_COURIER: 193,
    AUTO_COURIER: 195,
    MOTO_COURIER: 197,
    CARGO_DRIVER: 199,
    TAXI_DRIVER: 201,
  },
  EMPLOYMENT_TYPE: {
    PARK_COURIER: 203,
    PARK_IE: 205, // IE = Individual Entrepreneur (ИП)
    PARK_SELF_EMPLOYED: 207,
  },
  TAX_SYSTEM_TYPE: {
    OSN: '411',
    USN: '413',
    AUSN: '415',
    USNP: '417',
    OSNP: '419',
  },
} as const;

export const BITRIX_FIELDS = {
  AGGREGATOR: 'UF_CRM_DEAL_AMO_IGHUADVXRFETNKRD',
  DISPATCHER: 'UF_CRM_DEAL_AMO_VNHFTYGLHHNXQTIH',
  PROFILE_LINK: 'UF_CRM_1775200923',
  WORK_TYPE: 'UF_CRM_1775200059',
  CITIZENSHIP: 'UF_CRM_1775210220',
  CITY: 'UF_CRM_DEAL_AMO_CNMDHSPPDMMIVQPM',
  VACANCY: 'UF_CRM_DEAL_AMO_WOJMCZXFTEVHTKZI',
  DEVICE_TYPE: 'UF_CRM_DEAL_AMO_SXQYDRVQIHXHYESS',
  LENGTH: 'UF_CRM_1766827367',
  HEIGHT: 'UF_CRM_1766827378',
  WIDTH: 'UF_CRM_1766827391',
  LOAD_CAPACITY: 'UF_CRM_1766827411',
  PHONE_DISP: 'UF_CRM_1766827874',
  CAR_OWNER: 'UF_CRM_1766827313',
  VEHICLE_TYPE: 'UF_CRM_1766826701',
  STS: 'UF_CRM_1766826858',
  LICENSE_PLATE: 'UF_CRM_1766826867',
  BRAND: 'UF_CRM_1766826897',
  MODEL: 'UF_CRM_1766826906',
  YEAR: 'UF_CRM_1766826936',
  COLOR: 'UF_CRM_1766827125',
  TRANSMISSION: 'UF_CRM_1766827170',
  FUEL_TYPE: 'UF_CRM_1766827230',
  EQUIPMENT: 'UF_CRM_1766827274',
  PATRONYMIC_DISP: 'UF_CRM_1766826369',
  ADDRESS_DISP: 'UF_CRM_1766826394',
  DRIVING_EXPERIENCE: 'UF_CRM_1766826416',
  DL_SERIES_NUMBER: 'UF_CRM_1766826463',
  DL_ISSUE_DATE: 'UF_CRM_1766826585',
  DL_EXPIRY_DATE: 'UF_CRM_1766826601',
  DISPATCHER_OFFICE: 'UF_CRM_1766826638',
  DL_COUNTRY_ISSUED: 'UF_CRM_1766826564',
  TAGS: 'UF_CRM_DEAL_AMO_LTSGJWGJXCMCTVWV',
  FIRST_NAME_DISP: 'UF_CRM_1761978985',
  LAST_NAME_DISP: 'UF_CRM_1763113602',
  PHONE_SYSTEM: 'UF_CRM_1763113648',
  CONTRACTOR_TYPE: 'UF_CRM_1766826249',
  EMPLOYMENT_TYPE: 'UF_CRM_1766826299',
  HIRE_DATE: 'UF_CRM_1776160158',
  ORDER_PROVIDER_PLATFORM: 'UF_CRM_1776160521',
  ORDER_PROVIDER_PARTNER: 'UF_CRM_1776160464',
  BALANCE_LIMIT: 'UF_CRM_1776661913',
  VIN: 'UF_CRM_1776668063',
  PROFILE_ID: 'UF_CRM_1776687357',
  TAX_SYSTEM_TYPE: 'UF_CRM_1776749434',
  BIRTH_DATE: 'UF_CRM_1775210097',
} as const;

export const BITRIX_TO_YANDEX_PARK: Record<string, string> = {
  '321': '', // ГЛОРИАН (Я.Такси Владивосток)
  '323': '', // КАРАТ (Я.Такси Хабаровск)
  '77': '', // КАРАВАН (Я.Такси Саратов)
  '327': '', // ФАРТCAR (Я.Такси Саратов)
  '85': '', // АЛЬФА (Я.Маркет Авто/Грузовое ЛюбойГород)
  '95': '30ca63b508454371b9deb252b3306083', // ФИШТ (Я.Доставка Авто Владивосток)
  '97': '89a42a3a9a964fff9c41fd076fd09c6c', // ЭВЕРЕСТ (Я.Доставка Пеший Владивосток)
  '83': 'bf157cfe3a914fda817b1d2dde37ada1', // ДЖИМАРА (Я.Доставка Авто Хабаровск)
  '91': '35c53a402f8b4f04a8806e68da798f20', // МИЖИРГИ (Я.Доставка Пеший Хабаровск)
  '87': 'c1af957f21b844868adc314f0e24e985', // БЕЛУХА (Я.Доставка Пеший/Авто Уссурийск)
  '335': '9ac02ba7e5174c10b401cfb7dfdaa894', // ДАУТАЙ (Я.Доставка Пеший/Авто Благовещенск)
  '79': '8b99022cd8a24f8782fc19feff7a45e2', // ПРОФИЛОГИСТИК (Я.Доставка Пеший/Авто Саратов)
  '81': '', // МАГИСТРАЛЬ (Я.Доставка Грузовое ЛюбойГород)
  '89': '', // КАПЕЛЛА (Я.Доставка Пеший/Авто Самара)
  '93': '', // СИРИУС (Я.Доставка Пеший/Авто Новосибирск)
  '325': '', // ПРОЦИОН (Я.Доставка Пеший/Авто Челябинск)
  '329': '', // ВЕГА (Я.Доставка Пеший/Авто Сочи)
  '331': '', // АНТАРЕС (Я.Доставка Пеший/Авто Тула)
  '333': '8ddb58b306774e458fc7d24203c36c14', // АРКТУР (Я.Доставка Пеший/Авто Омск)
  '337': '', // ОРИОН (Я.Доставка Пеший/Авто Иркутск)
} as const;

export const YANDEX_TO_BITRIX_PARK: Record<string, string> = {
  '8ddb58b306774e458fc7d24203c36c14': '333',
  bf157cfe3a914fda817b1d2dde37ada1: '83',
  '8b99022cd8a24f8782fc19feff7a45e2': '79',
  '30ca63b508454371b9deb252b3306083': '95',
  '89a42a3a9a964fff9c41fd076fd09c6c': '97',
  '35c53a402f8b4f04a8806e68da798f20': '91',
  c1af957f21b844868adc314f0e24e985: '87',
  '9ac02ba7e5174c10b401cfb7dfdaa894': '335',
} as const;

export const YANDEX_DELIVERY_PARKS = [
  'bf157cfe3a914fda817b1d2dde37ada1',
  '8b99022cd8a24f8782fc19feff7a45e2',
  '8ddb58b306774e458fc7d24203c36c14',
  '30ca63b508454371b9deb252b3306083',
  '89a42a3a9a964fff9c41fd076fd09c6c',
  '35c53a402f8b4f04a8806e68da798f20',
  'c1af957f21b844868adc314f0e24e985',
  '9ac02ba7e5174c10b401cfb7dfdaa894',
];

export const YANDEX_TAXI_PARKS = [''];

export interface BitrixDealFields {
  ID?: string;
  TITLE?: string;
  TYPE_ID?: string;
  CATEGORY_ID?: BitrixDealCategory;
  STAGE_ID?: string;
  IS_RECURRING?: BitrixYesOrNoType;
  PROBABILITY?: number;
  CURRENCY_ID?: 'RUB';
  OPPORTUNITY?: number;
  COMPANY_ID?: number;
  CONTACT_ID?: number;
  CONTACT_IDS?: number[];
  BEGINDATE?: string;
  CLOSEDATE?: string;
  OPENED?: BitrixYesOrNoType;
  CLOSED?: BitrixYesOrNoType;
  COMMENTS?: string;
  SOURCE_ID?: string;
  SOURCE_DESCRIPTION?: string;
  DATE_CREATE?: string;

  [key: `UF_${string}`]: string | number | undefined | number[] | string[] | boolean;
}

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

export interface AddBitrixDealDto {
  fields: BitrixDealFields;
  params?: { REGISTER_SONET_EVENT: BitrixYesOrNoType };
}

export interface UpdateBitrixDealDto {
  id: string | number;
  fields: Partial<BitrixDealFields>;
  params?: { REGISTER_SONET_EVENT: BitrixYesOrNoType };
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

export interface BitrixRestResponse<T> {
  result?: T;
  error?: string;
  error_description?: string;
}

export type CreateDealResponse = BitrixRestResponse<number>;
export type CreateContactResponse = BitrixRestResponse<number>;
export type GetContactResponse = BitrixRestResponse<BitrixContactFields>;
export type GetDealResponse = BitrixRestResponse<BitrixDealFields>;
export type UpdateEntityResponse = BitrixRestResponse<boolean>;

export enum BitrixCrmEvent {
  ONCRMCONTACTADD = 'ONCRMCONTACTADD',
  ONCRMCONTACTUPDATE = 'ONCRMCONTACTUPDATE',
  ONCRMDEALADD = 'ONCRMDEALADD',
  ONCRMDEALUPDATE = 'ONCRMDEALUPDATE',
}

export interface BitrixCrmWebhookBody {
  event: BitrixCrmEvent;
  data: {
    FIELDS: {
      ID: string;
    };
  };
  ts: string;
  auth: {
    domain: string;
    client_endpoint: string;
    server_endpoint: string;
    member_id: string;
    application_token: string;
  };
}

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

export type BitrixListResponse<T> = {
  result: T[];
  total: number;
  next?: number;
  time: {
    /* ... */
  };
};
