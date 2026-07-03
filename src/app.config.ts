interface AppConfig {
  inboundWebhookUrl: string;
  bitrixAuthToken: string;
  googleSheetsDeliverySheetId: string;
  googleSheetsTaxiSheetId: string;
  googleSheetsEatSheetId: string;
  googleSheetsBitrixSheetId: string;
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
    bitrixAuthToken: requireEnv('BITRIX_AUTH_TOKEN'),
    googleSheetsDeliverySheetId: requireEnv('GOOGLE_SHEET_DELIVERY_ID'),
    googleSheetsTaxiSheetId: requireEnv('GOOGLE_SHEET_TAXI_ID'),
    googleSheetsEatSheetId: requireEnv('GOOGLE_SHEET_EAT_ID'),
    googleSheetsBitrixSheetId: requireEnv('GOOGLE_SHEET_BITRIX_ID'),
  };
}
