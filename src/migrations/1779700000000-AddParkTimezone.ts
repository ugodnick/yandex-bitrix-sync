import { MigrationInterface, QueryRunner } from 'typeorm';

const PARK_TIMEZONES: Array<{ id: string; timezone: string }> = [
  { id: '9ac02ba7e5174c10b401cfb7dfdaa894', timezone: 'Asia/Yakutsk' }, // ДАУТАЙ Благовещенск +9
  { id: '8b99022cd8a24f8782fc19feff7a45e2', timezone: 'Europe/Saratov' }, // ПРОФИЛОГИСТИК Саратов +4
  { id: 'f64fa7f2878546a69c0f54e874cba4b8', timezone: 'Europe/Saratov' }, // КАРАВАН Саратов +4
  { id: '702a99bde8e441a8bc931e7db59df3e5', timezone: 'Europe/Saratov' }, // ФАРТCAR Саратов +4
  { id: 'c45bf27db32a4974b3edf382489ff246', timezone: 'Europe/Moscow' }, // МАГИСТРАЛЬ +3
  { id: '8ddb58b306774e458fc7d24203c36c14', timezone: 'Asia/Omsk' }, // АРКТУР Омск +6
  { id: '760f5b77a27247769e60eacd66177cd2', timezone: 'Europe/Samara' }, // КАПЕЛЛА Самара +4
  { id: 'd75483feacd2499e8e601f9fd17a5f73', timezone: 'Europe/Moscow' }, // ВЕГА Сочи +3
];

export class AddParkTimezone1779700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE yandex_fleet_park ADD COLUMN timezone VARCHAR NOT NULL DEFAULT 'Asia/Vladivostok'`,
    );

    for (const park of PARK_TIMEZONES) {
      await queryRunner.query(`UPDATE yandex_fleet_park SET timezone = ? WHERE id = ?`, [
        park.timezone,
        park.id,
      ]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // SQLite: drop column via recreate is heavy; leave column on downgrade no-op for safety
    await queryRunner.query(
      `UPDATE yandex_fleet_park SET timezone = 'Asia/Vladivostok' WHERE timezone != 'Asia/Vladivostok'`,
    );
  }
}
