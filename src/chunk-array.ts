/** SQLite default limit is 999 bound parameters per statement. */
const SQLITE_MAX_VARIABLES = 999;

/** Bitrix call row uses ~12 columns in INSERT … ON CONFLICT. */
const BITRIX_CALL_COLUMNS_PER_ROW = 12;

export const SQLITE_UPSERT_BATCH_SIZE = Math.floor(
  SQLITE_MAX_VARIABLES / BITRIX_CALL_COLUMNS_PER_ROW,
);

export function chunkArray<T>(items: readonly T[], size: number): T[][] {
  if (size <= 0) {
    throw new Error(`chunk size must be positive, got ${size}`);
  }
  if (items.length === 0) return [];

  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
