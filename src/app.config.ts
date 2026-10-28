export interface YandexMailConfig {
  user: string;
  password: string;
}

interface AppConfig {
  inboundWebhookUrl: string;
  bitrixAuthToken: string;
  googleSheetsDeliverySheetId: string;
  googleSheetsTaxiSheetId: string;
  googleSheetsEatSheetId: string;
  googleSheetsCargoSheetId: string;
  googleSheetsBitrixSheetId: string;
  yandexMail: YandexMailConfig | null;
}

export function loadConfig(): AppConfig {
  const requireEnv = (key: string): string => {
    const value = process.env[key];
    if (!value) {
      throw new Error(`CRITICAL: Missing required environment variable: ${key}`);
    }
    return value;
  };

  const mailUser = process.env.YANDEX_MAIL_USER?.trim() ?? '';
  const mailPassword = process.env.YANDEX_MAIL_PASSWORD?.trim() ?? '';

  return {
    inboundWebhookUrl: requireEnv('BITRIX_INBOUND_WEBHOOK_URL'),
    bitrixAuthToken: requireEnv('BITRIX_AUTH_TOKEN'),
    googleSheetsDeliverySheetId: requireEnv('GOOGLE_SHEET_DELIVERY_ID'),
    googleSheetsTaxiSheetId: requireEnv('GOOGLE_SHEET_TAXI_ID'),
    googleSheetsEatSheetId: requireEnv('GOOGLE_SHEET_EAT_ID'),
    googleSheetsCargoSheetId: requireEnv('GOOGLE_SHEET_CARGO_ID'),
    googleSheetsBitrixSheetId: requireEnv('GOOGLE_SHEET_BITRIX_ID'),
    yandexMail: mailUser && mailPassword ? { user: mailUser, password: mailPassword } : null,
  };
}
