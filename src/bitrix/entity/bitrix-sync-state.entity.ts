import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { utcDateTimeTransformer } from '../../typeorm-transformers';

export enum BitrixSyncType {
  Contacts = 'contacts',
  Deals = 'deals',
  Calls = 'calls',
  Users = 'users',
}

@Entity('bitrix_sync_state')
@Index(['syncType'], { unique: true })
export class BitrixSyncStateEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', name: 'sync_type' })
  syncType: BitrixSyncType;

  @Column({
    type: 'datetime',
    name: 'last_synced_to',
    nullable: true,
    transformer: utcDateTimeTransformer,
  })
  lastSyncedTo: Date | null;

  @Column({
    type: 'datetime',
    name: 'last_full_sync_at',
    nullable: true,
    transformer: utcDateTimeTransformer,
  })
  lastFullSyncAt: Date | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
