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

export const DEFAULT_PARK_TIMEZONE = 'Asia/Vladivostok';

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, p.value]),
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function getZonedWeekday(date: Date, timeZone: string): number {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
  }).format(date);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[weekday] ?? 0;
}

/** UTC-момент для локальной стены времени в `timeZone`. */
function zonedLocalToUtc(
  year: number,
  month: number,
  day: number,
  timeZone: string,
  hour = 0,
  minute = 0,
  second = 0,
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const parts = getZonedParts(new Date(utcGuess), timeZone);
  const asIfUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return new Date(utcGuess + (utcGuess - asIfUtc));
}

export function getPreviousDayBoundsInTz(
  timeZone: string,
  reference = new Date(),
): {
  periodFrom: Date;
  periodTo: Date;
} {
  const calendar = getZonedParts(reference, timeZone);
  const periodTo = zonedLocalToUtc(calendar.year, calendar.month, calendar.day, timeZone);
  const prev = new Date(Date.UTC(calendar.year, calendar.month - 1, calendar.day - 1));
  const periodFrom = zonedLocalToUtc(
    prev.getUTCFullYear(),
    prev.getUTCMonth() + 1,
    prev.getUTCDate(),
    timeZone,
  );
  return { periodFrom, periodTo };
}

export function getPreviousWeekBoundsInTz(
  timeZone: string,
  reference = new Date(),
): {
  periodFrom: Date;
  periodTo: Date;
} {
  const calendar = getZonedParts(reference, timeZone);
  const dayOfWeek = getZonedWeekday(reference, timeZone);
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const thisMonday = new Date(
    Date.UTC(calendar.year, calendar.month - 1, calendar.day - daysSinceMonday),
  );
  const periodTo = zonedLocalToUtc(
    thisMonday.getUTCFullYear(),
    thisMonday.getUTCMonth() + 1,
    thisMonday.getUTCDate(),
    timeZone,
  );

  const lastMonday = new Date(
    Date.UTC(thisMonday.getUTCFullYear(), thisMonday.getUTCMonth(), thisMonday.getUTCDate() - 7),
  );
  const periodFrom = zonedLocalToUtc(
    lastMonday.getUTCFullYear(),
    lastMonday.getUTCMonth() + 1,
    lastMonday.getUTCDate(),
    timeZone,
  );

  return { periodFrom, periodTo };
}

export function getPreviousMonthBoundsInTz(
  timeZone: string,
  reference = new Date(),
): {
  periodFrom: Date;
  periodTo: Date;
} {
  const calendar = getZonedParts(reference, timeZone);
  const periodTo = zonedLocalToUtc(calendar.year, calendar.month, 1, timeZone);
  const prevMonth = new Date(Date.UTC(calendar.year, calendar.month - 2, 1));
  const periodFrom = zonedLocalToUtc(
    prevMonth.getUTCFullYear(),
    prevMonth.getUTCMonth() + 1,
    1,
    timeZone,
  );
  return { periodFrom, periodTo };
}

export function formatDateInTz(
  date: Date,
  withTime = false,
  timeZone: string = DEFAULT_PARK_TIMEZONE,
): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone,
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
