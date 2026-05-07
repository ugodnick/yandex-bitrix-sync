import { Repository } from 'typeorm';
import { YandexFleetService } from '../yandex-fleet.service';
import { BITRIX_CATEGORY_STAGE, BitrixDealCategory } from '../../bitrix/bitrix.type';
import { YandexFleetOrder } from '../yandex-fleet.type';
import { YandexFleetOrderEntity } from './yandex-fleet-order.entity';

export class YandexFleetOrderService {
  constructor(
    private readonly yandexFleetOrderRepository: Repository<YandexFleetOrderEntity>,
    private readonly yandexFleetService: YandexFleetService,
  ) {}

  public resolveNextStage(orders: YandexFleetOrderEntity[], hiredAt: Date): string | null {
    const stages = BITRIX_CATEGORY_STAGE[BitrixDealCategory.YANDEX_DELIVERY];

    const activityStage = this.resolveActivityStage(orders, hiredAt, stages);
    if (activityStage) return activityStage;

    if (orders.length > 25) return stages.Working;
    if (orders.length > 0) return stages.Orders25;

    return null;
  }

  private resolveActivityStage(
    orders: YandexFleetOrderEntity[],
    hiredAt: Date,
    stages: (typeof BITRIX_CATEGORY_STAGE)[BitrixDealCategory.YANDEX_DELIVERY],
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

  async syncParkOrders(parkId: string): Promise<void> {
    const now = new Date();

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 2);

    const startDate = new Date('2025-01-01T00:00:00Z'); // temp

    let cursor: string | undefined = undefined;
    let totalSaved = 0;

    do {
      console.log(`[YandexFleetOrderService] Парк ${parkId}: поиск заказов`);
      const page = await this.yandexFleetService.getOrdersPage(parkId, startDate, now, cursor);

      if (page.orders.length > 0) {
        const entities = page.orders.map((o) => this.mapOrderToEntity(o, parkId));
        await this.yandexFleetOrderRepository.save(entities);
        console.log(
          `[YandexFleetOrderService] Парк ${parkId}: сохранено ${entities.length} заказов за раз`,
        );
        totalSaved += entities.length;
      }

      cursor = page.cursor || undefined;
    } while (cursor);

    console.log(`[YandexFleetOrderService] Парк ${parkId}: сохранено ${totalSaved} заказов`);
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
