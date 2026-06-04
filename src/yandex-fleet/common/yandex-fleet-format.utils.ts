export const formatDateForBitrix = (dateStr?: string): string | undefined => {
  if (!dateStr) return undefined;
  return dateStr.substring(0, 10);
};

export const cleanPayload = (obj: Record<string, unknown>) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== ''),
  ) as Record<string, string | number | boolean | string[] | number[] | undefined>;
};

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ru-RU');
}

export const VLADIVOSTOK_UTC_OFFSET_MS = 10 * 60 * 60 * 1000;

const toVladivostokCalendar = (date: Date) => new Date(date.getTime() + VLADIVOSTOK_UTC_OFFSET_MS);

const fromVladivostokCalendarMidnight = (midnight: Date) =>
  new Date(midnight.getTime() - VLADIVOSTOK_UTC_OFFSET_MS);

export function getPreviousDayBoundsInVladivostok(reference = new Date()): {
  periodFrom: Date;
  periodTo: Date;
} {
  const calendar = toVladivostokCalendar(reference);
  const periodTo = new Date(
    Date.UTC(calendar.getUTCFullYear(), calendar.getUTCMonth(), calendar.getUTCDate()),
  );
  const periodFrom = new Date(periodTo);
  periodFrom.setUTCDate(periodFrom.getUTCDate() - 1);
  return {
    periodFrom: fromVladivostokCalendarMidnight(periodFrom),
    periodTo: fromVladivostokCalendarMidnight(periodTo),
  };
}

export function getPreviousWeekBoundsInVladivostok(reference = new Date()): {
  periodFrom: Date;
  periodTo: Date;
} {
  const calendar = toVladivostokCalendar(reference);
  const dayOfWeek = calendar.getUTCDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const periodTo = new Date(
    Date.UTC(calendar.getUTCFullYear(), calendar.getUTCMonth(), calendar.getUTCDate()),
  );
  periodTo.setUTCDate(periodTo.getUTCDate() - daysSinceMonday);

  const periodFrom = new Date(periodTo);
  periodFrom.setUTCDate(periodFrom.getUTCDate() - 7);

  return {
    periodFrom: fromVladivostokCalendarMidnight(periodFrom),
    periodTo: fromVladivostokCalendarMidnight(periodTo),
  };
}

export function getPreviousMonthBoundsInVladivostok(reference = new Date()): {
  periodFrom: Date;
  periodTo: Date;
} {
  const calendar = toVladivostokCalendar(reference);
  const year = calendar.getUTCFullYear();
  const month = calendar.getUTCMonth();

  return {
    periodFrom: fromVladivostokCalendarMidnight(new Date(Date.UTC(year, month - 1, 1))),
    periodTo: fromVladivostokCalendarMidnight(new Date(Date.UTC(year, month, 1))),
  };
}

export function formatDateInTz(date: Date, withTime = false): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Vladivostok',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  };

  if (withTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.second = '2-digit';
    options.hour12 = false;
  }

  return new Intl.DateTimeFormat('ru-RU', options).format(date);
}
