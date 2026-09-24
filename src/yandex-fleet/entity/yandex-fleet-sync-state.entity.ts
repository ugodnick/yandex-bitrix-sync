import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  UpdateDateColumn,
  CreateDateColumn,
} from 'typeorm';
import { utcDateTimeTransformer } from '../../typeorm-transformers';
import { YandexFleetParkEntity } from '../park/yandex-fleet-park.entity';

export enum YandexFleetSyncType {
  Orders = 'orders',
  ProfilesNew = 'profiles_new',
  ProfilesExisting = 'profiles_existing',
  Transactions = 'transactions',
}

export enum YandexFleetSyncStatus {
  Idle = 'idle',
  Running = 'running',
  Failed = 'failed',
}

@Entity('yandex_fleet_sync_state')
@Index(['parkId', 'syncType'], { unique: true })
export class YandexFleetSyncStateEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', name: 'park_id' })
  parkId: string;

  @Column({ type: 'varchar', name: 'sync_type' })
  syncType: YandexFleetSyncType;

  @Column({
    type: 'datetime',
    name: 'last_synced_to',
    nullable: true,
    transformer: utcDateTimeTransformer,
  })
  lastSyncedTo: Date | null;

  @Column({
    type: 'datetime',
    name: 'last_run_at',
    nullable: true,
    transformer: utcDateTimeTransformer,
  })
  lastRunAt: Date | null;

  @Column({ type: 'varchar', default: YandexFleetSyncStatus.Idle })
  status: YandexFleetSyncStatus;

  @Column({ type: 'text', name: 'last_error', nullable: true })
  lastError: string | null;

  @Column({ type: 'int', name: 'retry_count', default: 0 })
  retryCount: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @CreateDateColumn({ name: 'create_at' })
  createAt: Date;

  @ManyToOne(() => YandexFleetParkEntity)
  @JoinColumn({ name: 'park_id', referencedColumnName: 'id' })
  park: YandexFleetParkEntity;
}
