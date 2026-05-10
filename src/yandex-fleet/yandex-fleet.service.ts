import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import {
  YandexFleetCreateContractorProfile,
  YandexFleetDriverProfile,
  YandexDriverProfileResponse,
  YandexWorkRule,
  YandexFleetVehicleData,
  YandexOrdersResponse,
  YandexFleetUpdateCarRequest,
  YandexFleetSupplyHours,
} from './yandex-fleet.type';
import yandexApiClient from './yandex-fleet.client';
import { YandexFleetParkEntity } from './yandex-park.entity';

export class YandexFleetService {
  private client: AxiosInstance = yandexApiClient;

  async getProfile(
    park: YandexFleetParkEntity,
    contractorProfileId: string,
  ): Promise<YandexFleetDriverProfile> {
    try {
      const response = await this.client.get('/v2/parks/contractors/driver-profile', {
        params: { contractor_profile_id: contractorProfileId },
        headers: this.getParkHeaders(park),
      });

      return response.data;
    } catch (error: unknown) {
      this.handleError(error);
    }
  }

  async getWorkRules(park: YandexFleetParkEntity): Promise<{ rules: YandexWorkRule[] }> {
    try {
      const response = await this.client.get('/v1/parks/driver-work-rules', {
        params: { park_id: park.id },
        headers: this.getParkHeaders(park),
      });

      return response.data;
    } catch (error: unknown) {
      this.handleError(error);
    }
  }

  async getProfiles(
    park: YandexFleetParkEntity,
    limit: number = 100,
    offset: number = 0,
    from: Date,
  ): Promise<YandexDriverProfileResponse> {
    try {
      const response = await this.client.post<YandexDriverProfileResponse>(
        '/v1/parks/driver-profiles/list',
        {
          query: {
            park: {
              id: park.id,
              updated_at: {
                from: from.toISOString(),
              },
              // driver_profile: {
              //   id: [],
              // },
            },
          },
          fields: {
            account: [],
            car: ['id'],
            driver_profile: ['id', 'phones', 'work_status', 'hire_date', 'created_date'],
            park: [],
          },
          limit,
          offset,
        },
        { headers: this.getParkHeaders(park) },
      );

      return response.data;
    } catch (error: unknown) {
      this.handleError(error);
    }
  }

  async getCar(park: YandexFleetParkEntity, vehicleId: string): Promise<YandexFleetVehicleData> {
    try {
      const response = await this.client.get('/v2/parks/vehicles/car', {
        params: { vehicle_id: vehicleId },
        headers: this.getParkHeaders(park),
      });

      return response.data;
    } catch (error: unknown) {
      this.handleError(error);
    }
  }

  async updateCar(
    park: YandexFleetParkEntity,
    vehicleId: string,
    data: YandexFleetUpdateCarRequest,
  ): Promise<void> {
    try {
      await this.client.put('/v2/parks/vehicles/car', data, {
        params: { vehicle_id: vehicleId },
        headers: this.getParkHeaders(park),
      });
    } catch (error: unknown) {
      this.handleError(error);
    }
  }

  async getOrdersPage(
    park: YandexFleetParkEntity,
    from: Date,
    to: Date,
    cursor?: string,
  ): Promise<YandexOrdersResponse> {
    const response = await this.client.post<YandexOrdersResponse>(
      '/v1/parks/orders/list',
      {
        query: {
          park: {
            id: park.id,
            order: {
              booked_at: { from: from.toISOString(), to: to.toISOString() },
            },
          },
        },
        limit: 500,
        ...(cursor ? { cursor } : {}),
      },
      { headers: this.getParkHeaders(park) },
    );
    return response.data;
  }

  async createProfile(
    park: YandexFleetParkEntity,
    driverData: YandexFleetCreateContractorProfile,
  ): Promise<string> {
    try {
      const idempotencyToken = crypto.randomUUID();

      const response = await this.client.post('/v1/parks/contractors/profile', driverData, {
        headers: {
          'X-Idempotency-Token': idempotencyToken,
          ...this.getParkHeaders(park),
        },
      });
      return response.data.contractor_profile_id;
    } catch (error: unknown) {
      this.handleError(error);
    }
  }

  async getDriverSupplyHours(
    park: YandexFleetParkEntity,
    contractorProfileId: string,
    periodFrom: Date,
    periodTo: Date,
  ): Promise<YandexFleetSupplyHours> {
    try {
      const response = await this.client.get<YandexFleetSupplyHours>(
        '/v2/parks/contractors/supply-hours',
        {
          params: {
            contractor_profile_id: contractorProfileId,
            period_from: periodFrom.toISOString(),
            period_to: periodTo.toISOString(),
          },
          headers: this.getParkHeaders(park),
        },
      );

      return response.data;
    } catch (error: unknown) {
      this.handleError(error);
    }
  }

  async updateProfile(
    park: YandexFleetParkEntity,
    contractorProfileId: string,
    updateData: YandexFleetDriverProfile,
  ): Promise<void> {
    try {
      await this.client.put('/v2/parks/contractors/driver-profile', updateData, {
        params: {
          contractor_profile_id: contractorProfileId,
        },
        headers: this.getParkHeaders(park),
      });
    } catch (error: unknown) {
      this.handleError(error);
    }
  }

  private getParkHeaders(park: YandexFleetParkEntity) {
    return {
      'X-Client-ID': `taxi/park/${park.id}`,
      'X-Park-ID': park.id,
      'X-API-Key': park.apiKey,
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
