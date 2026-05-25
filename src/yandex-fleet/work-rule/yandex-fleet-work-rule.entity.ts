import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('yandex_fleet_work_rules')
export class YandexFleetWorkRuleEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @PrimaryColumn({ type: 'varchar', name: 'park_id' })
  parkId: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'boolean', default: true, name: 'is_enabled' })
  isEnabled: boolean;

  @Column({ type: 'integer', nullable: true, name: 'bitrix_enum_id' })
  bitrixEnumId: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @CreateDateColumn({ name: 'create_at' })
  createAt: Date;
}
