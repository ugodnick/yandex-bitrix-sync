module.exports = {
  apps: [
    {
      name: 'yandex-bitrix-sync-app',
      script: 'build/index.js',
      exec_mode: 'fork',
      instances: 1,
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'DD-MM-YYYY HH:mm:ss',
      autorestart: true,
      restart_delay: 3000,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
