import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { OrderStatus } from '../yandex-fleet.type';

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

  @Column({ type: 'datetime', name: 'booked_at' })
  bookedAt: Date;

  @Column({ type: 'varchar', name: 'price', default: 'Неизвестно' })
  price: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @CreateDateColumn({ name: 'create_at' })
  createAt: Date;
}
