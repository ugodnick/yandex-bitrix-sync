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

export enum YandexFleetSupplyHoursPeriodType {
  Month = 'month',
  Week = 'week',
  Day = 'day',
}

export enum YandexFleetSupplyHoursStatus {
  Success = 'success',
  Failed = 'failed',
}

@Entity('yandex_fleet_supply_hours')
@Index(['profileId', 'parkId', 'periodType', 'periodFrom', 'periodTo'], { unique: true })
export class YandexFleetSupplyHoursEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', name: 'profile_id' })
  profileId: string;

  @Column({ type: 'varchar', name: 'park_id' })
  parkId: string;

  @Column({ type: 'varchar', name: 'period_type' })
  periodType: YandexFleetSupplyHoursPeriodType;

  @Column({
    type: 'datetime',
    name: 'period_from',
    transformer: utcDateTimeTransformer,
  })
  periodFrom: Date;

  @Column({
    type: 'datetime',
    name: 'period_to',
    transformer: utcDateTimeTransformer,
  })
  periodTo: Date;

  @Column({ type: 'int', name: 'supply_duration_seconds', default: 0 })
  supplyDurationSeconds: number;

  @Column({ type: 'varchar' })
  status: YandexFleetSupplyHoursStatus;

  @Column({ type: 'text', name: 'last_error', nullable: true })
  lastError: string | null;

  @Column({
    type: 'datetime',
    name: 'synced_at',
    nullable: true,
    transformer: utcDateTimeTransformer,
  })
  syncedAt: Date | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @CreateDateColumn({ name: 'create_at' })
  createAt: Date;

  @ManyToOne(() => YandexFleetParkEntity)
  @JoinColumn({ name: 'park_id', referencedColumnName: 'id' })
  park: YandexFleetParkEntity;
}
