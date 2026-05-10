import { Repository } from 'typeorm';
import { YandexFleetService } from '../yandex-fleet.service';
import { BITRIX_CATEGORY_STAGE } from '../../bitrix/bitrix.type';
import { YandexFleetOrder } from '../yandex-fleet.type';
import { YandexFleetOrderEntity } from './yandex-fleet-order.entity';
import { YandexFleetParkEntity } from '../yandex-park.entity';
import {
  YandexFleetSyncStateEntity,
  YandexFleetSyncType,
  YandexFleetSyncStatus,
} from '../yandex-fleet-sync-state.entity';
import { getBitrixCategory } from '../../bitrix/bitrix.utils';

export class YandexFleetOrderService {
  constructor(
    private readonly yandexFleetOrderRepository: Repository<YandexFleetOrderEntity>,
    private syncStateRepository: Repository<YandexFleetSyncStateEntity>,
    private readonly yandexFleetService: YandexFleetService,
  ) {}

  public resolveNextStage(
    park: YandexFleetParkEntity,
    orders: YandexFleetOrderEntity[],
    hiredAt: Date,
  ): string | null {
    const stages = getBitrixCategory(park.type);

    const activityStage = this.resolveActivityStage(orders, hiredAt, stages);
    if (activityStage) return activityStage;

    if (orders.length > 25) return stages.Working;
    if (orders.length > 0) return stages.Orders25;

    return null;
  }

  private resolveActivityStage(
    orders: YandexFleetOrderEntity[],
    hiredAt: Date,
    stages: (typeof BITRIX_CATEGORY_STAGE)[keyof typeof BITRIX_CATEGORY_STAGE],
  ): string | null {
    const now = new Date();

    if (orders.length === 0) {
      const daysSinceHired = (now.getTime() - hiredAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceHired >= 30) return stages.Cold;
      return null;
    }

    const lastOrderDate = new Date(orders[0].bookedAt);
    const daysSinceLastOrder = (now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceLastOrder >= 30) return stages.Cold;
    if (daysSinceLastOrder >= 7) return stages.Outflow;

    return null;
  }

  async syncParkOrders(park: YandexFleetParkEntity): Promise<void> {
    const startedAt = new Date();
    const bufferOverlap = 60 * 60 * 1000;
    const fallback = new Date('2025-01-01T00:00:00Z');

    let state = await this.syncStateRepository.findOne({
      where: { parkId: park.id, syncType: YandexFleetSyncType.Orders },
    });

    const from = state?.lastSyncedTo
      ? new Date(state.lastSyncedTo.getTime() - bufferOverlap)
      : fallback;

    state = await this.syncStateRepository.save({
      ...(state ?? {}),
      parkId: park.id,
      syncType: YandexFleetSyncType.Orders,
      status: YandexFleetSyncStatus.Running,
      lastRunAt: startedAt,
    });

    try {
      let cursor: string | undefined = undefined;
      let totalSaved = 0;

      do {
        const page = await this.yandexFleetService.getOrdersPage(park, from, startedAt, cursor);

        if (page.orders.length > 0) {
          const entities = page.orders.map((o) => this.mapOrderToEntity(o, park.id));

          try {
            await this.yandexFleetOrderRepository.save(entities);
            totalSaved += entities.length;
          } catch (error) {
            console.warn(
              `[YandexFleetOrderService] Батч упал для ${park.name}, переходим на поштучное сохранение`,
            );
            for (const entity of entities) {
              try {
                await this.yandexFleetOrderRepository.save(entity);
                totalSaved++;
              } catch (innerError) {
                console.error(
                  `[YandexFleetOrderService] Заказ ${entity.id} парка ${park.name}:`,
                  innerError,
                );
              }
            }
          }
        }

        cursor = page.cursor || undefined;
      } while (cursor);

      await this.syncStateRepository.save({
        ...state,
        lastSyncedTo: startedAt,
        status: YandexFleetSyncStatus.Idle,
        lastError: null,
        retryCount: 0,
      });

      console.log(`[YandexFleetOrderService] Парк ${park.name}: сохранено ${totalSaved} заказов`);
    } catch (error) {
      await this.syncStateRepository.save({
        ...state,
        status: YandexFleetSyncStatus.Failed,
        lastError: error instanceof Error ? error.message : String(error),
        retryCount: (state.retryCount ?? 0) + 1,
      });

      console.error(
        `[YandexFleetOrderService] Ошибка синхронизации заказов парка ${park.name}:`,
        error,
      );
    }
  }

  private mapOrderToEntity(order: YandexFleetOrder, parkId: string): YandexFleetOrderEntity {
    return {
      id: order.id,
      parkId,
      profileId: order.driver_profile.id,
      status: order.status,
      bookedAt: new Date(order.booked_at),
      price: order.price,
    } as YandexFleetOrderEntity;
  }
}
