import {
  BITRIX_AGGREGATOR_LABELS,
  BITRIX_SOURCE_LABELS,
  BITRIX_STAGE_LABELS,
  BITRIX_VACANCY_LABELS,
} from './bitrix-sheet-labels';
import type { BitrixCallStatistic, BitrixCallType } from './call/bitrix-call.type';
import type { BitrixContactFields } from './contact/bitrix-contact.type';
import type { BitrixUser } from './call/bitrix-call.type';

const EXPORT_TIMEZONE = 'Asia/Vladivostok';

const CALL_TYPE_LABELS: Record<BitrixCallType, string> = {
  '1': 'Исходящий',
  '2': 'Входящий',
  '3': 'Входящий с переадресацией',
  '4': 'Callback',
  '5': 'Информационный',
};

const CALL_STATUS_LABELS: Record<string, string> = {
  '200': 'Успешный',
  '304': 'Пропущенный',
  '603': 'Отклонён',
  '603-S': 'Отменён',
  '403': 'Запрещён',
  '404': 'Неверный номер',
  '486': 'Занято',
  '484': 'Направление недоступно',
  '503': 'Направление недоступно',
  '480': 'Временно недоступен',
  '402': 'Недостаточно средств',
  '423': 'Заблокирован',
  OTHER: 'Другое',
};

export function formatBitrixDateInTz(iso?: string, withTime = true): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const options: Intl.DateTimeFormatOptions = {
    timeZone: EXPORT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(withTime && {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }),
  };

  return new Intl.DateTimeFormat('ru-RU', options).format(date);
}

export function formatBitrixDateOnly(iso?: string): string {
  return formatBitrixDateInTz(iso, false);
}

export function formatBitrixTimeOnly(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: EXPORT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatContactFullName(contact: BitrixContactFields): string {
  return [contact.LAST_NAME, contact.NAME, contact.SECOND_NAME].filter(Boolean).join(' ').trim();
}

export function formatContactPhone(contact: BitrixContactFields): string {
  return contact.PHONE?.[0]?.VALUE ?? '';
}

export function formatUserFullName(user?: BitrixUser): string {
  if (!user) return '';
  return [user.LAST_NAME, user.NAME, user.SECOND_NAME].filter(Boolean).join(' ').trim();
}

export function toSheetString(value: unknown): string {
  if (value === undefined || value === null || value === false) return '';
  const text = String(value);
  return text === 'false' ? '' : text;
}

export function resolveListLabel(
  labels: Record<string, string>,
  value: string | number | undefined | null,
): string {
  if (value === undefined || value === null || value === '') return '';
  const id = Array.isArray(value) ? value[0] : value;
  return labels[String(id)] ?? String(id);
}

export function resolveAggregatorLabel(value: unknown): string {
  return resolveListLabel(BITRIX_AGGREGATOR_LABELS, value as string | number);
}

export function resolveVacancyLabel(value: unknown): string {
  return resolveListLabel(BITRIX_VACANCY_LABELS, value as string | number);
}

export function resolveStageLabel(stageId?: string | null): string {
  if (!stageId) return '';
  return BITRIX_STAGE_LABELS[stageId] ?? stageId;
}

export function resolveSourceLabel(sourceId?: string | null): string {
  return resolveListLabel(BITRIX_SOURCE_LABELS, sourceId);
}

export function resolveDispatcherName(
  dispatcherRaw: string | null | undefined,
  dispatcherNamesByBitrixId: ReadonlyMap<string, string>,
): string {
  if (!dispatcherRaw) return '';

  return dispatcherRaw
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .map((id) => dispatcherNamesByBitrixId.get(id) ?? id)
    .join(', ');
}

export function formatCallDuration(secondsRaw?: string | null): string {
  if (secondsRaw === undefined || secondsRaw === null || secondsRaw === '') return '';
  const total = Number(secondsRaw);
  if (Number.isNaN(total) || total < 0) return secondsRaw;

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = Math.floor(total % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatCallType(type: BitrixCallType): string {
  return CALL_TYPE_LABELS[type] ?? type;
}

export function formatCallStatus(call: BitrixCallStatistic): string {
  return formatCallStatusCode(call.CALL_FAILED_CODE, call.CALL_FAILED_REASON);
}

export function formatCallStatusCode(code?: string | null, reason?: string | null): string {
  if (code && CALL_STATUS_LABELS[code]) return CALL_STATUS_LABELS[code];
  if (reason) return reason;
  return code ?? '';
}

const UTC_PLUS_10_OFFSET = '+10:00';

function getZonedParts(date: Date, timeZone: string): Record<string, string> {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  return Object.fromEntries(
    parts.filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]),
  );
}

function toIsoInUtcPlus10(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}${UTC_PLUS_10_OFFSET}`;
}

export function toIsoPeriodStartMonthsAgo(months: number): string {
  const parts = getZonedParts(new Date(), EXPORT_TIMEZONE);
  const anchor = new Date(
    `${parts.year}-${parts.month}-${parts.day}T00:00:00${UTC_PLUS_10_OFFSET}`,
  );
  anchor.setMonth(anchor.getMonth() - months);

  const start = getZonedParts(anchor, EXPORT_TIMEZONE);
  return toIsoInUtcPlus10(Number(start.year), Number(start.month), Number(start.day), 0, 0, 0);
}

export function toIsoPeriodEnd(): string {
  const parts = getZonedParts(new Date(), EXPORT_TIMEZONE);
  return toIsoInUtcPlus10(Number(parts.year), Number(parts.month), Number(parts.day), 23, 59, 59);
}

export function formatExportTitleDate(): string {
  return formatBitrixDateInTz(new Date().toISOString(), false);
}
