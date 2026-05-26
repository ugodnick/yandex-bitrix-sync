import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { utcDateTimeTransformer } from '../../typeorm-transformers';

@Entity('bitrix_deal')
export class BitrixDealEntity {
  @PrimaryColumn({ type: 'varchar', name: 'bitrix_id' })
  bitrixId: string;

  @Column({ type: 'varchar', name: 'contact_id', nullable: true })
  contactId: string | null;

  @Column({
    type: 'datetime',
    name: 'date_create',
    nullable: true,
    transformer: utcDateTimeTransformer,
  })
  dateCreate: Date | null;

  @Column({
    type: 'datetime',
    name: 'date_modify',
    nullable: true,
    transformer: utcDateTimeTransformer,
  })
  dateModify: Date | null;

  @Column({ type: 'text', name: 'dispatcher_raw', nullable: true })
  dispatcherRaw: string | null;

  @Column({ type: 'varchar', name: 'profile_id', nullable: true })
  profileId: string | null;

  @Column({ type: 'varchar', name: 'vacancy_raw', nullable: true })
  vacancyRaw: string | null;

  @Column({ type: 'varchar', name: 'aggregator_raw', nullable: true })
  aggregatorRaw: string | null;

  @Column({ type: 'text', nullable: true })
  comments: string | null;

  @Column({ type: 'varchar', name: 'stage_id', nullable: true })
  stageId: string | null;

  @Column({ type: 'varchar', name: 'source_id', nullable: true })
  sourceId: string | null;

  @Column({ type: 'varchar', name: 'source_description', nullable: true })
  sourceDescription: string | null;

  @Column({ type: 'varchar', nullable: true })
  city: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
