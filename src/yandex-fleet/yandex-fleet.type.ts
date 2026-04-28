export enum YandexDriverProfessionType {
  TaxiDriver = 'taxi/driver',
  CargoCourierOnFoot = 'cargo/courier/on-foot',
  CargoCourierOnCar = 'cargo/courier/on-car',
  CargoCourierOnTruck = 'cargo/courier/on-truck',
  CargoCourierOnMotorcycle = 'cargo/courier/on-motorcycle',
}

export interface YandexFleetDriverProfileAccount {
  id: string;
  type: 'current';
  balance: string;
  balance_limit: string;
  currency: string;
}

export enum VehicleAmenities {
  Conditioner = 'conditioner',
  NoSmoking = 'no_smoking',
  ChildChair = 'child_chair',
  AnimalTransport = 'animal_transport',
  Universal = 'universal',
  Wifi = 'wifi',
  Check = 'check',
  Card = 'card',
  YaMoney = 'yamoney',
  Newspaper = 'newspaper',
  Coupon = 'coupon',
  CreditCard = 'creditcard',
  DontCall = 'dont_call',
  Smoking = 'smoking',
  Delivery = 'delivery',
  VipEvent = 'vip_event',
  WomanDriver = 'woman_driver',
  PostTerminal = 'post_terminal',
  Bicycle = 'bicycle',
  Skiing = 'skiing',
  PassengerPlus = 'passenger_plus',
  CargoClear = 'cargo_clean',
  DoorToDoor = 'door_to_door',
  Sticker = 'sticker',
  Lightbox = 'lightbox',
}

export type VehicleCategory =
  | 'econom'
  | 'comfort'
  | 'comfort_plus'
  | 'business'
  | 'minivan'
  | 'vip'
  | 'wagon'
  | 'pool'
  | 'start'
  | 'standart'
  | 'ultimate'
  | 'maybach'
  | 'promo'
  | 'premium_van'
  | 'premium_suv'
  | 'suv'
  | 'personal_driver'
  | 'express'
  | 'cargo';

export enum VehicleColor {
  White = 'Белый',
  Yellow = 'Желтый',
  Beige = 'Бежевый',
  Black = 'Черный',
  LightBlue = 'Голубой',
  Gray = 'Серый',
  Red = 'Красный',
  Orange = 'Оранжевый',
  Blue = 'Синий',
  Green = 'Зеленый',
  Brown = 'Коричневый',
  Purple = 'Фиолетовый',
  Pink = 'Розовый',
}

export type VehicleStatus =
  | 'unknown'
  | 'working'
  | 'not_working'
  | 'repairing'
  | 'no_driver'
  | 'pending';

export interface YandexFleetVehicle {
  id: string;
  status: VehicleStatus;
  amenities?: VehicleAmenities[];
  category?: VehicleCategory[];
  callsign?: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: VehicleColor;
  number?: string;
  registration_cert?: string;
  vin?: string;
}

export type DriverStatus = 'offline' | 'busy' | 'free' | 'in_order_free' | 'in_order_busy';

export interface YandexFleetDriverProfileCurrentStatus {
  status: DriverStatus;
  status_updated_at: string;
}

export enum EmploymentType {
  SelfEmployed = 'selfemployed',
  ParkEmployee = 'park_employee',
  IndividualEntrepreneur = 'individual_entrepreneur',
}

export enum CountryCode {
  RU = 'rus',
  BY = 'blr',
  KZ = 'kaz',
  KG = 'kgz',
  TJ = 'tjk',
  UA = 'ukr',
  GE = 'geo',
}

export interface YandexFleetDriverProfileModel {
  id: string;
  park_id: string;
  created_date: string;
  last_name: string;
  first_name: string;
  middle_name?: string;
  driver_license: {
    issue_date: string;
    expiration_date: string;
    number: string;
    normalized_number?: string;
    country: CountryCode;
    birth_date: string;
  };
  phones: string[];
  work_rule_id: string;
  work_status: DriverWorkStatus;
  check_message?: string;
  comment?: string;
  employment_type?: EmploymentType;
  has_contract_issue?: boolean;
}

export interface YandexFleetDriverProfileItem {
  accounts: Array<YandexFleetDriverProfileAccount>;
  car?: YandexFleetVehicle;
  current_status: YandexFleetDriverProfileCurrentStatus;
  driver_profile: YandexFleetDriverProfileModel;
}

export interface YandexDriverProfileResponse {
  limit: number;
  offset: number;
  total: number;
  driver_profiles: Array<YandexFleetDriverProfileItem>;
  parks: Array<{
    id: string | null;
    city: string;
    name: string;
  }>;
}

export interface YandexWorkRule {
  id: string;
  is_enabled: boolean;
  name: string;
}

export interface YandexFleetAccount {
  balance_limit: string;
  work_rule_id: string;
  payment_service_id?: string;
  block_orders_on_balance_below_limit: boolean;
}

export interface YandexFleetContractor {
  account: YandexFleetAccount;
  person: {
    full_name: {
      first_name: string;
      middle_name?: string;
      last_name: string;
    };
    contact_info: {
      address: string;
      email?: string;
      phone: string;
    };
    driver_license: {
      birth_date: string;
      country: CountryCode;
      expiry_date: string;
      issue_date: string;
      number: string;
    };
    driver_license_experience: {
      total_since_date: string;
    };
    id_doc?: {
      address?: string;
    };
    tax_identification_number?: string;
  };
  profile: {
    hire_date: string;
    comment?: string;
  };
  car_id?: string;
  order_provider: {
    platform: boolean;
    partner: boolean;
  };
}

export interface EmployeeBase<T = EmploymentType> {
  type: T;
}

export type ParkEmployee = EmployeeBase<EmploymentType.ParkEmployee>;
export interface SelfEmployedRusEmployee extends EmployeeBase<EmploymentType.SelfEmployed> {
  phone: string;
}

export enum TaxSystemRus {
  OSN = 'OSN', // Общая система налогообложения
  USN = 'USN', // Упрощенная система налогообложения
  AUSN = 'AUSN', // Автоматизированная упрощенная система
  OSNP = 'OSNP', // Патентная система (ОСН)
  USNP = 'USNP', // Патентная система (УСН)
}

export interface IndividualEntrepreneurRusEmployee extends EmployeeBase<EmploymentType.IndividualEntrepreneur> {
  tax_system: TaxSystemRus;
}

export interface IndividualEntrepreneurKazEmployee extends EmployeeBase<EmploymentType.IndividualEntrepreneur> {
  phone: string;
  tax_authority_code: string;
}

export type YandexFleetEmployment =
  | ParkEmployee
  | SelfEmployedRusEmployee
  | IndividualEntrepreneurRusEmployee
  | IndividualEntrepreneurKazEmployee;

export interface YandexFleetCreateContractorProfile {
  contractor: YandexFleetContractor;
  profession: YandexDriverProfessionType;
  employment: YandexFleetEmployment;
}

export enum DriverWorkStatus {
  Working = 'working',
  NotWorking = 'not_working',
  Fired = 'fired',
}

export interface AccountData {
  balance_limit?: string;
  work_rule_id?: string;
  payment_service_id?: string;
  block_orders_on_balance_below_limit?: boolean;
}

export interface ProfileData {
  hire_date?: string;
  work_status?: DriverWorkStatus;
  fire_date?: string;
  comment?: string;
  feedback?: string;
}

export interface FullNameData {
  first_name: string;
  middle_name?: string;
  last_name: string;
}

export interface ContactInfoData {
  address?: string;
  email?: string;
  phone: string;
}

export interface DriverLicenseData {
  birth_date: string;
  country?: CountryCode;
  expiry_date?: string;
  issue_date?: string;
  number?: string;
}

export interface DriverLicenseExperienceData {
  total_since_date: string;
}

export interface PersonData {
  full_name: FullNameData;
  contact_info: ContactInfoData;
  driver_license: DriverLicenseData;
  driver_license_experience?: DriverLicenseExperienceData;
  tax_identification_number?: string;
  employment_type?: EmploymentType;
}

export interface YandexFleetDriverProfile {
  account: AccountData;
  person: PersonData;
  profile: ProfileData;
  car_id?: string;
  order_provider: {
    platform: boolean;
    partner: boolean;
  };
}

export interface YandexCarResponse {
  limit: number;
  offset: number;
  total: number;
  cars: Array<YandexFleetVehicle>;
}

export enum FuelType {
  Petrol = 'petrol',
  Methane = 'methane',
  Propane = 'propane',
  Electricity = 'electricity',
}

export enum TransmissionType {
  Mechanical = 'mechanical',
  Automatic = 'automatic',
  Robotic = 'robotic',
  Variator = 'variator',
  Unknown = 'unknown',
}

export enum OwnerShipType {
  Park = 'park',
  Leasing = 'leasing',
}

export interface YandexFleetVehicleData {
  park_profile: {
    callsign: string;
    status: VehicleStatus;
    license_owner_id?: string;
    is_park_property?: boolean;
    ownership_type?: OwnerShipType;
    leasing_conditions?: {
      company: string;
      start_date: string;
      term: number;
      monthly_payment: number;
      interest_rate: string;
    };
    amenities?: VehicleAmenities[];
    categories?: VehicleCategory[];
    tariffs?: string[];
    comment?: string;
    fuel_type: FuelType;
  };
  vehicle_licenses: {
    licence_plate_number: string;
    registration_certificate?: string;
    licence_number?: string;
  };
  vehicle_specifications: {
    model: string;
    brand: string;
    color: VehicleColor;
    year: number;
    transmission: TransmissionType;
    vin: string;
    body_number?: string;
    mileage?: number;
  };
  cargo?: {
    cargo_loaders?: number;
    carrying_capacity?: number;
    cargo_hold_dimensions?: {
      length: number;
      width: number;
      height: number;
    };
  };
  child_safety?: {
    booster_count: number;
  };
}

export interface YandexFleetUpdateCarRequest {
  vehicle_specifications: {
    model: string;
    brand: string;
    color: VehicleColor;
    year: number;
    transmission: TransmissionType;
    vin: string;
    body_number?: string;
    mileage?: number;
  };
  vehicle_licenses: {
    licence_plate_number: string;
    registration_certificate?: string;
    licence_number?: string;
  };
  park_profile: {
    callsign: string;
    status: VehicleStatus;
    license_owner_id?: string;
    is_park_property?: boolean;
    ownership_type?: OwnerShipType;
    leasing_conditions?: {
      company: string;
      start_date: string;
      term: number;
      monthly_payment: number;
      interest_rate: string;
    };
    amenities?: VehicleAmenities[];
    categories?: VehicleCategory[];
    tariffs?: string[];
    comment?: string;
    fuel_type: FuelType;
  };
  child_safety?: {
    booster_count: number;
  };
  cargo?: {
    cargo_loaders: number;
    carrying_capacity: number;
    cargo_hold_dimensions: {
      length: number;
      width: number;
      height: number;
    };
  };
}

export enum OrderStatus {
  None = 'none',
  Driving = 'driving',
  Waiting = 'waiting',
  Transporting = 'transporting',
  Complete = 'complete',
  Cancelled = 'cancelled',
  Calling = 'calling',
  Expired = 'expired',
  Failed = 'failed',
}

export interface AddressData {
  address: string;
  lat: number;
  lon: number;
}

export enum PaymentMethod {
  Cash = 'cash',
  Cashless = 'cashless',
  Card = 'card',
  Internal = 'internal',
  Other = 'other',
  Corp = 'corp',
  Prepaid = 'prepaid',
}

export interface YandexFleetOrder {
  id: string;
  short_id: number;
  status: OrderStatus;
  created_at: string;
  booked_at: string;
  provider: 'none' | 'partner' | 'platform';
  category: VehicleCategory;
  amenities: VehicleAmenities[];
  address_from: AddressData;
  route_points: AddressData[];
  events: [
    {
      event_at: string;
      order_status: OrderStatus;
    },
  ];
  ended_at: string;
  payment_method: PaymentMethod;
  driver_profile: {
    id: string;
    name: string;
  };
  car: {
    id: string;
    brand_model: string;
    license: {
      number: string;
    };
    callsign: string;
  };
  type: {
    id: string;
    name: string;
  };
  price: string;
  driver_work_rule: {
    id: string;
    name: string;
  };
  mileage: string;
  cancellation_description: string;
  park_details: {
    tariff: {
      id: string;
      name: string;
    };
    passenger: {
      name: string;
      phones: string[];
    };
    company: {
      id: string;
      name: string;
      slip: string;
      comment: string;
    };
  };
}

export interface YandexOrdersResponse {
  limit: number;
  cursor: string;
  orders: Array<YandexFleetOrder>;
}

export interface YandexFleetCreateWalkCourier {
  full_name: FullNameData;
  phone: string;
  birth_date: string;
  work_rule_id: string;
  city?: string;
  registration_country_code?: CountryCode;
}

export interface YandexFleetCreateWalkSECourier {
  profile: YandexFleetCreateWalkCourier;
  selfemployed: {
    address: string;
    phone: string;
    address_apartment?: string;
    deactivation_contractor_id?: string;
  };
}

export interface YandexFleetCreateCarCourier {
  account?: {
    balance_limit: string;
    work_rule_id: string;
    payment_service_id: string;
    block_orders_on_balance_below_limit: boolean;
  };
  person: {
    full_name: FullNameData;
    contact_info: ContactInfoData;
    driver_license: DriverLicenseData;
    driver_license_experience?: {
      total_since_date: string;
    };
    id_doc?: {
      address: string;
    };
    tax_identification_number?: string;
  };
  profile: {
    hire_date: string;
    comment?: string;
  };
  car_id?: string;
  order_provider: {
    platform: true;
    partner: true;
  };
}

export interface YandexFleetSupplyHours {
  supply_duration_seconds: number;
  total_seconds: number;
}
