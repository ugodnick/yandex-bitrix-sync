import { UisCallEntity } from './entity/uis-call.entity';
import { UisCallLegEntity } from './entity/uis-call-leg.entity';
import {
  UisEmployeeEntity,
  UisEmployeeGroupEntity,
  UisEmployeePositionEntity,
  UisScenarioEntity,
  UisSipLineEntity,
  UisStatusEntity,
  UisVirtualNumberEntity,
} from './entity/uis-directory.entity';
import { parseUisDateTime } from './uis-date';
import type { UisRow } from './uis-client';

function text(row: UisRow, key: string): string | null {
  const value = row[key];
  if (value === undefined || value === null || value === '') return null;
  return String(value);
}

function integer(row: UisRow, key: string): number | null {
  const value = row[key];
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function flag(row: UisRow, key: string): boolean | null {
  const value = row[key];
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return null;
}

function jsonText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
}

function nestedText(row: UisRow, objectKey: string, field: string): string | null {
  const value = row[objectKey];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return text(value as UisRow, field);
}

function rawJson(row: UisRow): string {
  return JSON.stringify(row);
}

export function callRowToEntity(row: UisRow): UisCallEntity | null {
  const id = text(row, 'id');
  if (!id) return null;

  const entity = new UisCallEntity();
  entity.uisId = id;
  entity.startTime = parseUisDateTime(row.start_time);
  entity.finishTime = parseUisDateTime(row.finish_time);
  entity.finishReason = text(row, 'finish_reason');
  entity.direction = text(row, 'direction');
  entity.isLost = flag(row, 'is_lost');
  entity.contactPhoneNumber = text(row, 'contact_phone_number');
  entity.virtualPhoneNumber = text(row, 'virtual_phone_number');
  entity.communicationId = text(row, 'communication_id');
  entity.source = text(row, 'source');
  entity.waitDuration = integer(row, 'wait_duration');
  entity.totalWaitDuration = integer(row, 'total_wait_duration');
  entity.talkDuration = integer(row, 'talk_duration');
  entity.cleanTalkDuration = integer(row, 'clean_talk_duration');
  entity.totalDuration = integer(row, 'total_duration');
  entity.postprocessDuration = integer(row, 'postprocess_duration');
  entity.scenarioId = text(row, 'scenario_id');
  entity.scenarioName = text(row, 'scenario_name');
  entity.lastAnsweredEmployeeId = text(row, 'last_answered_employee_id');
  entity.lastAnsweredEmployeeFullName = text(row, 'last_answered_employee_full_name');
  entity.firstTalkedEmployeeId = text(row, 'first_talked_employee_id');
  entity.firstTalkedEmployeeFullName = text(row, 'first_talked_employee_full_name');
  entity.operatorPhoneNumber = text(row, 'operator_phone_number');
  entity.callRecords = jsonText(row.call_records);
  entity.fullRecordFileLink = text(row, 'full_record_file_link');
  entity.employees = jsonText(row.employees);
  entity.tags = jsonText(row.tags);
  entity.rawJson = rawJson(row);
  return entity;
}

export function callLegRowToEntity(row: UisRow): UisCallLegEntity | null {
  const id = text(row, 'id');
  if (!id) return null;

  const entity = new UisCallLegEntity();
  entity.uisId = id;
  entity.callSessionId = text(row, 'call_session_id');
  entity.startTime = parseUisDateTime(row.start_time);
  entity.connectTime = parseUisDateTime(row.connect_time);
  entity.duration = integer(row, 'duration');
  entity.totalDuration = integer(row, 'total_duration');
  entity.finishReason = text(row, 'finish_reason');
  entity.finishReasonDescription = text(row, 'finish_reason_description');
  entity.virtualPhoneNumber = text(row, 'virtual_phone_number');
  entity.callingPhoneNumber = text(row, 'calling_phone_number');
  entity.calledPhoneNumber = text(row, 'called_phone_number');
  entity.direction = text(row, 'direction');
  entity.isTransfered = flag(row, 'is_transfered');
  entity.isOperator = flag(row, 'is_operator');
  entity.isFailed = flag(row, 'is_failed');
  entity.isTalked = flag(row, 'is_talked');
  entity.employeeId = text(row, 'employee_id');
  entity.employeeFullName = text(row, 'employee_full_name');
  entity.employeePhoneNumber = text(row, 'employee_phone_number');
  entity.scenarioId = text(row, 'scenario_id');
  entity.scenarioName = text(row, 'scenario_name');
  entity.groupId = text(row, 'group_id');
  entity.groupName = text(row, 'group_name');
  entity.actionId = text(row, 'action_id');
  entity.actionName = text(row, 'action_name');
  entity.callRecords = jsonText(row.call_records);
  entity.rawJson = rawJson(row);
  return entity;
}

export function employeeRowToEntity(row: UisRow): UisEmployeeEntity | null {
  const id = text(row, 'id');
  if (!id) return null;

  const entity = new UisEmployeeEntity();
  entity.uisId = id;
  entity.fullName = text(row, 'full_name');
  entity.firstName = text(row, 'first_name');
  entity.lastName = text(row, 'last_name');
  entity.patronymic = text(row, 'patronymic');
  entity.email = text(row, 'email');
  entity.status = text(row, 'status');
  entity.statusId = text(row, 'status_id');
  entity.extensionPhoneNumber = nestedText(row, 'extension', 'extension_phone_number');
  entity.phoneNumbers = jsonText(row.phone_numbers);
  entity.groups = jsonText(row.groups);
  entity.callRecording = text(row, 'call_recording');
  entity.rawJson = rawJson(row);
  return entity;
}

export function employeeGroupRowToEntity(row: UisRow): UisEmployeeGroupEntity | null {
  const id = text(row, 'id');
  if (!id) return null;

  const entity = new UisEmployeeGroupEntity();
  entity.uisId = id;
  entity.name = text(row, 'name') ?? text(row, 'group_name');
  entity.rawJson = rawJson(row);
  return entity;
}

export function employeePositionRowToEntity(row: UisRow): UisEmployeePositionEntity | null {
  const id = text(row, 'id');
  if (!id) return null;

  const entity = new UisEmployeePositionEntity();
  entity.uisId = id;
  entity.name = text(row, 'name');
  entity.rawJson = rawJson(row);
  return entity;
}

export function statusRowToEntity(row: UisRow): UisStatusEntity | null {
  const id = text(row, 'id');
  if (!id) return null;

  const entity = new UisStatusEntity();
  entity.uisId = id;
  entity.name = text(row, 'name') ?? text(row, 'description');
  entity.mnemonic = text(row, 'mnemonic');
  entity.rawJson = rawJson(row);
  return entity;
}

export function sipLineRowToEntity(row: UisRow): UisSipLineEntity | null {
  const id = text(row, 'id');
  if (!id) return null;

  const entity = new UisSipLineEntity();
  entity.uisId = id;
  entity.phoneNumber = text(row, 'phone_number');
  entity.type = text(row, 'type');
  entity.channelsCount = integer(row, 'channels_count');
  entity.billingState = text(row, 'billing_state');
  entity.physicalState = text(row, 'physical_state');
  entity.virtualPhoneNumber = text(row, 'virtual_phone_number');
  entity.status = text(row, 'status');
  entity.employeeId = text(row, 'employee_id');
  entity.employeeFullName = text(row, 'employee_full_name');
  entity.ipAddresses = jsonText(row.ip_addresses);
  entity.rawJson = rawJson(row);
  return entity;
}

export function virtualNumberRowToEntity(row: UisRow): UisVirtualNumberEntity | null {
  const id = text(row, 'id');
  if (!id) return null;

  const entity = new UisVirtualNumberEntity();
  entity.uisId = id;
  entity.virtualPhoneNumber = text(row, 'virtual_phone_number');
  entity.redirectionPhoneNumber = text(row, 'redirection_phone_number');
  entity.activationDate = parseUisDateTime(row.activation_date);
  entity.status = text(row, 'status');
  entity.category = text(row, 'category');
  entity.type = text(row, 'type');
  entity.name = text(row, 'name');
  entity.comment = text(row, 'comment');
  entity.campaigns = jsonText(row.campaigns);
  entity.scenarios = jsonText(row.scenarios);
  entity.rawJson = rawJson(row);
  return entity;
}

export function scenarioRowToEntity(row: UisRow): UisScenarioEntity | null {
  const id = text(row, 'id');
  if (!id) return null;

  const entity = new UisScenarioEntity();
  entity.uisId = id;
  entity.name = text(row, 'name');
  entity.virtualPhoneNumbers = jsonText(row.virtual_phone_numbers);
  entity.operations = jsonText(row.operations);
  entity.rawJson = rawJson(row);
  return entity;
}
