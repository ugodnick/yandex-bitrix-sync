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

export interface YandexCarResponse {
  limit: number;
  offset: number;
  total: number;
  cars: Array<YandexFleetVehicle>;
}
