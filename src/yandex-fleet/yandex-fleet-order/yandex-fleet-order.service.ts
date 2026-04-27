import { LessThan, Repository } from 'typeorm';
import { YandexFleetService } from '../yandex-fleet.service';
import { BITRIX_CATEGORY_STAGE, BitrixDealCategory } from '../../bitrix/bitrix.type';
import { YandexFleetOrder } from '../yandex-fleet.type';
import { YandexFleetOrderEntity } from './yandex-fleet-order.entity';

export class YandexFleetOrderService {
  constructor(
    private readonly yandexFleetOrderRepository: Repository<YandexFleetOrderEntity>,
    private readonly yandexFleetService: YandexFleetService,
  ) {}

  public resolveNextStage(orders: YandexFleetOrder[]): string | null {
    const stages = BITRIX_CATEGORY_STAGE[BitrixDealCategory.YANDEX_DELIVERY];

    const activityStage = this.resolveActivityStage(orders, stages);
    if (activityStage) return activityStage;

    if (orders.length > 25) return stages.Working;
    if (orders.length > 0) return stages.Orders25;

    return null;
  }

  private resolveActivityStage(
    orders: YandexFleetOrder[],
    stages: (typeof BITRIX_CATEGORY_STAGE)[BitrixDealCategory.YANDEX_DELIVERY],
  ): string | null {
    if (orders.length === 0) return null;

    const lastOrderDate = new Date(orders[0].booked_at);
    const now = new Date();
    const daysSinceLastOrder = (now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceLastOrder >= 30) return stages.Cold;
    if (daysSinceLastOrder >= 7) return stages.Outflow;

    return null;
  }

  async syncParkOrders(parkId: string): Promise<void> {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const now = new Date();

    let cursor: string | undefined = undefined;
    let totalSaved = 0;

    do {
      const page = await this.yandexFleetService.getOrdersPage(parkId, oneMonthAgo, now, cursor);

      if (page.orders.length > 0) {
        const entities = page.orders.map((o) => this.mapOrderToEntity(o, parkId));
        await this.yandexFleetOrderRepository.save(entities);
        totalSaved += entities.length;
      }

      cursor = page.cursor || undefined;
    } while (cursor);

    await this.yandexFleetOrderRepository.delete({
      bookedAt: LessThan(oneMonthAgo),
    });

    console.log(`[YandexFleetOrderService] Парк ${parkId}: сохранено ${totalSaved} заказов`);
  }

  private mapOrderToEntity(order: YandexFleetOrder, parkId: string): YandexFleetOrderEntity {
    return {
      id: order.id,
      parkId,
      profileId: order.driver_profile.id,
      status: order.status,
      bookedAt: new Date(order.booked_at),
    } as YandexFleetOrderEntity;
  }
}
