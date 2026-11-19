import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { utcDateTimeTransformer } from '../../typeorm-transformers';

@Entity('uis_employee')
export class UisEmployeeEntity {
  @PrimaryColumn({ type: 'varchar', name: 'uis_id' })
  uisId: string;

  @Column({ type: 'varchar', name: 'full_name', nullable: true })
  fullName: string | null;

  @Column({ type: 'varchar', name: 'first_name', nullable: true })
  firstName: string | null;

  @Column({ type: 'varchar', name: 'last_name', nullable: true })
  lastName: string | null;

  @Column({ type: 'varchar', name: 'patronymic', nullable: true })
  patronymic: string | null;

  @Column({ type: 'varchar', name: 'email', nullable: true })
  email: string | null;

  @Column({ type: 'varchar', name: 'status', nullable: true })
  status: string | null;

  @Column({ type: 'varchar', name: 'status_id', nullable: true })
  statusId: string | null;

  @Column({ type: 'varchar', name: 'extension_phone_number', nullable: true })
  extensionPhoneNumber: string | null;

  @Column({ type: 'text', name: 'phone_numbers', nullable: true })
  phoneNumbers: string | null;

  @Column({ type: 'text', name: 'groups', nullable: true })
  groups: string | null;

  @Column({ type: 'varchar', name: 'call_recording', nullable: true })
  callRecording: string | null;

  @Column({ type: 'text', name: 'raw_json', nullable: true })
  rawJson: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('uis_employee_group')
export class UisEmployeeGroupEntity {
  @PrimaryColumn({ type: 'varchar', name: 'uis_id' })
  uisId: string;

  @Column({ type: 'varchar', name: 'name', nullable: true })
  name: string | null;

  @Column({ type: 'text', name: 'raw_json', nullable: true })
  rawJson: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('uis_employee_position')
export class UisEmployeePositionEntity {
  @PrimaryColumn({ type: 'varchar', name: 'uis_id' })
  uisId: string;

  @Column({ type: 'varchar', name: 'name', nullable: true })
  name: string | null;

  @Column({ type: 'text', name: 'raw_json', nullable: true })
  rawJson: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('uis_status')
export class UisStatusEntity {
  @PrimaryColumn({ type: 'varchar', name: 'uis_id' })
  uisId: string;

  @Column({ type: 'varchar', name: 'name', nullable: true })
  name: string | null;

  @Column({ type: 'varchar', name: 'mnemonic', nullable: true })
  mnemonic: string | null;

  @Column({ type: 'text', name: 'raw_json', nullable: true })
  rawJson: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('uis_sip_line')
export class UisSipLineEntity {
  @PrimaryColumn({ type: 'varchar', name: 'uis_id' })
  uisId: string;

  @Column({ type: 'varchar', name: 'phone_number', nullable: true })
  phoneNumber: string | null;

  @Column({ type: 'varchar', name: 'type', nullable: true })
  type: string | null;

  @Column({ type: 'integer', name: 'channels_count', nullable: true })
  channelsCount: number | null;

  @Column({ type: 'varchar', name: 'billing_state', nullable: true })
  billingState: string | null;

  @Column({ type: 'varchar', name: 'physical_state', nullable: true })
  physicalState: string | null;

  @Column({ type: 'varchar', name: 'virtual_phone_number', nullable: true })
  virtualPhoneNumber: string | null;

  @Column({ type: 'varchar', name: 'status', nullable: true })
  status: string | null;

  @Column({ type: 'varchar', name: 'employee_id', nullable: true })
  employeeId: string | null;

  @Column({ type: 'varchar', name: 'employee_full_name', nullable: true })
  employeeFullName: string | null;

  @Column({ type: 'text', name: 'ip_addresses', nullable: true })
  ipAddresses: string | null;

  @Column({ type: 'text', name: 'raw_json', nullable: true })
  rawJson: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('uis_virtual_number')
export class UisVirtualNumberEntity {
  @PrimaryColumn({ type: 'varchar', name: 'uis_id' })
  uisId: string;

  @Column({ type: 'varchar', name: 'virtual_phone_number', nullable: true })
  virtualPhoneNumber: string | null;

  @Column({ type: 'varchar', name: 'redirection_phone_number', nullable: true })
  redirectionPhoneNumber: string | null;

  @Column({
    type: 'datetime',
    name: 'activation_date',
    nullable: true,
    transformer: utcDateTimeTransformer,
  })
  activationDate: Date | null;

  @Column({ type: 'varchar', name: 'status', nullable: true })
  status: string | null;

  @Column({ type: 'varchar', name: 'category', nullable: true })
  category: string | null;

  @Column({ type: 'varchar', name: 'type', nullable: true })
  type: string | null;

  @Column({ type: 'varchar', name: 'name', nullable: true })
  name: string | null;

  @Column({ type: 'text', name: 'comment', nullable: true })
  comment: string | null;

  @Column({ type: 'text', name: 'campaigns', nullable: true })
  campaigns: string | null;

  @Column({ type: 'text', name: 'scenarios', nullable: true })
  scenarios: string | null;

  @Column({ type: 'text', name: 'raw_json', nullable: true })
  rawJson: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('uis_scenario')
export class UisScenarioEntity {
  @PrimaryColumn({ type: 'varchar', name: 'uis_id' })
  uisId: string;

  @Column({ type: 'varchar', name: 'name', nullable: true })
  name: string | null;

  @Column({ type: 'text', name: 'virtual_phone_numbers', nullable: true })
  virtualPhoneNumbers: string | null;

  @Column({ type: 'text', name: 'operations', nullable: true })
  operations: string | null;

  @Column({ type: 'text', name: 'raw_json', nullable: true })
  rawJson: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
