import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import {
  YandexFleetCreateContractorProfile,
  YandexFleetDriverProfile,
  YandexDriverProfileResponse,
  YandexWorkRule,
  YandexFleetVehicleData,
  YandexCarResponse,
  YandexOrdersResponse,
  OrderStatus,
  YandexFleetOrder,
  YandexFleetUpdateCarRequest,
  YandexFleetCreateWalkCourier,
  YandexFleetCreateWalkSECourier,
} from './yandex-fleet.type';
import { YANDEX_TO_BITRIX_PARK } from '../bitrix/bitrix.type';
import yandexApiClient from './yandex-fleet.client';

export class YandexFleetService {
  private client: AxiosInstance = yandexApiClient;

  constructor(private apiKeys: Record<keyof typeof YANDEX_TO_BITRIX_PARK, string>) {}

  async getProfile(parkId: string, contractorProfileId: string): Promise<YandexFleetDriverProfile> {
    try {
      const response = await this.client.get('/v2/parks/contractors/driver-profile', {
        params: { contractor_profile_id: contractorProfileId },
        headers: this.getParkHeaders(parkId),
      });

      return response.data;
    } catch (error: unknown) {
      this.handleError(error);
    }
  }

  async getWorkRules(parkId: string): Promise<{ rules: YandexWorkRule[] }> {
    try {
      const response = await this.client.get('/v1/parks/driver-work-rules', {
        params: { park_id: parkId },
        headers: this.getParkHeaders(parkId),
      });

      return response.data;
    } catch (error: unknown) {
      this.handleError(error);
    }
  }

  async getProfiles(
    parkId: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<YandexDriverProfileResponse> {
    try {
      const response = await this.client.post<YandexDriverProfileResponse>(
        '/v1/parks/driver-profiles/list',
        {
          query: { park: { id: parkId } },
          // fields,
          limit,
          offset,
        },
        { headers: this.getParkHeaders(parkId) },
      );

      return response.data;
    } catch (error: unknown) {
      this.handleError(error);
    }
  }

  async getCar(parkId: string, vehicleId: string): Promise<YandexFleetVehicleData> {
    try {
      const response = await this.client.get('/v2/parks/vehicles/car', {
        params: { vehicle_id: vehicleId },
        headers: this.getParkHeaders(parkId),
      });

      return response.data;
    } catch (error: unknown) {
      this.handleError(error);
    }
  }

  async getCars(
    parkId: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<YandexCarResponse> {
    try {
      const response = await this.client.post<YandexCarResponse>(
        '/v1/parks/cars/list',
        {
          query: { park: { id: parkId } },
          // fields,
          limit,
          offset,
        },
        { headers: this.getParkHeaders(parkId) },
      );

      return response.data;
    } catch (error: unknown) {
      this.handleError(error);
    }
  }

  async updateCar(
    parkId: string,
    vehicleId: string,
    data: YandexFleetUpdateCarRequest,
  ): Promise<void> {
    try {
      await this.client.put('/v2/parks/vehicles/car', data, {
        params: { vehicle_id: vehicleId },
        headers: this.getParkHeaders(parkId),
      });
    } catch (error: unknown) {
      this.handleError(error);
    }
  }

  async createCar(parkId: string, data: YandexFleetUpdateCarRequest): Promise<string> {
    try {
      const idempotencyToken = crypto.randomUUID();

      const response = await this.client.post<{ vehicle_id: string }>(
        '/v2/parks/vehicles/car',
        data,
        {
          headers: {
            ...this.getParkHeaders(parkId),
            'X-Idempotency-Token': idempotencyToken,
          },
        },
      );

      return response.data.vehicle_id;
    } catch (error: unknown) {
      this.handleError(error);
    }
  }

  async getLastDriverOrders(
    parkId: string,
    driverProfileId: string,
    from: Date,
    limit: number = 26,
    offset: number = 0,
  ): Promise<YandexFleetOrder[]> {
    try {
      const response = await this.client.post<YandexOrdersResponse>(
        '/v1/parks/orders/list',
        {
          query: {
            park: {
              id: parkId,
              order: {
                booked_at: { from: from.toISOString(), to: new Date().toISOString() },
                statuses: [OrderStatus.Complete],
              },
            },
            driver_profile: { id: driverProfileId },
          },
          limit,
          offset,
        },
        { headers: this.getParkHeaders(parkId) },
      );

      return response.data.orders;
    } catch (error: unknown) {
      this.handleError(error);
    }
  }

  async createProfile(
    parkId: string,
    driverData: YandexFleetCreateContractorProfile,
  ): Promise<string> {
    try {
      const idempotencyToken = crypto.randomUUID();

      const response = await this.client.post('/v1/parks/contractors/profile', driverData, {
        headers: {
          'X-Idempotency-Token': idempotencyToken,
          ...this.getParkHeaders(parkId),
        },
      });
      return response.data.contractor_profile_id;
    } catch (error: unknown) {
      this.handleError(error);
    }
  }

  async createWalkCourier(parkId: string, data: YandexFleetCreateWalkCourier): Promise<string> {
    try {
      const idempotencyToken = crypto.randomUUID();

      const response = await this.client.post(
        '/v2/parks/contractors/walking-courier-profile',
        data,
        {
          headers: {
            'X-Idempotency-Token': idempotencyToken,
            ...this.getParkHeaders(parkId),
          },
        },
      );
      return response.data.contractor_profile_id;
    } catch (error: unknown) {
      this.handleError(error);
    }
  }

  async createWalkSECourier(parkId: string, data: YandexFleetCreateWalkSECourier): Promise<string> {
    try {
      const idempotencyToken = crypto.randomUUID();

      const response = await this.client.post(
        'v3/parks/contractors/walking-courier-profile',
        data,
        {
          headers: {
            'X-Idempotency-Token': idempotencyToken,
            ...this.getParkHeaders(parkId),
          },
        },
      );
      return response.data.id;
    } catch (error: unknown) {
      this.handleError(error);
    }
  }

  async updateProfile(
    parkId: string,
    contractorProfileId: string,
    updateData: YandexFleetDriverProfile,
  ): Promise<void> {
    try {
      await this.client.put('/v2/parks/contractors/driver-profile', updateData, {
        params: {
          contractor_profile_id: contractorProfileId,
        },
        headers: this.getParkHeaders(parkId),
      });
    } catch (error: unknown) {
      this.handleError(error);
    }
  }

  private getParkHeaders(parkId: string) {
    const apiKey = this.apiKeys[parkId];

    if (!apiKey) {
      throw new Error(`[YandexFleet] Критическая ошибка: Не найден API-ключ для парка ${parkId}`);
    }

    return {
      'X-Client-ID': `taxi/park/${parkId}`,
      'X-Park-ID': parkId,
      'X-API-Key': apiKey,
    };
  }

  private handleError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const details = error.response?.data;

      console.error(`Yandex Fleet API Error [${status}]:`, JSON.stringify(details, null, 2));

      throw new Error(`Yandex Fleet API Error (status: ${status}): ${error.message}`);
    } else if (error instanceof Error) {
      console.error('Yandex Fleet Service Internal Error:', error.message);
      throw error;
    } else {
      console.error('Yandex Fleet Service Unknown Error:', error);
      throw new Error(String(error));
    }
  }
}
