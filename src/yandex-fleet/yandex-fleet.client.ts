import axios, { InternalAxiosRequestConfig } from 'axios';

const ENDPOINT_LIMITS: { pattern: RegExp; minInterval: number }[] = [
  { pattern: /\/v1\/parks\/orders\/list/, minInterval: 6000 },
  { pattern: /\/v1\/parks\/driver-profiles\/list/, minInterval: 800 },
  { pattern: /\/v2\/parks\/vehicles\/car/, minInterval: 500 },
  { pattern: /\/v2\/parks\/contractors\/driver-profile/, minInterval: 500 },
  { pattern: /\/v1\/parks\/driver-work-rules/, minInterval: 800 },
  { pattern: /\/v2\/parks\/contractors\/supply-hours/, minInterval: 5000 },
];
const DEFAULT_INTERVAL = 800;

function getEndpointPattern(url: string): string {
  const limit = ENDPOINT_LIMITS.find((l) => l.pattern.test(url));
  return limit ? limit.pattern.source : 'default';
}

function getInterval(url: string): number {
  return ENDPOINT_LIMITS.find((l) => l.pattern.test(url))?.minInterval ?? DEFAULT_INTERVAL;
}

const endpointChains = new Map<string, Promise<void>>();
const lastRequestTimes = new Map<string, number>();
const endpointPauseUntil = new Map<string, number>();

async function rateLimit(url: string): Promise<void> {
  const key = getEndpointPattern(url);
  const minInterval = getInterval(url);

  const previousChain = endpointChains.get(key) ?? Promise.resolve();

  const currentChain = previousChain.then(async () => {
    const pauseUntil = endpointPauseUntil.get(key) ?? 0;
    const now = Date.now();
    if (pauseUntil > now) {
      await new Promise((r) => setTimeout(r, pauseUntil - now));
    }

    const lastTime = lastRequestTimes.get(key) ?? 0;
    const elapsed = Date.now() - lastTime;
    const waitTime = Math.max(0, minInterval - elapsed);

    if (waitTime > 0) {
      await new Promise((r) => setTimeout(r, waitTime));
    }

    lastRequestTimes.set(key, Date.now());
  });

  endpointChains.set(key, currentChain);
  await currentChain;
}

function setEndpointPause(url: string, pauseMs: number): void {
  const key = getEndpointPattern(url);
  const until = Date.now() + pauseMs;
  const existing = endpointPauseUntil.get(key) ?? 0;

  if (until > existing) {
    endpointPauseUntil.set(key, until);
  }
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

      if (config._retryCount > 8) {
        console.error(
          `[YandexClient] 429 на ${config.url}: исчерпан лимит ретраев (${config._retryCount})`,
        );
        throw error;
      }

      const pauseMs = Math.min(5000 * Math.pow(1.5, config._retryCount - 1), 60000);
      setEndpointPause(config.url ?? '', pauseMs);

      console.warn(
        `[YandexClient] 429 на ${config.url} (парк ${config.headers?.['X-Park-ID']}), retry ${config._retryCount}, глобальная пауза ${pauseMs}ms`,
      );

      return client.request(config);
    }
    throw error;
  },
);

export default client;
