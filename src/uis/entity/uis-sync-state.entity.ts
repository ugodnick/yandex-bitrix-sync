import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { utcDateTimeTransformer } from '../../typeorm-transformers';

export enum UisSyncType {
  Calls = 'calls',
  CallLegs = 'call_legs',
  Directories = 'directories',
  EmployeeStatus = 'employee_status',
}

@Entity('uis_sync_state')
@Index(['syncType'], { unique: true })
export class UisSyncStateEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', name: 'sync_type' })
  syncType: UisSyncType;

  @Column({
    type: 'datetime',
    name: 'last_synced_to',
    nullable: true,
    transformer: utcDateTimeTransformer,
  })
  lastSyncedTo: Date | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
