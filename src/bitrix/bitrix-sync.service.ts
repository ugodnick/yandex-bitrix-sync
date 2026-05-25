import { LessThan, Repository } from 'typeorm';
import { chunkArray, SQLITE_UPSERT_BATCH_SIZE } from '../chunk-array';
import { BitrixService } from './bitrix.service';
import { BitrixCallEntity } from './entity/bitrix-call.entity';
import { BitrixContactEntity } from './entity/bitrix-contact.entity';
import { BitrixDealEntity } from './entity/bitrix-deal.entity';
import { BitrixSyncStateEntity, BitrixSyncType } from './entity/bitrix-sync-state.entity';
import { BitrixUserEntity } from './entity/bitrix-user.entity';
import {
  callStatisticToEntity,
  contactFieldsToEntity,
  dealFieldsToEntity,
  userToEntity,
} from './bitrix-sync.mapper';
import { toIsoPeriodEnd, toIsoPeriodStartMonthsAgo } from './bitrix-sheet.utils';

const CALLS_RETENTION_MONTHS = 3;

async function upsertInChunks<T extends object>(
  repository: Repository<T>,
  entities: T[],
  conflictPaths: string[],
): Promise<void> {
  for (const chunk of chunkArray(entities, SQLITE_UPSERT_BATCH_SIZE)) {
    await repository.upsert(chunk, conflictPaths);
  }
}

export class BitrixSyncService {
  constructor(
    private readonly bitrixService: BitrixService,
    private readonly contactRepository: Repository<BitrixContactEntity>,
    private readonly dealRepository: Repository<BitrixDealEntity>,
    private readonly callRepository: Repository<BitrixCallEntity>,
    private readonly userRepository: Repository<BitrixUserEntity>,
    private readonly syncStateRepository: Repository<BitrixSyncStateEntity>,
  ) {}

  async ensureInitialSync(): Promise<void> {
    const contactCount = await this.contactRepository.count();
    if (contactCount === 0) {
      await this.syncContacts(true);
      await this.syncDeals(true);
      await this.syncUsers();
      await this.syncCalls(true);
    }
  }

  async syncHourly(): Promise<void> {
    await this.syncUsers();
    await this.syncContacts(false);
    await this.syncDeals(false);
    await this.syncCalls(false);
    await this.pruneOldCalls();
  }

  async reconcileDaily(): Promise<void> {
    await this.syncUsers();
    await this.syncContacts(true);
    await this.syncDeals(true);
    await this.pruneOldCalls();
  }

  async upsertContactById(contactId: string): Promise<void> {
    const fields = await this.bitrixService.getContact(contactId);
    if (!fields?.ID) return;
    await this.contactRepository.upsert(contactFieldsToEntity(fields), ['bitrixId']);
  }

  async upsertDealById(dealId: string): Promise<void> {
    const fields = await this.bitrixService.getDeal(dealId);
    if (!fields?.ID) return;
    await this.dealRepository.upsert(dealFieldsToEntity(fields), ['bitrixId']);

    const contactId = fields.CONTACT_ID;
    if (contactId) {
      await this.upsertContactById(String(contactId));
    }
  }

  async deleteContact(contactId: string): Promise<void> {
    await this.contactRepository.delete({ bitrixId: contactId });
  }

  async deleteDeal(dealId: string): Promise<void> {
    await this.dealRepository.delete({ bitrixId: dealId });
  }

  private async syncUsers(): Promise<void> {
    const users = await this.bitrixService.listUsers();
    if (users.length === 0) return;

    await upsertInChunks(this.userRepository, users.map(userToEntity), ['bitrixId']);
    await this.updateSyncState(BitrixSyncType.Users, new Date(), null);
  }

  private async syncContacts(full: boolean): Promise<void> {
    const state = await this.getOrCreateSyncState(BitrixSyncType.Contacts);
    const useFull = full || !state.lastSyncedTo;

    const contacts = useFull
      ? await this.bitrixService.listContacts()
      : await this.bitrixService.listContactsModifiedSince(state.lastSyncedTo!.toISOString());

    if (contacts.length > 0) {
      await upsertInChunks(this.contactRepository, contacts.map(contactFieldsToEntity), [
        'bitrixId',
      ]);
    }

    const syncedTo = new Date();
    await this.updateSyncState(
      BitrixSyncType.Contacts,
      syncedTo,
      useFull ? syncedTo : state.lastFullSyncAt,
    );
  }

  private async syncDeals(full: boolean): Promise<void> {
    const state = await this.getOrCreateSyncState(BitrixSyncType.Deals);
    const useFull = full || !state.lastSyncedTo;

    const deals = useFull
      ? await this.bitrixService.listDeals()
      : await this.bitrixService.listDealsModifiedSince(state.lastSyncedTo!.toISOString());

    if (deals.length > 0) {
      await upsertInChunks(this.dealRepository, deals.map(dealFieldsToEntity), ['bitrixId']);
    }

    const syncedTo = new Date();
    await this.updateSyncState(
      BitrixSyncType.Deals,
      syncedTo,
      useFull ? syncedTo : state.lastFullSyncAt,
    );
  }

  private async syncCalls(full: boolean): Promise<void> {
    const state = await this.getOrCreateSyncState(BitrixSyncType.Calls);
    const users = await this.userRepository.find();
    const usersById = new Map(users.map((u) => [u.bitrixId, u]));

    const from =
      full || !state.lastSyncedTo
        ? toIsoPeriodStartMonthsAgo(CALLS_RETENTION_MONTHS)
        : state.lastSyncedTo.toISOString();
    const to = toIsoPeriodEnd();

    const calls = await this.bitrixService.listCallsForPeriod(from, to);
    if (calls.length === 0) {
      await this.updateSyncState(
        BitrixSyncType.Calls,
        new Date(),
        full ? new Date() : state.lastFullSyncAt,
      );
      return;
    }

    const entities = calls.map((call) => {
      const cached = usersById.get(call.PORTAL_USER_ID);
      const managerName = cached?.fullName ?? '';
      return callStatisticToEntity(call, managerName);
    });

    await upsertInChunks(this.callRepository, entities, ['bitrixId']);

    const syncedTo = new Date();
    await this.updateSyncState(
      BitrixSyncType.Calls,
      syncedTo,
      full ? syncedTo : state.lastFullSyncAt,
    );
  }

  private async pruneOldCalls(): Promise<void> {
    const cutoffIso = toIsoPeriodStartMonthsAgo(CALLS_RETENTION_MONTHS);
    const cutoff = new Date(cutoffIso);
    await this.callRepository.delete({ callStartDate: LessThan(cutoff) });
  }

  private async getOrCreateSyncState(syncType: BitrixSyncType): Promise<BitrixSyncStateEntity> {
    let state = await this.syncStateRepository.findOne({ where: { syncType } });
    if (!state) {
      state = this.syncStateRepository.create({
        syncType,
        lastSyncedTo: null,
        lastFullSyncAt: null,
      });
      await this.syncStateRepository.save(state);
    }
    return state;
  }

  private async updateSyncState(
    syncType: BitrixSyncType,
    lastSyncedTo: Date,
    lastFullSyncAt: Date | null,
  ): Promise<void> {
    const state = await this.getOrCreateSyncState(syncType);
    state.lastSyncedTo = lastSyncedTo;
    if (lastFullSyncAt) {
      state.lastFullSyncAt = lastFullSyncAt;
    }
    await this.syncStateRepository.save(state);
  }
}
