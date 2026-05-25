import {
  Entity,
  PrimaryColumn,
  Column,
  UpdateDateColumn,
  CreateDateColumn,
  OneToMany,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { dateTransformer, utcDateTimeTransformer } from '../../typeorm-transformers';
import { YandexFleetOrderEntity } from '../yandex-fleet-order/yandex-fleet-order.entity';
import { YandexFleetParkEntity } from '../yandex-fleet-park/yandex-park.entity';

@Entity('yandex_fleet_profile')
export class YandexFleetProfileEntity {
  @PrimaryColumn({ type: 'varchar', name: 'yandex_profile_id' })
  yandexProfileId: string;

  @Column({ type: 'varchar', name: 'park_id' })
  parkId: string;

  @Column({ type: 'varchar', name: 'bitrix_contact_id' })
  bitrixContactId: string;

  @Column({ type: 'varchar', name: 'bitrix_deal_id' })
  bitrixDealId: string;

  @Column({ type: 'varchar', name: 'bitrix_stage_id' })
  bitrixStageId: string;

  @Column({
    type: 'date',
    name: 'hire_date',
    nullable: true,
    transformer: dateTransformer,
  })
  hiredAt: Date | null;

  @Column({
    type: 'datetime',
    name: 'fleet_created_date',
    nullable: false,
    transformer: utcDateTimeTransformer,
  })
  fleetCreatedAt: Date;

  @Column({ type: 'varchar', name: 'data_hash' })
  dataHash: string;

  @Column({ type: 'varchar', name: 'first_name' })
  firstName: string;

  @Column({ type: 'varchar', name: 'last_name' })
  lastName: string;

  @Column({ type: 'varchar', name: 'middle_name', nullable: true })
  middleName: string | null;

  @Column({ type: 'varchar', name: 'phone', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', name: 'employment_type' })
  employmentType: string;

  @Column({ type: 'varchar', name: 'work_rule_id' })
  workRuleId: string;

  @Column({ type: 'varchar', name: 'vehicle_type', nullable: true })
  vehicleType: string | null;

  @Column({
    type: 'datetime',
    name: 'first_order_date',
    nullable: true,
    transformer: utcDateTimeTransformer,
  })
  firstOrderDate: Date | null;

  @Column({
    type: 'datetime',
    name: 'last_order_date',
    nullable: true,
    transformer: utcDateTimeTransformer,
  })
  lastOrderDate: Date | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @CreateDateColumn({ name: 'create_at' })
  createAt: Date;

  @ManyToOne(() => YandexFleetParkEntity, (park) => park.profiles)
  @JoinColumn({ name: 'park_id', referencedColumnName: 'id' })
  park: YandexFleetParkEntity;

  @OneToMany(() => YandexFleetOrderEntity, (order) => order.profile)
  orders: YandexFleetOrderEntity[];
}
