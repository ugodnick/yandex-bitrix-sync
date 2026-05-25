import { OrderStatus } from './yandex-fleet-order.type';

export function mapOrderStatusName(status: OrderStatus): string {
  const statusMap: Record<OrderStatus, string> = {
    [OrderStatus.None]: 'без статуса',
    [OrderStatus.Driving]: 'в пути',
    [OrderStatus.Waiting]: 'ждёт клиента',
    [OrderStatus.Transporting]: 'везёт клиента',
    [OrderStatus.Complete]: 'выполнен',
    [OrderStatus.Cancelled]: 'отменён',
    [OrderStatus.Calling]: 'ошибка, технический статус',
    [OrderStatus.Expired]: 'ошибка, технический статус',
    [OrderStatus.Failed]: 'ошибка, технический статус',
  };

  return statusMap[status];
}
