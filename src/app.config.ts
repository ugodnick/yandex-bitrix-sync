interface AppConfig {
  inboundWebhookUrl: string;
  yandexApiKeys: Record<string, string>;
  bitrixAuthToken: string;
  googleSheetsSheetId: string;
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
    yandexApiKeys: {
      bf157cfe3a914fda817b1d2dde37ada1: requireEnv('JIMARA_YANDEX_API_KEY'),
      '8ddb58b306774e458fc7d24203c36c14': requireEnv('ARKTUR_YANDEX_API_KEY'),
      '8b99022cd8a24f8782fc19feff7a45e2': requireEnv('PROFLOGISTIC_YANDEX_API_KEY'),
      c1af957f21b844868adc314f0e24e985: requireEnv('BELUKHA_YANDEX_API_KEY'),
      '89a42a3a9a964fff9c41fd076fd09c6c': requireEnv('EVEREST_YANDEX_API_KEY'),
      '35c53a402f8b4f04a8806e68da798f20': requireEnv('MIZHIRGI_YANDEX_API_KEY'),
      '30ca63b508454371b9deb252b3306083': requireEnv('FISHT_YANDEX_API_KEY'),
      '9ac02ba7e5174c10b401cfb7dfdaa894': requireEnv('DAUTAI_YANDEX_API_KEY'),
      e08fb4afb94c4c93bc219e01f5fbf4d0: requireEnv('GLORIAN_YANDEX_API_KEY'),
      '2af51b8a58374530ad09b72b22ca8f46': requireEnv('KARAT_YANDEX_API_KEY'),
      b41f8b4eb31d4ab582ddb13ab3c12f2c: requireEnv('ASKOLD_YANDEX_API_KEY'),
      f64fa7f2878546a69c0f54e874cba4b8: requireEnv('KARAVAN_YANDEX_API_KEY'),
      '702a99bde8e441a8bc931e7db59df3e5': requireEnv('FARTCAR_YANDEX_API_KEY'),
      c45bf27db32a4974b3edf382489ff246: requireEnv('MAGISTRAL_YANDEX_API_KEY'),
      a2cbcab863d848f6baa7ae485f57e3d7: requireEnv('ALPHA_YANDEX_API_KEY'),
      '760f5b77a27247769e60eacd66177cd2': requireEnv('KAPELLA_YANDEX_API_KEY'),
      d75483feacd2499e8e601f9fd17a5f73: requireEnv('VEGA_YANDEX_API_KEY'),
    } as Record<string, string>,
    googleSheetsSheetId: requireEnv('GOOGLE_SHEET_ID'),
  };
}
