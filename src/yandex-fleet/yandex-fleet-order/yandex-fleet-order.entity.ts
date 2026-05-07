import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderStatus } from '../yandex-fleet.type';
import { YandexFleetProfileEntity } from '../yandex-fleet-profile/yandex-fleet-profile.entity';

export const utcDateTimeTransformer = {
  to: (value: Date | null | undefined) => {
    if (!value) return value;
    return value.toISOString();
  },
  from: (value: string | null) => {
    if (!value) return value;
    return new Date(value);
  },
};

@Index(['profileId', 'bookedAt'])
@Entity('yandex_fleet_order')
export class YandexFleetOrderEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: 'varchar', name: 'park_id' })
  @Index()
  parkId: string;

  @Column({ type: 'varchar', name: 'profile_id' })
  @Index()
  profileId: string;

  @Column({ type: 'varchar' })
  status: OrderStatus;

  @Column({
    type: 'datetime',
    name: 'booked_at',
    transformer: utcDateTimeTransformer,
  })
  bookedAt: Date;

  @Column({ type: 'varchar', name: 'price', default: 'Неизвестно' })
  price: string;

  @ManyToOne(() => YandexFleetProfileEntity, (profile) => profile.orders, {
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'profile_id' })
  profile: YandexFleetProfileEntity;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @CreateDateColumn({ name: 'create_at' })
  createAt: Date;
}
