export interface ParsedCandidateMail {
  parkName: string;
  sourceRaw: string;
  fullName: string | null;
  phoneRaw: string;
  phoneDigits: string;
}

const PARK_PATTERN = /В Диспетчерскую\s+(.+?)\s+добавлен новый/i;
const SOURCE_PATTERN = /из источника\s+([^\n:]+)/i;
const NAME_PATTERN = /ФИО:\s*([^\n]+)/i;
const PHONE_PATTERN = /Номер телефона:\s*([+\d][\d \t()-]{9,})/i;

export function mailHtmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCharCode(parseInt(code, 16)));
}

function normalizeBody(body: string): string {
  return body.replace(/\u00a0/g, ' ').replace(/\r\n/g, '\n');
}

function cleanCapture(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function parseCandidateMail(body: string): ParsedCandidateMail | null {
  const text = normalizeBody(body);
  const parkMatch = text.match(PARK_PATTERN);
  const sourceMatch = text.match(SOURCE_PATTERN);
  const phoneMatch = text.match(PHONE_PATTERN);
  if (!parkMatch || !sourceMatch || !phoneMatch) return null;

  const phoneRaw = cleanCapture(phoneMatch[1]);
  const digits = phoneDigits(phoneRaw);
  if (digits.length < 10) return null;

  const nameMatch = text.match(NAME_PATTERN);

  return {
    parkName: cleanCapture(parkMatch[1]),
    sourceRaw: cleanCapture(sourceMatch[1]),
    fullName: nameMatch ? cleanCapture(nameMatch[1]) : null,
    phoneRaw,
    phoneDigits: digits,
  };
}
