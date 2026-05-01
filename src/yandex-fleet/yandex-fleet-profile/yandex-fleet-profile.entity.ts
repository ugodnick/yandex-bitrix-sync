import { Entity, PrimaryColumn, Column, UpdateDateColumn, CreateDateColumn } from 'typeorm';

const dateTransformer = {
  to: (value: Date | null) => value,
  from: (value: string | null) => (value ? new Date(value) : null),
};

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
    type: 'date',
    name: 'fleet_created_date',
    nullable: false,
    transformer: dateTransformer,
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

  @Column({ type: 'date', name: 'first_order_date', nullable: true, transformer: dateTransformer })
  firstOrderDate: Date | null;

  @Column({ type: 'date', name: 'last_order_date', nullable: true, transformer: dateTransformer })
  lastOrderDate: Date | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @CreateDateColumn({ name: 'create_at' })
  createAt: Date;
}
