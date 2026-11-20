import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUisEmployeeStatusStatTable1793600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE uis_employee_status_stat (
        uis_id VARCHAR PRIMARY KEY NOT NULL,
        employee_id VARCHAR NOT NULL,
        stat_date VARCHAR NOT NULL,
        full_name VARCHAR,
        available_seconds INTEGER NOT NULL DEFAULT 0,
        break_seconds INTEGER NOT NULL DEFAULT 0,
        do_not_disturb_seconds INTEGER NOT NULL DEFAULT 0,
        not_at_workplace_seconds INTEGER NOT NULL DEFAULT 0,
        not_at_work_seconds INTEGER NOT NULL DEFAULT 0,
        auto_out_call_seconds INTEGER NOT NULL DEFAULT 0,
        unknown_seconds INTEGER NOT NULL DEFAULT 0,
        groups TEXT,
        status_stats TEXT,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_uis_employee_status_stat_date ON uis_employee_status_stat (stat_date)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_uis_employee_status_stat_date`);
    await queryRunner.query(`DROP TABLE uis_employee_status_stat`);
  }
}
