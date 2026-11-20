import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('uis_employee_status_stat')
@Index(['statDate'])
export class UisEmployeeStatusStatEntity {
  @PrimaryColumn({ type: 'varchar', name: 'uis_id' })
  uisId: string;

  @Column({ type: 'varchar', name: 'employee_id' })
  employeeId: string;

  @Column({ type: 'varchar', name: 'stat_date' })
  statDate: string;

  @Column({ type: 'varchar', name: 'full_name', nullable: true })
  fullName: string | null;

  @Column({ type: 'integer', name: 'available_seconds', default: 0 })
  availableSeconds: number;

  @Column({ type: 'integer', name: 'break_seconds', default: 0 })
  breakSeconds: number;

  @Column({ type: 'integer', name: 'do_not_disturb_seconds', default: 0 })
  doNotDisturbSeconds: number;

  @Column({ type: 'integer', name: 'not_at_workplace_seconds', default: 0 })
  notAtWorkplaceSeconds: number;

  @Column({ type: 'integer', name: 'not_at_work_seconds', default: 0 })
  notAtWorkSeconds: number;

  @Column({ type: 'integer', name: 'auto_out_call_seconds', default: 0 })
  autoOutCallSeconds: number;

  @Column({ type: 'integer', name: 'unknown_seconds', default: 0 })
  unknownSeconds: number;

  @Column({ type: 'text', name: 'groups', nullable: true })
  groups: string | null;

  @Column({ type: 'text', name: 'status_stats', nullable: true })
  statusStats: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
