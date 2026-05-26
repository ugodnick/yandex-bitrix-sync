import { BITRIX_FIELDS } from './deal/bitrix-deal.type';
import type { BitrixCallStatistic } from './call/bitrix-call.type';
import type { BitrixContactFields } from './contact/bitrix-contact.type';
import type { BitrixDealFields } from './deal/bitrix-deal.type';
import type { BitrixUser } from './call/bitrix-call.type';
import { BitrixCallEntity } from './entity/bitrix-call.entity';
import { BitrixContactEntity } from './entity/bitrix-contact.entity';
import { BitrixDealEntity } from './entity/bitrix-deal.entity';
import { BitrixUserEntity } from './entity/bitrix-user.entity';
import { formatContactPhone, formatUserFullName } from './bitrix-sheet.utils';

export function parseBitrixDate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isEmptyBitrixValue(value: unknown): boolean {
  return value === undefined || value === null || value === '' || value === false;
}

export function serializeDispatcher(value: unknown): string | null {
  if (isEmptyBitrixValue(value)) return null;
  if (Array.isArray(value)) return value.map(String).join(',');
  return String(value);
}

export function serializeUfValue(value: unknown): string | null {
  if (isEmptyBitrixValue(value)) return null;
  if (Array.isArray(value)) return value.map(String).join(',');
  return String(value);
}

export function contactFieldsToEntity(fields: BitrixContactFields): BitrixContactEntity {
  const entity = new BitrixContactEntity();
  entity.bitrixId = String(fields.ID);
  entity.firstName = fields.NAME ?? null;
  entity.lastName = fields.LAST_NAME ?? null;
  entity.secondName = fields.SECOND_NAME ?? null;
  entity.phone = formatContactPhone(fields) || null;
  entity.bitrixModifiedAt = parseBitrixDate(
    (fields as BitrixContactFields & { DATE_MODIFY?: string }).DATE_MODIFY,
  );
  return entity;
}

export function dealFieldsToEntity(fields: BitrixDealFields): BitrixDealEntity {
  const entity = new BitrixDealEntity();
  entity.bitrixId = String(fields.ID);
  entity.contactId = fields.CONTACT_ID != null ? String(fields.CONTACT_ID) : null;
  entity.dateCreate = parseBitrixDate(fields.DATE_CREATE);
  entity.dateModify = parseBitrixDate(fields.DATE_MODIFY);
  entity.dispatcherRaw = serializeDispatcher(fields[BITRIX_FIELDS.DISPATCHER]);
  entity.profileId = serializeUfValue(fields[BITRIX_FIELDS.PROFILE_ID]);
  entity.vacancyRaw = serializeUfValue(fields[BITRIX_FIELDS.VACANCY]);
  entity.aggregatorRaw = serializeUfValue(fields[BITRIX_FIELDS.AGGREGATOR]);
  entity.comments = fields.COMMENTS ?? null;
  entity.stageId = fields.STAGE_ID ?? null;
  entity.sourceId = fields.SOURCE_ID ?? null;
  entity.sourceDescription = fields.SOURCE_DESCRIPTION ?? null;
  entity.city = serializeUfValue(fields[BITRIX_FIELDS.CITY]);
  return entity;
}

export function callStatisticToEntity(
  call: BitrixCallStatistic,
  managerName: string,
): BitrixCallEntity {
  const entity = new BitrixCallEntity();
  entity.bitrixId = call.ID;
  entity.portalUserId = call.PORTAL_USER_ID ?? null;
  entity.managerName = managerName;
  entity.phoneNumber = call.PHONE_NUMBER ?? null;
  entity.callType = call.CALL_TYPE ?? null;
  entity.callDuration = call.CALL_DURATION ?? null;
  entity.callStartDate = parseBitrixDate(call.CALL_START_DATE) ?? new Date();
  entity.callFailedCode = call.CALL_FAILED_CODE ?? null;
  entity.callFailedReason = call.CALL_FAILED_REASON ?? null;
  entity.crmEntityType = call.CRM_ENTITY_TYPE ?? null;
  entity.crmEntityId = call.CRM_ENTITY_ID ?? null;
  return entity;
}

export function userToEntity(user: BitrixUser): BitrixUserEntity {
  const entity = new BitrixUserEntity();
  entity.bitrixId = user.ID;
  entity.fullName = formatUserFullName(user);
  return entity;
}

export function contactEntityDisplayName(entity: BitrixContactEntity): string {
  return [entity.lastName, entity.firstName, entity.secondName].filter(Boolean).join(' ').trim();
}
