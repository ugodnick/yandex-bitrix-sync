import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedYandexFleetParks1778210346148 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const parks = [
      // delivery
      {
        id: 'bf157cfe3a914fda817b1d2dde37ada1',
        dispatcher: '83',
        name: 'ДЖИМАРА (Я.Доставка Авто Хабаровск)',
        type: 'delivery',
        key: 'JIMARA_YANDEX_API_KEY',
      },
      {
        id: '8ddb58b306774e458fc7d24203c36c14',
        dispatcher: '333',
        name: 'АРКТУР (Я.Доставка Пеший/Авто Омск)',
        type: 'delivery',
        key: 'ARKTUR_YANDEX_API_KEY',
      },
      {
        id: '8b99022cd8a24f8782fc19feff7a45e2',
        dispatcher: '79',
        name: 'ПРОФИЛОГИСТИК (Я.Доставка Пеший/Авто Саратов)',
        type: 'delivery',
        key: 'PROFLOGISTIC_YANDEX_API_KEY',
      },
      {
        id: 'c1af957f21b844868adc314f0e24e985',
        dispatcher: '87',
        name: 'БЕЛУХА (Я.Доставка Пеший/Авто Уссурийск)',
        type: 'delivery',
        key: 'BELUKHA_YANDEX_API_KEY',
      },
      {
        id: '89a42a3a9a964fff9c41fd076fd09c6c',
        dispatcher: '97',
        name: 'ЭВЕРЕСТ (Я.Доставка Пеший Владивосток)',
        type: 'delivery',
        key: 'EVEREST_YANDEX_API_KEY',
      },
      {
        id: '35c53a402f8b4f04a8806e68da798f20',
        dispatcher: '91',
        name: 'МИЖИРГИ (Я.Доставка Пеший Хабаровск)',
        type: 'delivery',
        key: 'MIZHIRGI_YANDEX_API_KEY',
      },
      {
        id: '30ca63b508454371b9deb252b3306083',
        dispatcher: '95',
        name: 'ФИШТ (Я.Доставка Авто Владивосток)',
        type: 'delivery',
        key: 'FISHT_YANDEX_API_KEY',
      },
      {
        id: '9ac02ba7e5174c10b401cfb7dfdaa894',
        dispatcher: '335',
        name: 'ДАУТАЙ (Я.Доставка Пеший/Авто Благовещенск)',
        type: 'delivery',
        key: 'DAUTAI_YANDEX_API_KEY',
      },
      {
        id: 'a2cbcab863d848f6baa7ae485f57e3d7',
        dispatcher: '85',
        name: 'АЛЬФА (Я.Маркет Авто/Грузовое ЛюбойГород)',
        type: 'delivery',
        key: 'ALPHA_YANDEX_API_KEY',
      },
      {
        id: 'c45bf27db32a4974b3edf382489ff246',
        dispatcher: '81',
        name: 'МАГИСТРАЛЬ (Я.Доставка Грузовое ЛюбойГород)',
        type: 'delivery',
        key: 'MAGISTRAL_YANDEX_API_KEY',
      },
      {
        id: '760f5b77a27247769e60eacd66177cd2',
        dispatcher: '89',
        name: 'КАПЕЛЛА (Я.Доставка Пеший/Авто Самара)',
        type: 'delivery',
        key: 'KAPELLA_YANDEX_API_KEY',
      },
      {
        id: 'd75483feacd2499e8e601f9fd17a5f73',
        dispatcher: '329',
        name: 'ВЕГА (Я.Доставка Пеший/Авто Сочи)',
        type: 'delivery',
        key: 'VEGA_YANDEX_API_KEY',
      },
      // taxi
      {
        id: 'e08fb4afb94c4c93bc219e01f5fbf4d0',
        dispatcher: '321',
        name: 'ГЛОРИАН (Я.Такси Владивосток)',
        type: 'taxi',
        key: 'GLORIAN_YANDEX_API_KEY',
      },
      {
        id: '2af51b8a58374530ad09b72b22ca8f46',
        dispatcher: '323',
        name: 'КАРАТ (Я.Такси Хабаровск)',
        type: 'taxi',
        key: 'KARAT_YANDEX_API_KEY',
      },
      {
        id: 'b41f8b4eb31d4ab582ddb13ab3c12f2c',
        dispatcher: '421',
        name: 'АСКОЛЬД (Я.Такси Владивосток Высадка)',
        type: 'taxi',
        key: 'ASKOLD_YANDEX_API_KEY',
      },
      {
        id: 'f64fa7f2878546a69c0f54e874cba4b8',
        dispatcher: '77',
        name: 'КАРАВАН (Я.Такси Саратов)',
        type: 'taxi',
        key: 'KARAVAN_YANDEX_API_KEY',
      },
      {
        id: '702a99bde8e441a8bc931e7db59df3e5',
        dispatcher: '327',
        name: 'ФАРТCAR (Я.Такси Саратов)',
        type: 'taxi',
        key: 'FARTCAR_YANDEX_API_KEY',
      },
    ];

    await queryRunner.query(`
      CREATE TABLE yandex_fleet_park (
        id VARCHAR PRIMARY KEY,
        bitrix_dispatcher_id VARCHAR,
        name VARCHAR NOT NULL,
        type VARCHAR NOT NULL,
        api_key VARCHAR NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT 1,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        create_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    for (const p of parks) {
      const apiKey = process.env[p.key];
      if (!apiKey) {
        console.warn(`[SeedYandexFleetParks] Пропущен парк ${p.name}: нет ${p.key} в .env`);
        continue;
      }
      await queryRunner.query(
        `INSERT INTO yandex_fleet_park (id, bitrix_dispatcher_id, name, type, api_key) VALUES (?, ?, ?, ?, ?)`,
        [p.id, p.dispatcher, p.name, p.type, apiKey],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE yandex_fleet_park`);
  }
}
