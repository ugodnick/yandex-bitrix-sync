import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedYandexEatParks1779500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const parks: Array<{
      id: string;
      dispatcher: string;
      name: string;
      key: string;
    }> = [
      {
        id: '43c7a01498ae430588d912eed9d30f6d',
        dispatcher: '429',
        name: 'ЕдаРФ',
        key: 'EDARF_PARK_API_KEY',
      },
    ];

    for (const p of parks) {
      const apiKey = process.env[p.key];
      await queryRunner.query(
        `INSERT INTO yandex_fleet_park (id, bitrix_dispatcher_id, name, type, api_key, is_active) VALUES (?, ?, ?, ?, ?, ?)`,
        [p.id, p.dispatcher, p.name, 'eat', apiKey, true],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM yandex_fleet_park WHERE type = 'eat'`);
  }
}
