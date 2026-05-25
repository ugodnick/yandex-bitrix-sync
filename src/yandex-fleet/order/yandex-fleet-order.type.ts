import type { VehicleAmenities, VehicleCategory } from '../vehicle/yandex-fleet-vehicle.type';

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
