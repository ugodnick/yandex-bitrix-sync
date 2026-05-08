import { PrimaryColumn, Column, UpdateDateColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { Entity } from 'typeorm/decorator/entity/Entity';
import { YandexFleetOrderEntity } from './yandex-fleet-order/yandex-fleet-order.entity';
import { YandexFleetProfileEntity } from './yandex-fleet-profile/yandex-fleet-profile.entity';

export enum YandexFleetParkType {
  Delivery = 'delivery',
  Taxi = 'taxi',
}

@Entity('yandex_fleet_park')
export class YandexFleetParkEntity {
  @PrimaryColumn({ type: 'varchar', name: 'id' })
  id: string;

  @Column({ type: 'varchar', name: 'bitrix_dispatcher_id', nullable: true })
  bitrixDispatcherId: string | null;

  @Column({ type: 'varchar', name: 'name' })
  name: string;

  @Column({ type: 'varchar', name: 'type' })
  type: YandexFleetParkType;

  @Column({ type: 'varchar', name: 'api_key' })
  apiKey: string;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @CreateDateColumn({ name: 'create_at' })
  createAt: Date;

  @OneToMany(() => YandexFleetProfileEntity, (profile) => profile.park)
  profiles: YandexFleetProfileEntity[];

  @OneToMany(() => YandexFleetOrderEntity, (order) => order.park)
  orders: YandexFleetOrderEntity[];
}
