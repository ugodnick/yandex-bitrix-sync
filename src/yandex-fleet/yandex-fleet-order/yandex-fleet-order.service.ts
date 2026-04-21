import { In, Repository } from 'typeorm';
import { YandexFleetService } from '../yandex-fleet.service';
import { YandexFleetProfileEntity } from '../yandex-fleet-profile/yandex-fleet-profile.entity';
import { BitrixService } from '../../bitrix/bitrix.service';
import { BITRIX_CATEGORY_STAGE, BitrixDealCategory } from '../../bitrix/bitrix.type';
import { YandexFleetOrder } from '../yandex-fleet.type';

const BATCH_SIZE = 50;
const ORDERS_THRESHOLD = 25;
const OUTFLOW_DAYS = 7;

const ACTIVE_STAGES = [
  BITRIX_CATEGORY_STAGE[BitrixDealCategory.YANDEX_DELIVERY].OutputFor1Order,
  BITRIX_CATEGORY_STAGE[BitrixDealCategory.YANDEX_DELIVERY].Orders25,
  BITRIX_CATEGORY_STAGE[BitrixDealCategory.YANDEX_DELIVERY].Working,
];

export class YandexFleetOrderService {
  constructor(
    private readonly yandexFleetProfileRepository: Repository<YandexFleetProfileEntity>,
    private readonly yandexFleetService: YandexFleetService,
    private readonly bitrixService: BitrixService,
  ) {}

  async syncDriverStatuses(parkId: string): Promise<void> {
    console.log(`[YandexFleetOrderService] Запуск синхронизации статусов водителей ${parkId}`);

    let skip = 0;
    let processed = 0;

    try {
      while (true) {
        const profiles = await this.yandexFleetProfileRepository.find({
          select: ['yandexProfileId', 'bitrixStageId', 'parkId', 'hireDate'],
          where: {
            parkId,
            bitrixStageId: In(ACTIVE_STAGES),
          },
          take: BATCH_SIZE,
          skip,
          order: { yandexProfileId: 'ASC' },
        });

        if (profiles.length === 0) break;

        for (const profile of profiles) {
          try {
            await this.syncProfile(profile);
          } catch (error) {
            console.error(
              `[YandexFleetOrderService] Ошибка обработки профиля ${profile.yandexProfileId}:`,
              error,
            );
          }
        }

        processed += profiles.length;

        if (profiles.length < BATCH_SIZE) break;
        skip += BATCH_SIZE;
      }

      console.log(
        `[YandexFleetOrderService] Синхронизация ${parkId} завершена. Обработано: ${processed}`,
      );
    } catch (error) {
      console.error(
        `[YandexFleetOrderService] Ошибка синхронизации статусов водителей ${parkId}:`,
        error,
      );
    }
  }

  private async syncProfile(profile: YandexFleetProfileEntity): Promise<void> {
    const orders = await this.yandexFleetService.getLastDriverOrders(
      profile.parkId,
      profile.yandexProfileId,
      profile.hireDate,
    );

    const stages = BITRIX_CATEGORY_STAGE[BitrixDealCategory.YANDEX_DELIVERY];
    const nextStageId = this.resolveNextStage(profile, orders, stages);

    if (!nextStageId || nextStageId === profile.bitrixStageId) return;

    await this.bitrixService.updateDeal(profile.bitrixDealId, {
      STAGE_ID: nextStageId,
    });

    profile.bitrixStageId = nextStageId;
    await this.yandexFleetProfileRepository.save(profile);
  }

  private resolveNextStage(
    profile: YandexFleetProfileEntity,
    orders: YandexFleetOrder[],
    stages: (typeof BITRIX_CATEGORY_STAGE)[BitrixDealCategory.YANDEX_DELIVERY],
  ): string | null {
    if (orders.length > 0 && this.isOutflow(orders)) {
      return stages.Outflow;
    }

    if (profile.bitrixStageId === stages.OutputFor1Order && orders.length > 0) {
      return stages.Orders25;
    }

    if (profile.bitrixStageId === stages.Orders25 && orders.length > ORDERS_THRESHOLD) {
      return stages.Working;
    }

    return null;
  }

  private isOutflow(orders: YandexFleetOrder[]): boolean {
    const lastOrderDate = new Date(orders[0].created_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - OUTFLOW_DAYS);
    return lastOrderDate < weekAgo;
  }
}
