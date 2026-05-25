import type {
  BitrixCallStatistic,
  BitrixCallStatisticGetParams,
  BitrixCallStatisticListResponse,
  BitrixUser,
  BitrixUserListResponse,
} from './bitrix-call.type';
import { BitrixClient } from '../common/bitrix-client';
import { buildError } from '../common/bitrix-common.utils';

export class BitrixCallService {
  constructor(private readonly client: BitrixClient) {}

  async listStatisticsPage(
    params: BitrixCallStatisticGetParams = {},
  ): Promise<BitrixCallStatisticListResponse> {
    try {
      return await this.client.post<BitrixCallStatisticListResponse>(
        'voximplant.statistic.get.json',
        params,
      );
    } catch (error) {
      throw buildError(error, BitrixCallService.name);
    }
  }

  async listStatistics(params: BitrixCallStatisticGetParams = {}): Promise<BitrixCallStatistic[]> {
    const all: BitrixCallStatistic[] = [];
    let start = params.start ?? 0;

    while (true) {
      const page = await this.listStatisticsPage({ ...params, start });
      all.push(...(page.result ?? []));

      const next = page.next;
      if (typeof next !== 'number') break;
      start = next;
    }

    return all;
  }

  async listStatisticsForPeriod(from: string, to?: string): Promise<BitrixCallStatistic[]> {
    const filter: BitrixCallStatisticGetParams['FILTER'] = {
      '>=CALL_START_DATE': from,
    };
    if (to) {
      filter['<=CALL_START_DATE'] = to;
    }

    return this.listStatistics({
      FILTER: filter,
      SORT: 'CALL_START_DATE',
      ORDER: 'ASC',
    });
  }

  async listUsers(): Promise<BitrixUser[]> {
    const all: BitrixUser[] = [];
    let start = 0;

    try {
      while (true) {
        const page = await this.client.get<BitrixUserListResponse>('user.get.json', {
          params: { start },
        });
        all.push(...(page.result ?? []));

        const next = page.next;
        if (typeof next !== 'number') break;
        start = next;
      }

      return all;
    } catch (error) {
      throw buildError(error, BitrixCallService.name);
    }
  }
}
