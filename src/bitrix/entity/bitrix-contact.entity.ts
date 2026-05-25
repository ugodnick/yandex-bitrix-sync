import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { utcDateTimeTransformer } from '../../typeorm-transformers';

@Entity('bitrix_contact')
export class BitrixContactEntity {
  @PrimaryColumn({ type: 'varchar', name: 'bitrix_id' })
  bitrixId: string;

  @Column({ type: 'varchar', name: 'first_name', nullable: true })
  firstName: string | null;

  @Column({ type: 'varchar', name: 'last_name', nullable: true })
  lastName: string | null;

  @Column({ type: 'varchar', name: 'second_name', nullable: true })
  secondName: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({
    type: 'datetime',
    name: 'bitrix_modified_at',
    nullable: true,
    transformer: utcDateTimeTransformer,
  })
  bitrixModifiedAt: Date | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
