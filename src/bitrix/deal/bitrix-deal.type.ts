import type { BitrixRestResponse, BitrixYesOrNoType } from '../common/bitrix-common.type';

export enum BitrixDealCategory {
  BLOCK = '1',
  YANDEX_DELIVERY = '3',
  YANDEX_TAXI = '5',
  YANDEX_EAT = '7',
}

export const BITRIX_CATEGORY_STAGE = {
  [BitrixDealCategory.YANDEX_DELIVERY]: {
    NotProcessed: 'C3:NEW',
    TakenToWork: 'C3:PREPARATION',
    CallBack: 'C3:UC_C44UC0',
    NdzLead: 'C3:UC_8UHKSK',
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
    CallBack: 'C5:UC_1CV6CN',
    NdzLead: 'C5:EXECUTING',
    Thinking: 'C5:PREPAYMENT_INVOICE',
    DocumentCollection: 'C5:FINAL_INVOICE',
    TransferToSmz: 'C5:UC_XV3P8H',
    OutputFor1Order: 'C5:UC_RREXQ0',
    NdzNotComeOut: 'C5:UC_BB8B8W',
    Orders25: 'C5:UC_LRRSRU',
    Working: 'C5:UC_QKD6SW',
    Outflow: 'C5:UC_OUUMS0',
    Pause: 'C5:UC_QF9VUT',
    Cold: 'C5:UC_QOQVBZ',
    Archive: 'C5:UC_O5OZKJ',
    Cps: 'C5:UC_5QN2WO',
    Duplicates: 'C5:UC_S1PJEX',
    DoNotClick: 'C5:WON',
    SpamAdvertisingIlliquid: 'C5:LOSE',
    Refusal: 'C5:APOLOGY',
  },
  [BitrixDealCategory.YANDEX_EAT]: {
    NotProcessed: 'C7:NEW',
    TakenToWork: 'C7:PREPARATION',
    CallBack: 'C7:UC_4O4NHS',
    NdzLead: 'C7:UC_GZC3QD',
    Thinking: 'C7:UC_K9LIFT',
    DocumentCollection: 'C7:UC_XFJY1L',
    TransferToSmz: 'C7:UC_13XQNY',
    OutputFor1Order: 'C7:PREPAYMENT_INVOICE',
    NdzNotComeOut: 'C7:UC_1VKBOE',
    Orders25: 'C7:UC_PLVLY1',
    Orders100: 'C7:FINAL_INVOICE',
    Working: 'C7:EXECUTING',
    Outflow: 'C7:UC_UHX615',
    Pause: 'C7:UC_JXBOZZ',
    Cold: 'C7:UC_I5X7LC',
    Archive: 'C7:UC_LO4AMW',
    Cps: 'C7:UC_AWXGHS',
    Duplicates: 'C7:UC_6V0CHE',
    DoNotClick: 'C7:WON',
    SpamAdvertisingIlliquid: 'C7:LOSE',
    Refusal: 'C7:APOLOGY',
  },
} as const;

export const BITRIX_DICT = {
  AGGREGATOR: {
    KUPER: 57,
    YANDEX_EDA: 59,
    YANDEX_MARKET: 61,
    YANDEX_DELIVERY: 55,
    YANDEX_TAXI: 185,
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
  SOURCE: {
    FARPOST: 'CALL',
    AVITO: 'WEBFORM',
    HH: 'CALLBACK',
    GIS2: 'RC_GENERATOR',
    LANDING: 'STORE',
    CENTER_KHABAROVSK: 'BOOKING',
    CENTER_VLADIVOSTOK: 'UC_GY9WRM',
    REPEAT_SALE: 'REPEAT_SALE',
    BEELINE_ATS: '9098503000',
    WAZZUP_MAX: '7|WZ_MAX_CONNEC42626B277BBC53919DAFF17F3A95697D',
    WHATCRM_TELEGRAM: '5|TELEGRAM_WHATCRM_NET_71183544',
    REFERRAL: 'UC_TT8C5Y',
    MAX_PHONE: 'WZ10ec9c4a-0952-47cf-bc83-b4e8113e9281',
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
  DATE_MODIFY?: string;

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

export type CreateDealResponse = BitrixRestResponse<number>;
export type GetDealResponse = BitrixRestResponse<BitrixDealFields>;
