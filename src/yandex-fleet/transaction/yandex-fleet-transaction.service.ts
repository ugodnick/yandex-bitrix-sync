import { LessThan, Repository } from 'typeorm';
import { YandexFleetParkEntity } from '../park/yandex-fleet-park.entity';
import {
  YandexFleetSyncStateEntity,
  YandexFleetSyncType,
  YandexFleetSyncStatus,
} from '../entity/yandex-fleet-sync-state.entity';
import { YandexFleetService } from '../common/yandex-fleet.service';
import { YandexFleetTransactionEntity } from './yandex-fleet-transaction.entity';
import { YandexFleetTransaction } from './yandex-fleet-transaction.type';

const RETENTION_DAYS = 50;

export class YandexFleetTransactionService {
  constructor(
    private readonly yandexFleetTransactionRepository: Repository<YandexFleetTransactionEntity>,
    private readonly syncStateRepository: Repository<YandexFleetSyncStateEntity>,
    private readonly yandexFleetService: YandexFleetService,
  ) {}

  async syncParkTransactions(park: YandexFleetParkEntity): Promise<void> {
    const startedAt = new Date();
    const bufferOverlap = 12 * 60 * 60 * 1000;
    const fallback = new Date();
    fallback.setDate(fallback.getDate() - RETENTION_DAYS);

    let state = await this.syncStateRepository.findOne({
      where: { parkId: park.id, syncType: YandexFleetSyncType.Transactions },
    });

    const from = state?.lastSyncedTo
      ? new Date(state.lastSyncedTo.getTime() - bufferOverlap)
      : fallback;

    state = await this.syncStateRepository.save({
      ...(state ?? {}),
      parkId: park.id,
      syncType: YandexFleetSyncType.Transactions,
      status: YandexFleetSyncStatus.Running,
      lastRunAt: startedAt,
    });

    try {
      let cursor: string | undefined = undefined;
      let totalSaved = 0;

      do {
        const page = await this.yandexFleetService.getTransactionsPage(
          park,
          from,
          startedAt,
          cursor,
        );

        if (page.transactions.length > 0) {
          const entities = page.transactions.map((t) => this.mapTransactionToEntity(t, park.id));
          try {
            await this.yandexFleetTransactionRepository.save(entities);
            totalSaved += entities.length;
          } catch (error) {
            console.warn(
              `[YandexFleetTransactionService] Батч упал для ${park.name}, переходим на поштучное сохранение`,
            );
            for (const entity of entities) {
              try {
                await this.yandexFleetTransactionRepository.save(entity);
                totalSaved++;
              } catch (innerError) {
                console.error(
                  `[YandexFleetTransactionService] Транзакция ${entity.id} парка ${park.name}:`,
                  innerError,
                );
              }
            }
          }
        }

        cursor = page.cursor || undefined;
      } while (cursor);

      console.log(
        `[YandexFleetTransactionService] Парк ${park.name}: сохранено ${totalSaved} транзакций`,
      );

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - RETENTION_DAYS + 1);

      const deleteResult = await this.yandexFleetTransactionRepository.delete({
        parkId: park.id,
        eventAt: LessThan(cutoff),
      });

      if (deleteResult.affected && deleteResult.affected > 0) {
        console.log(
          `[YandexFleetTransactionService] Парк ${park.name}: удалено ${deleteResult.affected} старых транзакций`,
        );
      }

      await this.syncStateRepository.save({
        ...state,
        lastSyncedTo: startedAt,
        status: YandexFleetSyncStatus.Idle,
        lastError: null,
        retryCount: 0,
      });
    } catch (error) {
      await this.syncStateRepository.save({
        ...state,
        status: YandexFleetSyncStatus.Failed,
        lastError: error instanceof Error ? error.message : String(error),
        retryCount: (state.retryCount ?? 0) + 1,
      });

      console.error(
        `[YandexFleetTransactionService] Ошибка синхронизации транзакций парка ${park.name}:`,
        error,
      );
    }
  }

  private mapTransactionToEntity(
    transaction: YandexFleetTransaction,
    parkId: string,
  ): YandexFleetTransactionEntity {
    return {
      id: transaction.id,
      parkId,
      profileId: transaction.driver_profile_id,
      orderId: transaction.order_id ?? null,
      categoryId: transaction.category_id,
      categoryName: transaction.category_name,
      amount: transaction.amount,
      eventAt: new Date(transaction.event_at),
    } as YandexFleetTransactionEntity;
  }
}
