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
