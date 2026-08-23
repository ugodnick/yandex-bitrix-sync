/**
 * Deletes untouched duplicate Yandex Eat Bitrix deals from the last N days
 * and deduplicates the Bitrix "Новые сделки" Google Sheet by profile_id.
 *
 * A deal is deleted only if ALL of:
 * - same profile_id has another deal we keep
 * - date_create within the window
 * - ASSIGNED_BY_ID is still the webhook/owner user (not taken into work)
 *
 * Keep one deal per profile_id:
 * - prefer a deal already reassigned away from the owner
 * - else yandex_fleet_profile.bitrix_deal_id
 * - else the oldest deal
 *
 * Usage:
 *   pnpm exec tsx scripts/cleanup-eat-deal-duplicates.ts --owner-id=123
 *   pnpm exec tsx scripts/cleanup-eat-deal-duplicates.ts --owner-id=123 --apply
 *
 * Owner id: --owner-id= / BITRIX_CLEANUP_OWNER_ID / user.current from webhook
 */
import dotenv from 'dotenv';
import { join } from 'path';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { loadConfig } from '../src/app.config';
import { BitrixService } from '../src/bitrix/bitrix.service';
import type { BitrixDealFields } from '../src/bitrix/deal/bitrix-deal.type';
import { GoogleSheetsAPIService } from '../src/google-sheet/google-sheet.service';
import { BitrixSheetName, SheetType } from '../src/google-sheet/google-sheet.type';

dotenv.config();

const APPLY = process.argv.includes('--apply');
const DAYS = 2;
const DB_PATH = process.env.SQLITE_PATH || 'data/database.sqlite';
const PROFILE_ID_COL = 5; // NewDealsColumn.ProfileId

type DealRow = {
  bitrix_id: string;
  contact_id: string | null;
  profile_id: string;
  stage_id: string | null;
  date_create: string | null;
};

type ProfileLink = {
  yandex_profile_id: string;
  bitrix_deal_id: string;
};

type DealWithAssignee = DealRow & { assignedById: string | null };

function openDb(path: string) {
  const db = new sqlite3.Database(path);
  const all = promisify(db.all.bind(db)) as <T>(sql: string, params?: unknown[]) => Promise<T[]>;
  const run = promisify(db.run.bind(db)) as (sql: string, params?: unknown[]) => Promise<unknown>;
  const close = promisify(db.close.bind(db)) as () => Promise<void>;
  return { all, run, close };
}

function sinceIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function argValue(name: string): string | undefined {
  const prefix = `${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

function inWindow(dateCreate: string | null, since: string): boolean {
  if (!dateCreate) return false;
  return new Date(dateCreate).toISOString() >= since;
}

async function resolveOwnerId(bitrix: BitrixService): Promise<string> {
  const fromArg = argValue('--owner-id');
  const fromEnv = process.env.BITRIX_CLEANUP_OWNER_ID;
  if (fromArg) return String(fromArg);
  if (fromEnv) return String(fromEnv);

  const data = await bitrix.client.post<{ result?: { ID?: string | number } }>('user.current.json');
  const id = data.result?.ID;
  if (!id) {
    throw new Error(
      'Cannot resolve Bitrix owner id. Pass --owner-id=N or set BITRIX_CLEANUP_OWNER_ID',
    );
  }
  return String(id);
}

async function loadAssignee(
  bitrix: BitrixService,
  dealId: string,
): Promise<{ assignedById: string | null; live: BitrixDealFields | null }> {
  try {
    const live = await bitrix.getDeal(dealId);
    return {
      live,
      assignedById: live.ASSIGNED_BY_ID != null ? String(live.ASSIGNED_BY_ID) : null,
    };
  } catch {
    return { live: null, assignedById: null };
  }
}

function pickKeep(
  profileDeals: DealWithAssignee[],
  linkedId: string | undefined,
  ownerId: string,
): DealWithAssignee {
  const taken = profileDeals.filter((d) => d.assignedById && d.assignedById !== ownerId);
  if (taken.length > 0) {
    return (linkedId && taken.find((d) => d.bitrix_id === linkedId)) || taken[0];
  }
  return (linkedId && profileDeals.find((d) => d.bitrix_id === linkedId)) || profileDeals[0];
}

async function cleanupBitrixDeals(bitrix: BitrixService, ownerId: string) {
  const db = openDb(DB_PATH);
  const since = sinceIso(DAYS);

  const deals = await db.all<DealRow>(
    `
    SELECT bitrix_id, contact_id, profile_id, stage_id, date_create
    FROM bitrix_deal
    WHERE profile_id IS NOT NULL
      AND profile_id != ''
      AND stage_id LIKE 'C7:%'
    ORDER BY profile_id ASC, datetime(date_create) ASC, CAST(bitrix_id AS INTEGER) ASC
    `,
  );

  const links = await db.all<ProfileLink>(
    `
    SELECT yandex_profile_id, bitrix_deal_id
    FROM yandex_fleet_profile
    WHERE bitrix_deal_id IS NOT NULL AND bitrix_deal_id != '0'
    `,
  );
  const linkedDealByProfile = new Map(links.map((l) => [l.yandex_profile_id, l.bitrix_deal_id]));

  const byProfile = new Map<string, DealRow[]>();
  for (const deal of deals) {
    const list = byProfile.get(deal.profile_id) ?? [];
    list.push(deal);
    byProfile.set(deal.profile_id, list);
  }

  let groups = 0;
  let keepCount = 0;
  let deleteCount = 0;
  let skippedOld = 0;
  let skippedTaken = 0;
  let skippedMissing = 0;
  let errors = 0;

  console.log(
    `\n=== Bitrix deals (last ${DAYS}d since ${since}, owner ASSIGNED_BY_ID=${ownerId}) ===`,
  );

  for (const [profileId, profileDeals] of byProfile) {
    if (profileDeals.length < 2) continue;
    groups += 1;

    const enriched: DealWithAssignee[] = [];
    for (const deal of profileDeals) {
      const { assignedById, live } = await loadAssignee(bitrix, deal.bitrix_id);
      if (!live) {
        skippedMissing += 1;
        enriched.push({ ...deal, assignedById: null });
        continue;
      }
      enriched.push({ ...deal, assignedById });
    }

    const linkedId = linkedDealByProfile.get(profileId);
    const keep = pickKeep(
      enriched.filter((d) => d.assignedById !== null),
      linkedId,
      ownerId,
    );
    if (!keep) {
      console.log(`\nprofile ${profileId}: skip (no live deals)`);
      continue;
    }
    keepCount += 1;

    const toDelete: DealWithAssignee[] = [];
    for (const deal of enriched) {
      if (deal.bitrix_id === keep.bitrix_id) continue;
      if (!inWindow(deal.date_create, since)) {
        skippedOld += 1;
        continue;
      }
      if (deal.assignedById === null) {
        skippedMissing += 1;
        continue;
      }
      if (deal.assignedById !== ownerId) {
        skippedTaken += 1;
        continue;
      }
      toDelete.push(deal);
    }

    console.log(
      `\nprofile ${profileId}: keep ${keep.bitrix_id} (assigned=${keep.assignedById}), delete ${
        toDelete.map((d) => d.bitrix_id).join(', ') || '(none)'
      }`,
    );

    for (const deal of toDelete) {
      deleteCount += 1;
      if (!APPLY) continue;

      try {
        await bitrix.deleteDeal(deal.bitrix_id);
        await db.run(`DELETE FROM bitrix_deal WHERE bitrix_id = ?`, [deal.bitrix_id]);
      } catch (error) {
        errors += 1;
        console.error(`Failed to delete deal ${deal.bitrix_id}:`, error);
      }
    }

    if (APPLY && linkedId !== keep.bitrix_id) {
      await db.run(
        `UPDATE yandex_fleet_profile SET bitrix_deal_id = ?, updated_at = CURRENT_TIMESTAMP WHERE yandex_profile_id = ?`,
        [keep.bitrix_id, profileId],
      );
      console.log(`  relinked local profile -> deal ${keep.bitrix_id}`);
    }
  }

  await db.close();

  console.log('\nBitrix deals summary:');
  console.log(`  duplicate groups: ${groups}`);
  console.log(`  kept: ${keepCount}`);
  console.log(`  to delete / deleted: ${deleteCount}`);
  console.log(`  skipped (older than ${DAYS}d): ${skippedOld}`);
  console.log(`  skipped (taken by another user): ${skippedTaken}`);
  console.log(`  skipped (missing in Bitrix): ${skippedMissing}`);
  console.log(`  errors: ${errors}`);
}

async function cleanupNewDealsSheet(sheets: GoogleSheetsAPIService) {
  console.log('\n=== Google Sheet «Новые сделки» ===');

  const rows = await sheets.readAll(BitrixSheetName.NewDeals, SheetType.Bitrix, 1);
  const seen = new Set<string>();
  const unique: string[][] = [];
  let dropped = 0;

  for (const row of rows) {
    const cells = row.map((c) => String(c ?? ''));
    const profileId = cells[PROFILE_ID_COL]?.trim() ?? '';

    if (profileId && seen.has(profileId)) {
      dropped += 1;
      continue;
    }
    if (profileId) seen.add(profileId);
    unique.push(cells);
  }

  console.log(`  rows before: ${rows.length}`);
  console.log(`  duplicate rows dropped: ${dropped}`);
  console.log(`  rows after: ${unique.length}`);

  if (!APPLY) return;

  await sheets.truncateSheet(BitrixSheetName.NewDeals, SheetType.Bitrix, 1);
  await sheets.ensureHeaders(BitrixSheetName.NewDeals, SheetType.Bitrix);
  await sheets.appendRawRows(BitrixSheetName.NewDeals, SheetType.Bitrix, unique);
  console.log('  sheet rewritten without gaps');
}

async function main() {
  const config = loadConfig();
  const bitrix = new BitrixService(config.inboundWebhookUrl);
  const sheets = new GoogleSheetsAPIService({
    keyFilePath: join(__dirname, '..', 'google-sheets-credentials.json'),
    deliverySpreadsheetId: config.googleSheetsDeliverySheetId,
    taxiSpreadsheetId: config.googleSheetsTaxiSheetId,
    eatSpreadsheetId: config.googleSheetsEatSheetId,
    bitrixSpreadsheetId: config.googleSheetsBitrixSheetId,
  });

  console.log(APPLY ? 'APPLY mode' : 'DRY-RUN mode (pass --apply to write changes)');

  const ownerId = await resolveOwnerId(bitrix);
  console.log(`Owner user id: ${ownerId}`);

  await cleanupBitrixDeals(bitrix, ownerId);

  try {
    await cleanupNewDealsSheet(sheets);
  } catch (error) {
    console.error('\nFailed to process Google Sheet «Новые сделки»:', error);
    if (APPLY) process.exitCode = 1;
  }

  if (!APPLY) {
    console.log('\nRe-run with --apply to delete deals and rewrite the sheet.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
