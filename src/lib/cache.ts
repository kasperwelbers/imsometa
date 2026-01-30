import { Database } from "bun:sqlite";
import type { Method } from "./types";
import type { Metadata } from "metascraper";
import normalizeUrl from "normalize-url";

const db = new Database("imsometa_db.sqlite", { create: true });

interface Row {
  url: string;
  method: Method;
  meta_json: string;
}

const createTable = db.query(`
    CREATE TABLE IF NOT EXISTS url_metadata(
        norm_url TEXT NOT NULL,
        method TEXT NOT NULL,
        meta_json TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (norm_url, method)
    )
`);
createTable.run();

const upsertQuery = db.query(`
    INSERT INTO url_metadata (norm_url, method, meta_json, created_at)
    VALUES ($norm_url, $method, $json, $now)
    ON CONFLICT(norm_url, method) DO UPDATE SET
        meta_json = excluded.meta_json,
        created_at = excluded.created_at
`);
const selectQuery = db.query<Row, any>(
  "SELECT meta_json FROM url_metadata WHERE norm_url = $norm_url AND method = $method",
);

export async function setCachedMeta(
  url: string,
  method: Method,
  metadata: Metadata,
) {
  const now = Date.now();

  upsertQuery.run({
    $norm_url: normUrl(url),
    $method: method,
    $json: JSON.stringify(metadata),
    $now: now,
  });
}

export async function getCachedMeta(
  url: string,
  method: Method,
): Promise<Metadata | null> {
  const row = selectQuery.get({ $normUrl: normUrl(url), $method: method });
  if (!row?.meta_json) return null;
  return JSON.parse(row.meta_json);
}

export function normUrl(rawUrl: string): string {
  // We heavily normalize URLs for caching to avoid duplicates.
  // Note that for the lookup we use the original url, so it's ok to strip protocol here and such.

  return normalizeUrl(rawUrl, {
    removeQueryParameters: [
      /^utm_/, // Google Analytics
      "fbclid", // Facebook Tracking
      "gclid", // Google Ads
      "msclkid", // Bing Ads
      "mc_eid", // Mailchimp User ID
      "ref", // Referral tags
      "source", // Generic source tags
      "click_id", // Generic tracking IDs
    ],
    stripWWW: true,
    stripAuthentication: true,
    stripHash: true,
    stripProtocol: true,
    sortQueryParameters: true,
  });
}
