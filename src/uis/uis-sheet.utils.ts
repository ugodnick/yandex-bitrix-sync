import { formatBitrixDateInTz } from '../bitrix/bitrix-sheet.utils';
import { UisCallEntity } from './entity/uis-call.entity';

export function directionLabel(value: string | null): string {
  if (value === 'in') return 'Входящий';
  if (value === 'out') return 'Исходящий';
  return value ?? '';
}

export function yesNo(value: boolean | null): string {
  if (value === true) return 'Да';
  if (value === false) return 'Нет';
  return '';
}

export function formatDate(value: Date | null): string {
  return value ? formatBitrixDateInTz(value.toISOString(), true) : '';
}

export function formatDay(dayKey: string): string {
  const [year, month, day] = dayKey.split('-');
  if (!year || !month || !day) return dayKey;
  return `${day}.${month}.${year}`;
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.trunc(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

export function joinJson(json: string | null, key?: string): string {
  if (!json) return '';
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return '';
    return parsed
      .map((item) => {
        if (item === null || item === undefined) return '';
        if (typeof item === 'object') {
          if (!key) return '';
          const field = (item as Record<string, unknown>)[key];
          return field === null || field === undefined ? '' : String(field);
        }
        return String(item);
      })
      .filter(Boolean)
      .join(', ');
  } catch {
    return '';
  }
}

export function recordLinks(call: UisCallEntity): string {
  const links: string[] = [];
  if (call.fullRecordFileLink) links.push(call.fullRecordFileLink);
  if (!call.communicationId || !call.callRecords) return links.join('\n');

  try {
    const records = JSON.parse(call.callRecords) as unknown;
    if (!Array.isArray(records)) return links.join('\n');
    for (const record of records) {
      if (record === null || record === undefined || record === '') continue;
      links.push(`https://app.uiscom.ru/system/media/talk/${call.communicationId}/${record}/`);
    }
  } catch {
    return links.join('\n');
  }
  return links.join('\n');
}
