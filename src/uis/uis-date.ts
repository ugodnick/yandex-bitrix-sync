const UIS_TIMEZONE = 'Asia/Vladivostok';

/** UIS rejects a report interval longer than 3 months. 89 days stays inside that cap. */
export const UIS_MAX_WINDOW_MS = 89 * 24 * 60 * 60 * 1000;

export function formatUisDateTime(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: UIS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '00';
  const hour = pick('hour') === '24' ? '00' : pick('hour');
  return `${pick('year')}-${pick('month')}-${pick('day')} ${hour}:${pick('minute')}:${pick('second')}`;
}

export function parseUisDateTime(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const [, year, month, day, hour, minute, second] = match;
  const parsed = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+10:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function reportWindows(from: Date, till: Date): Array<{ from: Date; till: Date }> {
  if (till.getTime() <= from.getTime()) return [];

  const windows: Array<{ from: Date; till: Date }> = [];
  let cursor = from.getTime();
  const end = till.getTime();
  while (cursor < end) {
    const next = Math.min(end, cursor + UIS_MAX_WINDOW_MS);
    windows.push({ from: new Date(cursor), till: new Date(next) });
    cursor = next;
  }
  return windows;
}
