import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { utcDateTimeTransformer } from '../../typeorm-transformers';
import { OrderStatus } from './yandex-fleet-order.type';
import { YandexFleetProfileEntity } from '../profile/yandex-fleet-profile.entity';
import { YandexFleetParkEntity } from '../park/yandex-fleet-park.entity';
import { YandexFleetTransactionEntity } from '../transaction/yandex-fleet-transaction.entity';

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

  @Column({ type: 'varchar', name: 'cancellation_description', nullable: true })
  cancellationDescription: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @CreateDateColumn({ name: 'create_at' })
  createAt: Date;

  @ManyToOne(() => YandexFleetProfileEntity, (profile) => profile.orders)
  @JoinColumn({ name: 'profile_id', referencedColumnName: 'yandexProfileId' })
  profile: YandexFleetProfileEntity;

  @ManyToOne(() => YandexFleetParkEntity, (park) => park.orders)
  @JoinColumn({ name: 'park_id', referencedColumnName: 'id' })
  park: YandexFleetParkEntity;

  @OneToMany(() => YandexFleetTransactionEntity, (tx) => tx.order)
  transactions: YandexFleetTransactionEntity[];
}
