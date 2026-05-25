import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export class BitrixClient {
  private readonly client: AxiosInstance;
  private lastRequestTime = 0;
  private readonly requestDelayMs = 700;

  constructor(inboundWebhookUrl: string) {
    const baseURL = inboundWebhookUrl.endsWith('/') ? inboundWebhookUrl : `${inboundWebhookUrl}/`;

    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(async (config) => {
      const now = Date.now();
      const timeToWait = Math.max(0, this.requestDelayMs - (now - this.lastRequestTime));

      if (timeToWait > 0) {
        await new Promise((resolve) => setTimeout(resolve, timeToWait));
      }

      this.lastRequestTime = Date.now();
      return config;
    });
  }

  async get<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(path, config);
    return response.data;
  }

  async post<T>(path: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(path, body, config);
    return response.data;
  }
}
