import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { utcDateTimeTransformer } from '../../typeorm-transformers';

@Entity('uis_call_leg')
@Index(['startTime'])
@Index(['callSessionId'])
export class UisCallLegEntity {
  @PrimaryColumn({ type: 'varchar', name: 'uis_id' })
  uisId: string;

  @Column({ type: 'varchar', name: 'call_session_id', nullable: true })
  callSessionId: string | null;

  @Column({
    type: 'datetime',
    name: 'start_time',
    nullable: true,
    transformer: utcDateTimeTransformer,
  })
  startTime: Date | null;

  @Column({
    type: 'datetime',
    name: 'connect_time',
    nullable: true,
    transformer: utcDateTimeTransformer,
  })
  connectTime: Date | null;

  @Column({ type: 'integer', name: 'duration', nullable: true })
  duration: number | null;

  @Column({ type: 'integer', name: 'total_duration', nullable: true })
  totalDuration: number | null;

  @Column({ type: 'varchar', name: 'finish_reason', nullable: true })
  finishReason: string | null;

  @Column({ type: 'varchar', name: 'finish_reason_description', nullable: true })
  finishReasonDescription: string | null;

  @Column({ type: 'varchar', name: 'virtual_phone_number', nullable: true })
  virtualPhoneNumber: string | null;

  @Column({ type: 'varchar', name: 'calling_phone_number', nullable: true })
  callingPhoneNumber: string | null;

  @Column({ type: 'varchar', name: 'called_phone_number', nullable: true })
  calledPhoneNumber: string | null;

  @Column({ type: 'varchar', name: 'direction', nullable: true })
  direction: string | null;

  @Column({ type: 'boolean', name: 'is_transfered', nullable: true })
  isTransfered: boolean | null;

  @Column({ type: 'boolean', name: 'is_operator', nullable: true })
  isOperator: boolean | null;

  @Column({ type: 'boolean', name: 'is_failed', nullable: true })
  isFailed: boolean | null;

  @Column({ type: 'boolean', name: 'is_talked', nullable: true })
  isTalked: boolean | null;

  @Column({ type: 'varchar', name: 'employee_id', nullable: true })
  employeeId: string | null;

  @Column({ type: 'varchar', name: 'employee_full_name', nullable: true })
  employeeFullName: string | null;

  @Column({ type: 'varchar', name: 'employee_phone_number', nullable: true })
  employeePhoneNumber: string | null;

  @Column({ type: 'varchar', name: 'scenario_id', nullable: true })
  scenarioId: string | null;

  @Column({ type: 'varchar', name: 'scenario_name', nullable: true })
  scenarioName: string | null;

  @Column({ type: 'varchar', name: 'group_id', nullable: true })
  groupId: string | null;

  @Column({ type: 'varchar', name: 'group_name', nullable: true })
  groupName: string | null;

  @Column({ type: 'varchar', name: 'action_id', nullable: true })
  actionId: string | null;

  @Column({ type: 'varchar', name: 'action_name', nullable: true })
  actionName: string | null;

  @Column({ type: 'text', name: 'call_records', nullable: true })
  callRecords: string | null;

  @Column({ type: 'text', name: 'raw_json', nullable: true })
  rawJson: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
