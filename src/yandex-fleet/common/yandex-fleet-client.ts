import axios, { InternalAxiosRequestConfig } from 'axios';

/** Yandex Fleet API company-wide limit: ~1 request per second. */
const MIN_REQUEST_INTERVAL_MS = 1000;

let requestChain: Promise<void> = Promise.resolve();
let lastRequestTime = 0;
let pauseUntil = 0;

async function rateLimit(): Promise<void> {
  const previousChain = requestChain;

  const currentChain = previousChain.then(async () => {
    const now = Date.now();
    if (pauseUntil > now) {
      await new Promise((r) => setTimeout(r, pauseUntil - now));
    }

    const elapsed = Date.now() - lastRequestTime;
    const waitTime = Math.max(0, MIN_REQUEST_INTERVAL_MS - elapsed);

    if (waitTime > 0) {
      await new Promise((r) => setTimeout(r, waitTime));
    }

    lastRequestTime = Date.now();
  });

  requestChain = currentChain;
  await currentChain;
}

function setGlobalPause(pauseMs: number): void {
  const until = Date.now() + pauseMs;
  if (until > pauseUntil) {
    pauseUntil = until;
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
  await rateLimit();
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
      setGlobalPause(pauseMs);

      console.warn(
        `[YandexClient] 429 на ${config.url} (парк ${config.headers?.['X-Park-ID']}), retry ${config._retryCount}, глобальная пауза ${pauseMs}ms`,
      );

      return client.request(config);
    }
    throw error;
  },
);

export default client;
