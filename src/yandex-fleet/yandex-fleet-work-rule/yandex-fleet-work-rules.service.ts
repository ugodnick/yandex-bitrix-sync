import { YandexFleetService } from '../yandex-fleet.service';
import { Repository } from 'typeorm';
import { YandexFleetWorkRuleEntity } from './yandex-fleet-work-rule.entity';
import { BitrixService } from '../../bitrix/bitrix.service';

export class YandexFleetWorkRuleService {
  constructor(
    private readonly yandexFleetWorkRuleRepository: Repository<YandexFleetWorkRuleEntity>,
    private readonly yandexFleetService: YandexFleetService,
    private readonly bitrixService: BitrixService,
  ) {}

  async syncParkWorkRules(parkId: string): Promise<void> {
    console.log(`[YandexFleetWorkRuleService] Запуск полинга для правил парка ${parkId}`);
    try {
      const response = await this.yandexFleetService.getWorkRules(parkId);

      for (const rule of response.rules) {
        await this.yandexFleetWorkRuleRepository.upsert(
          {
            id: rule.id,
            parkId,
            name: rule.name,
            isEnabled: rule.is_enabled,
          },
          ['id', 'parkId'],
        );
      }

      const yandexIds = response.rules.map((r) => r.id);
      const localRules = await this.yandexFleetWorkRuleRepository.findBy({ parkId });

      for (const local of localRules) {
        if (!yandexIds.includes(local.id)) {
          await this.yandexFleetWorkRuleRepository.remove(local);
        }
      }
      console.log(`[YandexFleetWorkRuleService] Синхронизированы правил для парка ${parkId}`);
    } catch (error) {
      console.error(
        `[YandexFleetWorkRuleService] Ошибка синхронизации правил парка ${parkId}:`,
        error,
      );
    }
  }

  async resolveWorkRuleId(parkId: string, bitrixEnumId?: number): Promise<string | undefined> {
    if (!bitrixEnumId) return undefined;

    const rule = await this.yandexFleetWorkRuleRepository.findOneBy({
      parkId,
      bitrixEnumId,
      isEnabled: true,
    });

    return rule?.id;
  }

  async resolveWorkRuleByName(parkId: string, name: string): Promise<string | undefined> {
    const rule = await this.yandexFleetWorkRuleRepository.findOneBy({
      parkId,
      name,
      isEnabled: true,
    });

    return rule?.id;
  }

  async getDefaultWorkRule(parkId: string): Promise<string> {
    const rule = await this.yandexFleetWorkRuleRepository.findOneByOrFail({
      parkId,
      name: 'Штатный',
      isEnabled: true,
    });

    return rule.id;
  }
}
