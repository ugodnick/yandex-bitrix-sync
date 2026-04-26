import axios, { InternalAxiosRequestConfig } from 'axios';

const ENDPOINT_LIMITS: { pattern: RegExp; minInterval: number }[] = [
  { pattern: /\/v1\/parks\/orders\/list/, minInterval: 2500 },
  { pattern: /\/v1\/parks\/driver-profiles\/list/, minInterval: 400 },
  { pattern: /\/v2\/parks\/vehicles\/car/, minInterval: 300 },
  { pattern: /\/v2\/parks\/contractors\/driver-profile/, minInterval: 300 },
  { pattern: /\/v1\/parks\/driver-work-rules/, minInterval: 500 },
];
const DEFAULT_INTERVAL = 500;

function getInterval(url: string): number {
  return ENDPOINT_LIMITS.find((l) => l.pattern.test(url))?.minInterval ?? DEFAULT_INTERVAL;
}

const endpointChains = new Map<string, Promise<void>>();
const lastRequestTimes = new Map<string, number>();

function getEndpointKey(url: string): string {
  const limit = ENDPOINT_LIMITS.find((l) => l.pattern.test(url));
  return limit ? limit.pattern.source : 'default';
}

async function rateLimit(url: string): Promise<void> {
  const key = getEndpointKey(url);
  const minInterval = getInterval(url);

  const previousChain = endpointChains.get(key) ?? Promise.resolve();

  const currentChain = previousChain.then(async () => {
    const now = Date.now();
    const lastTime = lastRequestTimes.get(key) ?? 0;
    const elapsed = now - lastTime;
    const waitTime = Math.max(0, minInterval - elapsed);

    if (waitTime > 0) {
      await new Promise((r) => setTimeout(r, waitTime));
    }

    lastRequestTimes.set(key, Date.now());
  });

  endpointChains.set(key, currentChain);
  await currentChain;
}

const client = axios.create({
  baseURL: 'https://fleet-api.taxi.yandex.net',
  headers: {
    'Accept-Language': 'ru',
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  await rateLimit(config.url ?? '');
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 429) {
      const config = error.config;
      config._retryCount = (config._retryCount ?? 0) + 1;

      if (config._retryCount > 5) {
        throw error;
      }

      const retryAfterHeader = Number(error.response.headers['retry-after']);
      const backoff = Math.min(2000 * Math.pow(2, config._retryCount - 1), 60000);
      const delay = retryAfterHeader ? retryAfterHeader * 1000 : backoff;

      console.warn(
        `[Yandex Fleet API] 429 on ${config.url}, retry ${config._retryCount}/5 in ${delay}ms`,
      );
      await new Promise((r) => setTimeout(r, delay));
      return client.request(config);
    }
    throw error;
  },
);

export default client;
