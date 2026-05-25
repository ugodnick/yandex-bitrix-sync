import {
  Index,
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  UpdateDateColumn,
  CreateDateColumn,
} from 'typeorm';
import { YandexFleetParkEntity } from '../park/yandex-fleet-park.entity';
import { utcDateTimeTransformer } from '../../typeorm-transformers';
import { YandexFleetProfileEntity } from '../profile/yandex-fleet-profile.entity';
import { YandexFleetOrderEntity } from '../order/yandex-fleet-order.entity';

@Index(['profileId', 'eventAt'])
@Index(['orderId'])
@Entity('yandex_fleet_transaction')
export class YandexFleetTransactionEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: 'varchar', name: 'park_id' })
  @Index()
  parkId: string;

  @Column({ type: 'varchar', name: 'profile_id' })
  @Index()
  profileId: string;

  @Column({ type: 'varchar', name: 'order_id', nullable: true })
  orderId: string | null;

  @Column({ type: 'varchar', name: 'category_id' })
  categoryId: string;

  @Column({ type: 'varchar', name: 'category_name' })
  categoryName: string;

  @Column({ type: 'varchar', name: 'amount' })
  amount: string;

  @Column({
    type: 'datetime',
    name: 'event_at',
    transformer: utcDateTimeTransformer,
  })
  eventAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @CreateDateColumn({ name: 'create_at' })
  createAt: Date;

  @ManyToOne(() => YandexFleetParkEntity)
  @JoinColumn({ name: 'park_id', referencedColumnName: 'id' })
  park: YandexFleetParkEntity;

  @ManyToOne(() => YandexFleetOrderEntity, { nullable: true })
  @JoinColumn({ name: 'order_id', referencedColumnName: 'id' })
  order: YandexFleetOrderEntity | null;

  @ManyToOne(() => YandexFleetProfileEntity)
  @JoinColumn({ name: 'profile_id', referencedColumnName: 'yandexProfileId' })
  profile: YandexFleetProfileEntity | null;
}
