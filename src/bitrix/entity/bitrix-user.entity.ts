import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('bitrix_user')
export class BitrixUserEntity {
  @PrimaryColumn({ type: 'varchar', name: 'bitrix_id' })
  bitrixId: string;

  @Column({ type: 'varchar', name: 'full_name', default: '' })
  fullName: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
