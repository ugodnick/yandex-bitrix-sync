import { type Repository } from 'typeorm';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import type { YandexMailConfig } from '../app.config';
import { BitrixService } from '../bitrix/bitrix.service';
import { BitrixContactEntity } from '../bitrix/entity/bitrix-contact.entity';
import { BitrixDealEntity } from '../bitrix/entity/bitrix-deal.entity';
import type { BitrixDealFields } from '../bitrix/deal/bitrix-deal.type';
import {
  YandexFleetSyncStateEntity,
  YandexFleetSyncStatus,
  YandexFleetSyncType,
} from '../yandex-fleet/entity/yandex-fleet-sync-state.entity';
import { YandexFleetParkEntity } from '../yandex-fleet/park/yandex-fleet-park.entity';
import {
  YandexMailCandidateEntity,
  YandexMailCandidateStatus,
} from './yandex-mail-candidate.entity';
import { mailHtmlToText, parseCandidateMail, phoneDigits } from './yandex-mail.parse';
import {
  buildSourceFields,
  dispatcherMatches,
  matchPark,
  parkNameMatches,
  phonesMatch,
} from './yandex-mail.match';

const MAIL_UID_BATCH = 40;
const MAIL_SYNC_OVERLAP_MS = 30 * 60 * 1000;
const MAIL_SUBJECT = 'Новый исполнитель в диспетчерской';

export interface MailSourcePatch {
  candidate: YandexMailCandidateEntity;
  fields: Partial<BitrixDealFields>;
}

export class YandexMailService {
  constructor(
    private readonly mailConfig: YandexMailConfig | null,
    private readonly candidateRepository: Repository<YandexMailCandidateEntity>,
    private readonly syncStateRepository: Repository<YandexFleetSyncStateEntity>,
    private readonly contactRepository: Repository<BitrixContactEntity>,
    private readonly dealRepository: Repository<BitrixDealEntity>,
    private readonly parkRepository: Repository<YandexFleetParkEntity>,
    private readonly bitrixService: BitrixService,
  ) {}

  async poll(): Promise<void> {
    if (!this.mailConfig) return;

    try {
      await this.fetchCandidateMail();
    } finally {
      await this.applyPending();
    }
  }

  async sourcePatchForProfile(
    phone: string | null | undefined,
    park: YandexFleetParkEntity,
    dealId: string | null,
  ): Promise<MailSourcePatch | null> {
    const candidate = await this.findCandidateForPark(phone, park);
    if (!candidate) return null;

    let sourceId: string | null = null;
    let sourcesRaw: string | null = null;
    if (dealId) {
      const deal = await this.dealRepository.findOneBy({ bitrixId: dealId });
      sourceId = deal?.sourceId ?? null;
      sourcesRaw = deal?.sourcesRaw ?? null;
    }

    return {
      candidate,
      fields: buildSourceFields(sourceId, sourcesRaw),
    };
  }

  async markApplied(
    candidate: YandexMailCandidateEntity,
    dealId: string | string[],
    parkId: string,
  ): Promise<void> {
    const incoming = Array.isArray(dealId) ? dealId : [dealId];
    const ids = (candidate.bitrixDealId ?? '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    for (const id of incoming) {
      if (!ids.includes(id)) ids.push(id);
    }

    candidate.status = YandexMailCandidateStatus.Applied;
    candidate.bitrixDealId = ids.join(',');
    candidate.parkId = parkId;
    candidate.appliedAt = new Date();
    await this.candidateRepository.save(candidate);
  }

  private async fetchCandidateMail(): Promise<void> {
    if (!this.mailConfig) return;

    const startedAt = new Date();
    const parks = await this.parkRepository.find();

    const knownMessageIds = new Set(
      (await this.candidateRepository.find({ select: { messageId: true } })).map(
        (row) => row.messageId,
      ),
    );

    const client = new ImapFlow({
      host: 'imap.yandex.ru',
      port: 993,
      secure: true,
      auth: { user: this.mailConfig.user, pass: this.mailConfig.password },
      logger: false,
      disableAutoIdle: true,
    });
    client.on('error', (error: Error) => {
      console.error('[YandexMail] IMAP-соединение прервано:', error.message);
    });

    try {
      await client.connect();
      const mailboxes = await client.list();
      const folders = mailboxes.filter((box) => this.isNewCourierFolder(box.name));

      if (folders.length === 0) {
        console.log(
          `[YandexMail] Папки «Новый» не найдены. Доступные: ${mailboxes.map((box) => box.path).join('; ')}`,
        );
        return;
      }

      console.log(
        `[YandexMail] Папки новых кандидатов: ${folders.map((box) => box.path).join('; ')}`,
      );

      for (const folder of folders) {
        const parkName = this.folderParkName(folder);
        const park = parkName ? matchPark(parkName, parks) : null;
        if (!park) {
          console.log(`[YandexMail] Папка «${folder.path}» не сопоставлена с парком`);
          continue;
        }

        const state = await this.beginMailSync(park.id, startedAt);
        try {
          await this.syncFolder(client, folder.path, knownMessageIds, this.mailSince(state.lastSyncedTo));
          await this.finishMailSync(state, startedAt);
        } catch (error) {
          await this.failMailSync(state, error);
          console.error(`[YandexMail] Папка «${folder.path}» прервана:`, error);
          if (this.isClosedConnection(error)) break;
        }
      }
    } finally {
      await client.logout().catch(() => undefined);
    }
  }

  private folderParkName(folder: { path: string; delimiter?: string | null; parent?: string[] }): string | null {
    const parent = folder.parent?.filter(Boolean);
    if (parent && parent.length > 0) return parent[parent.length - 1];

    const delimiter = folder.delimiter || '|';
    const parts = folder.path.split(delimiter).filter(Boolean);
    return parts.length >= 2 ? parts[parts.length - 2] : null;
  }

  private async beginMailSync(parkId: string, startedAt: Date): Promise<YandexFleetSyncStateEntity> {
    const state = await this.syncStateRepository.findOne({
      where: { parkId, syncType: YandexFleetSyncType.Mail },
    });

    return this.syncStateRepository.save({
      ...(state ?? {}),
      parkId,
      syncType: YandexFleetSyncType.Mail,
      status: YandexFleetSyncStatus.Running,
      lastRunAt: startedAt,
    });
  }

  private async finishMailSync(state: YandexFleetSyncStateEntity, startedAt: Date): Promise<void> {
    await this.syncStateRepository.save({
      ...state,
      lastSyncedTo: startedAt,
      status: YandexFleetSyncStatus.Idle,
      lastError: null,
      retryCount: 0,
    });
  }

  private async failMailSync(state: YandexFleetSyncStateEntity, error: unknown): Promise<void> {
    await this.syncStateRepository.save({
      ...state,
      status: YandexFleetSyncStatus.Failed,
      lastError: error instanceof Error ? error.message : String(error),
      retryCount: (state.retryCount ?? 0) + 1,
    });
  }

  private mailSince(lastSyncedTo: Date | null): Date | null {
    if (!lastSyncedTo) return null;
    return new Date(lastSyncedTo.getTime() - MAIL_SYNC_OVERLAP_MS);
  }

  private async syncFolder(
    client: ImapFlow,
    folderPath: string,
    knownMessageIds: Set<string>,
    since: Date | null,
  ): Promise<void> {
    const lock = await client.getMailboxLock(folderPath);
    try {
      const uids = await client.search(
        since ? { subject: MAIL_SUBJECT, since } : { subject: MAIL_SUBJECT },
        { uid: true },
      );
      const list = Array.isArray(uids) ? uids : [];
      console.log(`[YandexMail] «${folderPath}»: писем ${list.length}`);
      if (list.length === 0) return;

      let saved = 0;
      for (let offset = 0; offset < list.length; offset += MAIL_UID_BATCH) {
        const batch = list.slice(offset, offset + MAIL_UID_BATCH);
        const freshUids = await this.uidsNotStored(client, batch, folderPath, knownMessageIds);

        for (const uid of freshUids) {
          try {
            await this.ingestUid(client, uid, folderPath, knownMessageIds);
            saved += 1;
          } catch (error) {
            console.error(`[YandexMail] Письмо uid ${uid} в «${folderPath}» не обработано:`, error);
            if (this.isClosedConnection(error)) throw error;
          }
        }
      }

      console.log(`[YandexMail] «${folderPath}»: сохранено ${saved}`);
    } finally {
      try {
        lock.release();
      } catch {
        // Соединение уже закрыто, блокировку папки снять нельзя.
      }
    }
  }

  private isClosedConnection(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'NoConnection'
    );
  }

  private isNewCourierFolder(name: string): boolean {
    return /новый$/i.test(name.replace(/\u00a0/g, ' ').trim());
  }

  private async uidsNotStored(
    client: ImapFlow,
    uids: number[],
    folderPath: string,
    knownMessageIds: Set<string>,
  ): Promise<number[]> {
    if (uids.length === 0) return [];

    const fresh: number[] = [];
    for await (const message of client.fetch(uids, { uid: true, envelope: true }, { uid: true })) {
      const messageId = this.messageIdOf(message.envelope?.messageId, folderPath, message.uid);
      if (knownMessageIds.has(messageId)) continue;
      fresh.push(message.uid);
    }
    return fresh;
  }

  private messageIdOf(rawId: string | undefined, folderPath: string, uid: number): string {
    const trimmed = rawId?.trim();
    if (trimmed) return trimmed;
    return `${folderPath}:${uid}`;
  }

  private async ingestUid(
    client: ImapFlow,
    uid: number,
    folderPath: string,
    knownMessageIds: Set<string>,
  ): Promise<void> {
    const message = await client.fetchOne(
      String(uid),
      { envelope: true, source: true, uid: true },
      { uid: true },
    );
    if (!message || !message.source) {
      console.error(`[YandexMail] Письмо uid ${uid} в «${folderPath}» без тела`);
      const envelope = message ? message.envelope : undefined;
      const messageId = this.messageIdOf(envelope?.messageId, folderPath, uid);
      if (!knownMessageIds.has(messageId)) {
        await this.candidateRepository.save(
          this.candidateRepository.create({
            messageId,
            subject: envelope?.subject ?? null,
            status: YandexMailCandidateStatus.ParseFailed,
          }),
        );
        knownMessageIds.add(messageId);
      }
      return;
    }

    const parsed = await simpleParser(message.source);
    const subject = message.envelope?.subject || parsed.subject || '';
    const messageId = this.messageIdOf(
      message.envelope?.messageId || parsed.messageId,
      folderPath,
      uid,
    );
    if (knownMessageIds.has(messageId)) return;

    const receivedAt = this.parseReceivedAt(message.envelope?.date ?? parsed.date);
    const body = this.messageBody(parsed);
    const candidateMail = parseCandidateMail(body);
    const entity = this.candidateRepository.create({
      messageId,
      receivedAt,
      subject,
      fullName: candidateMail?.fullName ?? null,
      phoneRaw: candidateMail?.phoneRaw ?? null,
      phoneDigits: candidateMail?.phoneDigits ?? null,
      parkName: candidateMail?.parkName ?? null,
      sourceRaw: candidateMail?.sourceRaw ?? null,
      status: candidateMail
        ? YandexMailCandidateStatus.Parsed
        : YandexMailCandidateStatus.ParseFailed,
    });

    await this.candidateRepository.save(entity);
    knownMessageIds.add(messageId);

    if (!candidateMail) {
      console.error(
        `[YandexMail] Письмо ${messageId} с темой «${subject}» не разобрано, сохранено как parse_failed`,
      );
      return;
    }

    console.log(
      `[YandexMail] Сохранён кандидат ${candidateMail.fullName ?? ''} ${candidateMail.phoneRaw}, парк «${candidateMail.parkName}», источник «${candidateMail.sourceRaw}»`,
    );
    await this.tryApply(entity, true);
  }

  private messageBody(parsed: Awaited<ReturnType<typeof simpleParser>>): string {
    if (parsed.text?.trim()) return parsed.text;
    if (typeof parsed.html === 'string' && parsed.html.trim()) return mailHtmlToText(parsed.html);
    return '';
  }

  private parseReceivedAt(value: Date | string | undefined): Date | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private async applyPending(): Promise<void> {
    const pending = await this.candidateRepository.find({
      where: { status: YandexMailCandidateStatus.Parsed },
      order: { receivedAt: 'ASC' },
    });

    for (const candidate of pending) {
      try {
        await this.tryApply(candidate, false);
      } catch (error) {
        console.error(`[YandexMail] Не удалось привязать письмо ${candidate.messageId}:`, error);
      }
    }
  }

  private async tryApply(candidate: YandexMailCandidateEntity, logMiss: boolean): Promise<void> {
    if (!candidate.parkName) return;

    const parks = await this.parkRepository.find();
    const park = matchPark(candidate.parkName, parks);
    if (!park) {
      if (logMiss) {
        console.log(
          `[YandexMail] Парк «${candidate.parkName}» не сопоставлен однозначно, письмо ${candidate.messageId} ждёт`,
        );
      }
      return;
    }

    await this.rememberPark(candidate, park.id);
    if (!candidate.phoneDigits) return;

    const deals = await this.findDeals(candidate.phoneDigits, park);
    if (deals.length === 0) return;

    for (const deal of deals) {
      const fields = buildSourceFields(deal.sourceId, deal.sourcesRaw);
      if (Object.keys(fields).length > 0) {
        await this.bitrixService.updateDeal(deal.bitrixId, fields);
      }
    }

    const dealIds = deals.map((deal) => deal.bitrixId);
    await this.markApplied(candidate, dealIds, park.id);
    console.log(
      `[YandexMail] Источник записан в сделки ${dealIds.join(', ')} (${park.name}, ${candidate.phoneRaw})`,
    );
  }

  private async rememberPark(candidate: YandexMailCandidateEntity, parkId: string): Promise<void> {
    if (candidate.parkId === parkId) return;
    candidate.parkId = parkId;
    await this.candidateRepository.save(candidate);
  }

  private async findCandidateForPark(
    phone: string | null | undefined,
    park: YandexFleetParkEntity,
  ): Promise<YandexMailCandidateEntity | null> {
    if (!phone || phoneDigits(phone).length < 10) return null;

    const pending = await this.candidateRepository.find({
      where: { status: YandexMailCandidateStatus.Parsed },
      order: { receivedAt: 'DESC' },
    });

    const parks = await this.parkRepository.find();
    for (const candidate of pending) {
      if (!candidate.phoneDigits || !phonesMatch(candidate.phoneDigits, phone)) continue;
      if (!candidate.parkName || !parkNameMatches(candidate.parkName, park.name)) continue;
      const matched = matchPark(candidate.parkName, parks);
      if (matched?.id === park.id) return candidate;
    }

    return null;
  }

  private async findDeals(digits: string, park: YandexFleetParkEntity): Promise<BitrixDealEntity[]> {
    const last10 = digits.slice(-10);
    const normalizedPhone =
      "replace(replace(replace(replace(replace(ifnull(c.phone, ''), '+', ''), ' ', ''), '-', ''), '(', ''), ')', '')";
    const contacts = await this.contactRepository
      .createQueryBuilder('c')
      .where(`length(${normalizedPhone}) >= 10`)
      .andWhere(`substr(${normalizedPhone}, -10) = :last10`, { last10 })
      .getMany();

    if (contacts.length === 0) return [];

    const deals = await this.dealRepository
      .createQueryBuilder('d')
      .where('d.contact_id IN (:...contactIds)', {
        contactIds: contacts.map((contact) => contact.bitrixId),
      })
      .getMany();

    return deals.filter((deal) => dispatcherMatches(deal.dispatcherRaw, park.bitrixDispatcherId));
  }
}
