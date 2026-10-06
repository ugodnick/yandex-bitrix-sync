import { YandexFleetService } from '../yandex-fleet/common/yandex-fleet.service';

import {
  buildError,
  calculateDriverHash,
  formatPhoneNumber,
  getBitrixCategory,
} from './bitrix.utils';
import {
  BITRIX_FIELDS,
  BitrixContactFields,
  BitrixCrmEvent,
  BitrixCrmWebhookBody,
  BitrixDealFields,
} from './bitrix.type';
import { BitrixService } from './bitrix.service';
import { BitrixSyncService } from './bitrix-sync.service';
import { Repository } from 'typeorm';
import { YandexFleetProfileEntity } from '../yandex-fleet/profile/yandex-fleet-profile.entity';
import { YandexFleetParkEntity } from '../yandex-fleet/park/yandex-fleet-park.entity';
import { YandexFleetProfileService } from '../yandex-fleet/profile/yandex-fleet-profile.service';

export class BitrixWebhookService {
  constructor(
    private yandexFleetProfileRepository: Repository<YandexFleetProfileEntity>,
    private yandexFleetParkRepository: Repository<YandexFleetParkEntity>,
    private yandexFleetService: YandexFleetService,
    private bitrixService: BitrixService,
    private bitrixSyncService: BitrixSyncService,
    private yandexFleetProfileService: YandexFleetProfileService,
  ) {}

  async handleInboundWebhook(webhookBody: BitrixCrmWebhookBody): Promise<void> {
    const { event, data } = webhookBody;
    const entityId = data?.FIELDS?.ID;
    console.log('event', webhookBody.event);
    if (!entityId) return;

    try {
      if (event === BitrixCrmEvent.ONCRMCONTACTDELETE) {
        await this.bitrixSyncService.deleteContact(entityId);
        return;
      }

      if (event === BitrixCrmEvent.ONCRMDEALDELETE) {
        await this.bitrixSyncService.deleteDeal(entityId);
        return;
      }

      if (event === BitrixCrmEvent.ONCRMCONTACTADD || event === BitrixCrmEvent.ONCRMCONTACTUPDATE) {
        await this.bitrixSyncService.upsertContactById(entityId);
        return;
      }

      if (event === BitrixCrmEvent.ONCRMDEALADD || event === BitrixCrmEvent.ONCRMDEALUPDATE) {
        await this.bitrixSyncService.upsertDealById(entityId);
        await this.syncDealLocalState(entityId);
      }
    } catch (error) {
      throw buildError(error, BitrixWebhookService.name);
    }
  }

  /** Keep local profile/stage in sync with Bitrix. Never write back to Yandex Fleet. */
  private async syncDealLocalState(dealId: string): Promise<void> {
    const deal = await this.bitrixService.getDeal(dealId);

    const contactId = deal.CONTACT_ID;
    if (!contactId) return;

    const bitrixDispatcherField = deal[BITRIX_FIELDS.DISPATCHER];
    const bitrixDispatcherId = bitrixDispatcherField
      ? Array.isArray(bitrixDispatcherField) && bitrixDispatcherField.length > 0
        ? String(bitrixDispatcherField[0])
        : String(bitrixDispatcherField)
      : '';

    const park = await this.yandexFleetParkRepository.findOne({ where: { bitrixDispatcherId } });
    if (!park) return;

    const contactData = await this.bitrixService.getContact(String(contactId));

    if (!contactData) return;

    const phone = formatPhoneNumber(contactData.PHONE?.[0]?.VALUE);
    if (!phone) return;

    const yandexProfileId: string | null = (deal[BITRIX_FIELDS.PROFILE_ID] as string) || null;

    if (!yandexProfileId) return;

    const localProfile = await this.yandexFleetProfileRepository.findOne({
      where: { yandexProfileId },
    });

    const category = getBitrixCategory(park.type);

    if (localProfile && localProfile.dataHash !== calculateDriverHash(deal, contactData)) {
      const skippedStages: readonly string[] = [
        category.Duplicates,
        category.Refusal,
        category.SpamAdvertisingIlliquid,
      ];

      if (
        skippedStages.includes(localProfile.bitrixStageId) &&
        localProfile.bitrixStageId !== deal.STAGE_ID
      ) {
        const drivers = await this.yandexFleetService.getProfiles(
          park,
          1,
          0,
          new Date('2025-01-01T00:00:00Z'),
          [localProfile.yandexProfileId],
        );

        if (!drivers.driver_profiles[0]) return;
        const driver = drivers.driver_profiles[0];
        await this.yandexFleetProfileService.processYandexProfile(park, driver, false);
      } else {
        await this.saveLocalState(yandexProfileId, park.id, contactId, dealId, deal, contactData);
      }
    }
  }

  private async saveLocalState(
    yandexProfileId: string,
    parkId: string,
    bitrixContactId: string | number,
    bitrixDealId: string | number,
    deal: BitrixDealFields,
    contact: BitrixContactFields,
  ): Promise<void> {
    const dataHash = calculateDriverHash(deal, contact);

    const stage = deal.STAGE_ID;

    const hireDate = deal[BITRIX_FIELDS.HIRE_DATE]
      ? new Date(String(deal[BITRIX_FIELDS.HIRE_DATE]))
      : null;
    const phone = formatPhoneNumber(contact.PHONE?.[0]?.VALUE);

    await this.yandexFleetProfileRepository.save({
      yandexProfileId,
      parkId,
      bitrixContactId: String(bitrixContactId),
      bitrixDealId: String(bitrixDealId),
      dataHash,
      bitrixStageId: stage,
      hireDate,
      firstName: contact.NAME,
      lastName: contact.LAST_NAME,
      middleName: contact.SECOND_NAME,
      phone: phone,
    });
  }
}
