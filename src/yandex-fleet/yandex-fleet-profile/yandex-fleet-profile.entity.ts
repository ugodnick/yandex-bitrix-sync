import { Entity, PrimaryColumn, Column, UpdateDateColumn, CreateDateColumn } from 'typeorm';

@Entity('yandex_fleet_profile')
export class YandexFleetProfileEntity {
  @PrimaryColumn({ type: 'varchar' })
  yandexProfileId: string;

  @Column({ type: 'varchar', name: 'park_id' })
  parkId: string;

  @Column({ type: 'varchar', name: 'bitrix_contact_id' })
  bitrixContactId: string;

  @Column({ type: 'varchar', name: 'bitrix_deal_id' })
  bitrixDealId: string;

  @Column({ type: 'varchar', name: 'bitrix_stage_id' })
  bitrixStageId: string;

  @Column({ type: 'date', name: 'hire_date' })
  hireDate: Date;

  @Column({ type: 'varchar', name: 'data_hash' })
  dataHash: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @CreateDateColumn({ name: 'create_at' })
  createAt: Date;
}
