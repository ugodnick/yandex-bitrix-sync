import {
  CountryCode,
  DriverWorkStatus,
  EmploymentType,
  TaxSystemRus,
  YandexDriverProfessionType,
} from '../common/yandex-fleet-common.type';
import type { YandexFleetVehicle } from '../vehicle/yandex-fleet-vehicle.type';

export interface YandexFleetDriverProfileAccount {
  id: string;
  type: 'current';
  balance: string;
  balance_limit: string;
  currency: string;
  last_transaction_date?: string;
}

export type DriverStatus = 'offline' | 'busy' | 'free' | 'in_order_free' | 'in_order_busy';

export interface YandexFleetDriverProfileCurrentStatus {
  status: DriverStatus;
  status_updated_at: string;
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
