import { YANDEX_TO_BITRIX_PARK } from './bitrix/bitrix.type';

interface AppConfig {
  inboundWebhookUrl: string;
  yandexApiKeys: Record<keyof typeof YANDEX_TO_BITRIX_PARK, string>;
  expectedToken: string;
}

export function loadConfig(): AppConfig {
  const requireEnv = (key: string): string => {
    const value = process.env[key];
    if (!value) {
      throw new Error(`CRITICAL: Missing required environment variable: ${key}`);
    }
    return value;
  };

  return {
    inboundWebhookUrl: requireEnv('BITRIX_INBOUND_WEBHOOK_URL'),
    expectedToken: requireEnv('BITRIX_AUTH_TOKEN'),
    yandexApiKeys: {
      bf157cfe3a914fda817b1d2dde37ada1: requireEnv('JIMARA_YANDEX_API_KEY'),
      '8ddb58b306774e458fc7d24203c36c14': requireEnv('ARKTUR_YANDEX_API_KEY'),
      '8b99022cd8a24f8782fc19feff7a45e2': requireEnv('PROFLOGISTIC_YANDEX_API_KEY'),
    } as Record<string, string>,
  };
}
