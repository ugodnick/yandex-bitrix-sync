import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { utcDateTimeTransformer } from '../../typeorm-transformers';

@Entity('uis_call')
@Index(['startTime'])
export class UisCallEntity {
  @PrimaryColumn({ type: 'varchar', name: 'uis_id' })
  uisId: string;

  @Column({
    type: 'datetime',
    name: 'start_time',
    nullable: true,
    transformer: utcDateTimeTransformer,
  })
  startTime: Date | null;

  @Column({
    type: 'datetime',
    name: 'finish_time',
    nullable: true,
    transformer: utcDateTimeTransformer,
  })
  finishTime: Date | null;

  @Column({ type: 'varchar', name: 'finish_reason', nullable: true })
  finishReason: string | null;

  @Column({ type: 'varchar', name: 'direction', nullable: true })
  direction: string | null;

  @Column({ type: 'boolean', name: 'is_lost', nullable: true })
  isLost: boolean | null;

  @Column({ type: 'varchar', name: 'contact_phone_number', nullable: true })
  contactPhoneNumber: string | null;

  @Column({ type: 'varchar', name: 'virtual_phone_number', nullable: true })
  virtualPhoneNumber: string | null;

  @Column({ type: 'varchar', name: 'communication_id', nullable: true })
  communicationId: string | null;

  @Column({ type: 'varchar', name: 'source', nullable: true })
  source: string | null;

  @Column({ type: 'integer', name: 'wait_duration', nullable: true })
  waitDuration: number | null;

  @Column({ type: 'integer', name: 'total_wait_duration', nullable: true })
  totalWaitDuration: number | null;

  @Column({ type: 'integer', name: 'talk_duration', nullable: true })
  talkDuration: number | null;

  @Column({ type: 'integer', name: 'clean_talk_duration', nullable: true })
  cleanTalkDuration: number | null;

  @Column({ type: 'integer', name: 'total_duration', nullable: true })
  totalDuration: number | null;

  @Column({ type: 'integer', name: 'postprocess_duration', nullable: true })
  postprocessDuration: number | null;

  @Column({ type: 'varchar', name: 'scenario_id', nullable: true })
  scenarioId: string | null;

  @Column({ type: 'varchar', name: 'scenario_name', nullable: true })
  scenarioName: string | null;

  @Column({ type: 'varchar', name: 'last_answered_employee_id', nullable: true })
  lastAnsweredEmployeeId: string | null;

  @Column({ type: 'varchar', name: 'last_answered_employee_full_name', nullable: true })
  lastAnsweredEmployeeFullName: string | null;

  @Column({ type: 'varchar', name: 'first_talked_employee_id', nullable: true })
  firstTalkedEmployeeId: string | null;

  @Column({ type: 'varchar', name: 'first_talked_employee_full_name', nullable: true })
  firstTalkedEmployeeFullName: string | null;

  @Column({ type: 'varchar', name: 'operator_phone_number', nullable: true })
  operatorPhoneNumber: string | null;

  @Column({ type: 'text', name: 'call_records', nullable: true })
  callRecords: string | null;

  @Column({ type: 'text', name: 'full_record_file_link', nullable: true })
  fullRecordFileLink: string | null;

  @Column({ type: 'text', name: 'employees', nullable: true })
  employees: string | null;

  @Column({ type: 'text', name: 'tags', nullable: true })
  tags: string | null;

  @Column({ type: 'text', name: 'raw_json', nullable: true })
  rawJson: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
