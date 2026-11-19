import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUisTables1793500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE uis_call (
        uis_id VARCHAR PRIMARY KEY NOT NULL,
        start_time DATETIME,
        finish_time DATETIME,
        finish_reason VARCHAR,
        direction VARCHAR,
        is_lost BOOLEAN,
        contact_phone_number VARCHAR,
        virtual_phone_number VARCHAR,
        communication_id VARCHAR,
        source VARCHAR,
        wait_duration INTEGER,
        total_wait_duration INTEGER,
        talk_duration INTEGER,
        clean_talk_duration INTEGER,
        total_duration INTEGER,
        postprocess_duration INTEGER,
        scenario_id VARCHAR,
        scenario_name VARCHAR,
        last_answered_employee_id VARCHAR,
        last_answered_employee_full_name VARCHAR,
        first_talked_employee_id VARCHAR,
        first_talked_employee_full_name VARCHAR,
        operator_phone_number VARCHAR,
        call_records TEXT,
        full_record_file_link TEXT,
        employees TEXT,
        tags TEXT,
        raw_json TEXT,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_uis_call_start_time ON uis_call (start_time)`);

    await queryRunner.query(`
      CREATE TABLE uis_call_leg (
        uis_id VARCHAR PRIMARY KEY NOT NULL,
        call_session_id VARCHAR,
        start_time DATETIME,
        connect_time DATETIME,
        duration INTEGER,
        total_duration INTEGER,
        finish_reason VARCHAR,
        finish_reason_description VARCHAR,
        virtual_phone_number VARCHAR,
        calling_phone_number VARCHAR,
        called_phone_number VARCHAR,
        direction VARCHAR,
        is_transfered BOOLEAN,
        is_operator BOOLEAN,
        is_failed BOOLEAN,
        is_talked BOOLEAN,
        employee_id VARCHAR,
        employee_full_name VARCHAR,
        employee_phone_number VARCHAR,
        scenario_id VARCHAR,
        scenario_name VARCHAR,
        group_id VARCHAR,
        group_name VARCHAR,
        action_id VARCHAR,
        action_name VARCHAR,
        call_records TEXT,
        raw_json TEXT,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_uis_call_leg_start_time ON uis_call_leg (start_time)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_uis_call_leg_session ON uis_call_leg (call_session_id)`,
    );

    await queryRunner.query(`
      CREATE TABLE uis_employee (
        uis_id VARCHAR PRIMARY KEY NOT NULL,
        full_name VARCHAR,
        first_name VARCHAR,
        last_name VARCHAR,
        patronymic VARCHAR,
        email VARCHAR,
        status VARCHAR,
        status_id VARCHAR,
        extension_phone_number VARCHAR,
        phone_numbers TEXT,
        groups TEXT,
        call_recording VARCHAR,
        raw_json TEXT,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE uis_employee_group (
        uis_id VARCHAR PRIMARY KEY NOT NULL,
        name VARCHAR,
        raw_json TEXT,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE uis_employee_position (
        uis_id VARCHAR PRIMARY KEY NOT NULL,
        name VARCHAR,
        raw_json TEXT,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE uis_status (
        uis_id VARCHAR PRIMARY KEY NOT NULL,
        name VARCHAR,
        mnemonic VARCHAR,
        raw_json TEXT,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE uis_sip_line (
        uis_id VARCHAR PRIMARY KEY NOT NULL,
        phone_number VARCHAR,
        type VARCHAR,
        channels_count INTEGER,
        billing_state VARCHAR,
        physical_state VARCHAR,
        virtual_phone_number VARCHAR,
        status VARCHAR,
        employee_id VARCHAR,
        employee_full_name VARCHAR,
        ip_addresses TEXT,
        raw_json TEXT,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE uis_virtual_number (
        uis_id VARCHAR PRIMARY KEY NOT NULL,
        virtual_phone_number VARCHAR,
        redirection_phone_number VARCHAR,
        activation_date DATETIME,
        status VARCHAR,
        category VARCHAR,
        type VARCHAR,
        name VARCHAR,
        comment TEXT,
        campaigns TEXT,
        scenarios TEXT,
        raw_json TEXT,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE uis_scenario (
        uis_id VARCHAR PRIMARY KEY NOT NULL,
        name VARCHAR,
        virtual_phone_numbers TEXT,
        operations TEXT,
        raw_json TEXT,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE uis_sync_state (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sync_type VARCHAR NOT NULL,
        last_synced_to DATETIME,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (sync_type)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE uis_sync_state`);
    await queryRunner.query(`DROP TABLE uis_scenario`);
    await queryRunner.query(`DROP TABLE uis_virtual_number`);
    await queryRunner.query(`DROP TABLE uis_sip_line`);
    await queryRunner.query(`DROP TABLE uis_status`);
    await queryRunner.query(`DROP TABLE uis_employee_position`);
    await queryRunner.query(`DROP TABLE uis_employee_group`);
    await queryRunner.query(`DROP TABLE uis_employee`);
    await queryRunner.query(`DROP INDEX idx_uis_call_leg_session`);
    await queryRunner.query(`DROP INDEX idx_uis_call_leg_start_time`);
    await queryRunner.query(`DROP TABLE uis_call_leg`);
    await queryRunner.query(`DROP INDEX idx_uis_call_start_time`);
    await queryRunner.query(`DROP TABLE uis_call`);
  }
}
