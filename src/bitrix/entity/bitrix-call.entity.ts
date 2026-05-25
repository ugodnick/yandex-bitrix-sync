import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { utcDateTimeTransformer } from '../../typeorm-transformers';

@Entity('bitrix_call')
@Index(['callStartDate'])
export class BitrixCallEntity {
  @PrimaryColumn({ type: 'varchar', name: 'bitrix_id' })
  bitrixId: string;

  @Column({ type: 'varchar', name: 'portal_user_id', nullable: true })
  portalUserId: string | null;

  @Column({ type: 'varchar', name: 'manager_name', nullable: true })
  managerName: string | null;

  @Column({ type: 'varchar', name: 'phone_number', nullable: true })
  phoneNumber: string | null;

  @Column({ type: 'varchar', name: 'call_type', nullable: true })
  callType: string | null;

  @Column({ type: 'varchar', name: 'call_duration', nullable: true })
  callDuration: string | null;

  @Column({
    type: 'datetime',
    name: 'call_start_date',
    transformer: utcDateTimeTransformer,
  })
  callStartDate: Date;

  @Column({ type: 'varchar', name: 'call_failed_code', nullable: true })
  callFailedCode: string | null;

  @Column({ type: 'varchar', name: 'call_failed_reason', nullable: true })
  callFailedReason: string | null;

  @Column({ type: 'varchar', name: 'crm_entity_type', nullable: true })
  crmEntityType: string | null;

  @Column({ type: 'varchar', name: 'crm_entity_id', nullable: true })
  crmEntityId: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
