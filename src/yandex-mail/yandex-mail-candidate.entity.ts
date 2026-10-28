import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { utcDateTimeTransformer } from '../typeorm-transformers';

export const YandexMailCandidateStatus = {
  Parsed: 'parsed',
  ParseFailed: 'parse_failed',
  Applied: 'applied',
} as const;

export type YandexMailCandidateStatus =
  (typeof YandexMailCandidateStatus)[keyof typeof YandexMailCandidateStatus];

@Entity('yandex_mail_candidate')
@Index('idx_yandex_mail_candidate_phone', ['phoneDigits'])
export class YandexMailCandidateEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', name: 'message_id', unique: true })
  messageId: string;

  @Column({
    type: 'datetime',
    name: 'received_at',
    nullable: true,
    transformer: utcDateTimeTransformer,
  })
  receivedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  subject: string | null;

  @Column({ type: 'varchar', name: 'full_name', nullable: true })
  fullName: string | null;

  @Column({ type: 'varchar', name: 'phone_raw', nullable: true })
  phoneRaw: string | null;

  @Column({ type: 'varchar', name: 'phone_digits', nullable: true })
  phoneDigits: string | null;

  @Column({ type: 'varchar', name: 'park_name', nullable: true })
  parkName: string | null;

  @Column({ type: 'varchar', name: 'park_id', nullable: true })
  parkId: string | null;

  @Column({ type: 'varchar', name: 'source_raw', nullable: true })
  sourceRaw: string | null;

  @Column({ type: 'varchar' })
  status: YandexMailCandidateStatus;

  @Column({ type: 'varchar', name: 'bitrix_deal_id', nullable: true })
  bitrixDealId: string | null;

  @Column({
    type: 'datetime',
    name: 'applied_at',
    nullable: true,
    transformer: utcDateTimeTransformer,
  })
  appliedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
