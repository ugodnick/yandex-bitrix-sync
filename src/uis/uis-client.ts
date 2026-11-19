import axios from 'axios';
import { toUisApiError, UisApiError } from './uis-api.error';
import { formatUisDateTime } from './uis-date';

const UIS_API_URL = 'https://dataapi.uiscom.ru/v2.0';
const PAGE_LIMIT = 1000;
const MAX_OFFSET = 100_000;
const MAX_RATE_LIMIT_RETRIES = 5;
const REPORT_SPLIT_MIN_MS = 60 * 60 * 1000;

export const UIS_CALL_FIELDS = [
  'id',
  'start_time',
  'finish_time',
  'finish_reason',
  'direction',
  'is_lost',
  'contact_phone_number',
  'virtual_phone_number',
  'communication_id',
  'source',
  'wait_duration',
  'total_wait_duration',
  'talk_duration',
  'clean_talk_duration',
  'total_duration',
  'postprocess_duration',
  'scenario_id',
  'scenario_name',
  'last_answered_employee_id',
  'last_answered_employee_full_name',
  'first_talked_employee_id',
  'first_talked_employee_full_name',
  'operator_phone_number',
  'call_records',
  'full_record_file_link',
  'employees',
  'tags',
] as const;

export const UIS_CALL_LEG_FIELDS = [
  'id',
  'call_session_id',
  'start_time',
  'connect_time',
  'duration',
  'total_duration',
  'finish_reason',
  'finish_reason_description',
  'virtual_phone_number',
  'calling_phone_number',
  'called_phone_number',
  'direction',
  'is_transfered',
  'is_operator',
  'is_failed',
  'is_talked',
  'employee_id',
  'employee_full_name',
  'employee_phone_number',
  'scenario_id',
  'scenario_name',
  'group_id',
  'group_name',
  'action_id',
  'action_name',
  'call_records',
] as const;

interface UisRpcResult<T> {
  data?: T;
  metadata?: { total_items?: number | string };
}

interface UisRpcResponse<T> {
  result?: UisRpcResult<T>;
  error?: unknown;
}

export type UisRow = Record<string, unknown>;

function asRows<T>(data: T[] | T | undefined): T[] {
  if (Array.isArray(data)) return data;
  if (data === undefined || data === null) return [];
  return [data];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class UisClient {
  private requestId = 0;
  private readonly methodsWithoutFields = new Set<string>();

  constructor(
    private readonly accessToken: string,
    private readonly baseUrl = UIS_API_URL,
  ) {}

  list(method: string): Promise<UisRow[]> {
    return this.withFieldFallback(method, undefined, (fields) => this.paginate(method, fields));
  }

  listReport(
    method: string,
    from: Date,
    till: Date,
    fields?: readonly string[],
  ): Promise<UisRow[]> {
    return this.withFieldFallback(method, fields, (resolvedFields) =>
      this.listReportWindow(method, from, till, resolvedFields, 0),
    );
  }

  private async withFieldFallback(
    method: string,
    fields: readonly string[] | undefined,
    load: (fields: string[] | undefined) => Promise<UisRow[]>,
  ): Promise<UisRow[]> {
    const requested = fields && !this.methodsWithoutFields.has(method) ? [...fields] : undefined;
    try {
      return await load(requested);
    } catch (error) {
      if (requested && error instanceof UisApiError && error.mnemonic === 'unexpected_parameters') {
        this.methodsWithoutFields.add(method);
        console.warn(`[UIS] ${method}: список fields отклонён, повтор без него`);
        return load(undefined);
      }
      throw error;
    }
  }

  private async paginate(method: string, fields?: string[]): Promise<UisRow[]> {
    const rows: UisRow[] = [];
    let offset = 0;
    let total = Number.POSITIVE_INFINITY;

    while (offset < total && offset <= MAX_OFFSET) {
      const result = await this.rpc<UisRow[]>(method, {
        limit: PAGE_LIMIT,
        offset,
        ...(fields ? { fields } : {}),
      });
      const page = asRows(result.data);
      rows.push(...page);
      total = this.readTotal(result, page.length, offset + page.length);
      if (page.length === 0 || page.length < PAGE_LIMIT) break;
      offset += page.length;
    }

    this.warnIfTruncated(method, rows.length, total, offset);
    return rows;
  }

  private async listReportWindow(
    method: string,
    from: Date,
    till: Date,
    fields: string[] | undefined,
    depth: number,
  ): Promise<UisRow[]> {
    const params: Record<string, unknown> = {
      date_from: formatUisDateTime(from),
      date_till: formatUisDateTime(till),
      ...(fields ? { fields } : {}),
    };
    const first = await this.rpc<UisRow[]>(method, { ...params, limit: PAGE_LIMIT, offset: 0 });
    const page = asRows(first.data);
    const total = this.readTotal(first, page.length, page.length);
    const span = till.getTime() - from.getTime();

    if (Number.isFinite(total) && total > MAX_OFFSET && span > REPORT_SPLIT_MIN_MS && depth < 8) {
      const mid = new Date(from.getTime() + span / 2);
      const left = await this.listReportWindow(method, from, mid, fields, depth + 1);
      const right = await this.listReportWindow(method, mid, till, fields, depth + 1);
      return [...left, ...right];
    }

    const rows = [...page];
    let offset = page.length;
    while (offset < total && offset <= MAX_OFFSET && page.length === PAGE_LIMIT) {
      const result = await this.rpc<UisRow[]>(method, { ...params, limit: PAGE_LIMIT, offset });
      const next = asRows(result.data);
      if (next.length === 0) break;
      rows.push(...next);
      offset += next.length;
      if (next.length < PAGE_LIMIT) break;
    }

    this.warnIfTruncated(method, rows.length, total, offset);
    return rows;
  }

  private readTotal(result: UisRpcResult<unknown>, pageLength: number, fallback: number): number {
    const reported = Number(result.metadata?.total_items);
    if (Number.isFinite(reported)) return reported;
    if (pageLength >= PAGE_LIMIT) return Number.POSITIVE_INFINITY;
    return fallback;
  }

  private warnIfTruncated(method: string, received: number, total: number, offset: number): void {
    if (Number.isFinite(total) && total > received && offset >= MAX_OFFSET) {
      console.warn(
        `[UIS] ${method}: получено ${received} из ${total}, offset достиг ${MAX_OFFSET}`,
      );
    }
  }

  private async rpc<T>(method: string, params: Record<string, unknown>): Promise<UisRpcResult<T>> {
    for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt += 1) {
      const response = await axios.post<UisRpcResponse<T>>(
        this.baseUrl,
        {
          jsonrpc: '2.0',
          id: (this.requestId += 1),
          method,
          params: { access_token: this.accessToken, ...params },
        },
        {
          headers: { 'Content-Type': 'application/json; charset=UTF-8' },
          timeout: 120_000,
        },
      );

      if (response.data.error) {
        const error = toUisApiError(response.data.error);
        if (error.isRateLimit && attempt < MAX_RATE_LIMIT_RETRIES) {
          const waitMs = error.retryAfterMs();
          console.warn(`[UIS] лимит ${method}, пауза ${waitMs} мс`);
          await sleep(waitMs);
          continue;
        }
        throw error;
      }

      return response.data.result ?? {};
    }

    throw new UisApiError('UIS rate limit retries exhausted', -32029, 'limit_exceeded');
  }
}
