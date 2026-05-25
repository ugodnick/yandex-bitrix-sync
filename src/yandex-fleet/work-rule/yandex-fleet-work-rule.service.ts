import { YandexFleetService } from '../common/yandex-fleet.service';
import { Repository } from 'typeorm';
import { YandexFleetWorkRuleEntity } from './yandex-fleet-work-rule.entity';
import { YandexFleetParkEntity } from '../park/yandex-fleet-park.entity';

export class YandexFleetWorkRuleService {
  constructor(
    private readonly yandexFleetWorkRuleRepository: Repository<YandexFleetWorkRuleEntity>,
    private readonly yandexFleetService: YandexFleetService,
  ) {}

  async syncParkWorkRules(park: YandexFleetParkEntity): Promise<void> {
    console.log(`[YandexFleetWorkRuleService] Запуск полинга для правил парка ${park.name}`);
    try {
      const response = await this.yandexFleetService.getWorkRules(park);

      for (const rule of response.rules) {
        await this.yandexFleetWorkRuleRepository.upsert(
          {
            id: rule.id,
            parkId: park.id,
            name: rule.name,
            isEnabled: rule.is_enabled,
          },
          ['id', 'parkId'],
        );
      }

      const yandexIds = response.rules.map((r) => r.id);
      const localRules = await this.yandexFleetWorkRuleRepository.findBy({ parkId: park.id });

      for (const local of localRules) {
        if (!yandexIds.includes(local.id)) {
          await this.yandexFleetWorkRuleRepository.remove(local);
        }
      }
      console.log(`[YandexFleetWorkRuleService] Синхронизированы правил для парка ${park.name}`);
    } catch (error) {
      console.error(
        `[YandexFleetWorkRuleService] Ошибка синхронизации правил парка ${park.name}:`,
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
