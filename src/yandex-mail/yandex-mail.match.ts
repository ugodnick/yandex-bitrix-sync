import { BITRIX_DICT, BITRIX_FIELDS, type BitrixDealFields } from '../bitrix/deal/bitrix-deal.type';

export function normalizeMatchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/gi, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function parkNameMatches(emailParkName: string, parkName: string): boolean {
  const tokenWords = normalizeMatchText(emailParkName).split(' ').filter(Boolean);
  const parkWords = normalizeMatchText(parkName).split(' ').filter(Boolean);
  if (tokenWords.length === 0 || parkWords.length === 0) return false;
  return tokenWords.every((word) => parkWords.includes(word));
}

export function matchPark<T extends { name: string }>(emailParkName: string, parks: T[]): T | null {
  const matches = parks.filter((park) => parkNameMatches(emailParkName, park.name));
  if (matches.length !== 1) return null;
  return matches[0];
}

export function phonesMatch(left: string, right: string): boolean {
  const leftDigits = left.replace(/\D/g, '');
  const rightDigits = right.replace(/\D/g, '');
  if (leftDigits.length < 10 || rightDigits.length < 10) return false;
  return leftDigits.slice(-10) === rightDigits.slice(-10);
}

export function dispatcherMatches(
  dispatcherRaw: string | null | undefined,
  dispatcherId: string | null | undefined,
): boolean {
  if (!dispatcherRaw || !dispatcherId) return false;
  return dispatcherRaw
    .split(',')
    .map((part) => part.trim())
    .includes(dispatcherId);
}

const MAIL_SOURCES_ID = String(BITRIX_DICT.SOURCES.YANDEX_LANDING);

export function buildSourceFields(
  existingSourceId: string | null | undefined,
  existingSourcesRaw: string | null | undefined,
): Partial<BitrixDealFields> {
  const fields: Partial<BitrixDealFields> = {};

  if (!existingSourceId) {
    fields.SOURCE_ID = BITRIX_DICT.SOURCE.LANDING;
  }

  const ids = (existingSourcesRaw ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (!ids.includes(MAIL_SOURCES_ID)) {
    ids.push(MAIL_SOURCES_ID);
    fields[BITRIX_FIELDS.SOURCES] = ids.every((id) => /^\d+$/.test(id))
      ? ids.map((id) => Number(id))
      : ids;
  }

  return fields;
}
