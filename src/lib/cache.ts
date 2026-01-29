import { Database } from "bun:sqlite";
import type { Method } from "./types";
import type { Metadata } from "metascraper";

const db = new Database("imsometa_db.sqlite", { create: true });

const MAX_CACHE_SIZE = process.env.MAX_CACHE_SIZE
  ? parseInt(process.env.MAX_CACHE_SIZE)
  : 10000000;
const PURGE_PERCENTAGE = 0.2; // Remove 20% when limit is hit

interface Row {
  url: string;
  method: Method;
  meta_json: string;
}

const createTable = db.query(`
    CREATE TABLE IF NOT EXISTS url_metadata(
        url TEXT NOT NULL,
        method TEXT NOT NULL,
        meta_json TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (url, method)
    )
`);
createTable.run();

const upsertQuery = db.query(`
    INSERT INTO url_metadata (url, method, meta_json, created_at)
    VALUES ($url, $method, $json, $now)
    ON CONFLICT(url, method) DO UPDATE SET
        meta_json = excluded.meta_json,
        created_at = excluded.created_at
    RETURNING (SELECT 1 FROM url_metadata WHERE url = $url AND method = $method) as existed
`);
const selectQuery = db.query<Row, any>(
  "SELECT meta_json FROM url_metadata WHERE url = $url AND method = $method",
);
const countQuery = db.query<{ count: number }, []>(
  "SELECT COUNT(*) as count FROM url_metadata",
);
const purgeQuery = db.prepare(`
    DELETE FROM url_metadata WHERE (url, method) IN (
        SELECT url, method FROM url_metadata
        ORDER BY created_at ASC
        LIMIT $limit
    )
`);

let cachedItemCount = countQuery.get()?.count || 0;

export async function setCachedMeta(
  url: string,
  method: Method,
  metadata: Metadata,
) {
  const now = Date.now();

  const result = upsertQuery.get({
    $url: url,
    $method: method,
    $json: JSON.stringify(metadata),
    $now: now,
  }) as { existed: number | null };

  if (!result) cachedItemCount++;

  if (MAX_CACHE_SIZE && cachedItemCount > MAX_CACHE_SIZE) {
    const amountToPurge = Math.ceil(MAX_CACHE_SIZE * PURGE_PERCENTAGE);

    purgeQuery.run({ $limit: amountToPurge });

    // Update the memory counter after purging
    cachedItemCount = countQuery.get()?.count || 0;

    console.log(
      `Cache limit reached. Purged ${amountToPurge} items. New count: ${cachedItemCount}`,
    );
  }
}

export async function getCachedMeta(
  url: string,
  method: Method,
): Promise<Metadata | null> {
  const row = selectQuery.get({ $url: url, $method: method });
  if (!row?.meta_json) return null;
  return JSON.parse(row.meta_json);
}
