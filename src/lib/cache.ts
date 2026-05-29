import { and, eq } from "drizzle-orm";
import type { Metadata } from "metascraper";
import normalizeUrl from "normalize-url";
import { db } from "./db.ts";
import { urlMetadata } from "./schema.ts";
import type { Method } from "./types";

export async function setCachedMeta(
  url: string,
  method: Method,
  metadata: Metadata,
): Promise<void> {
  if (method === "both") return; // "both" is a routing hint, never a cache key

  await db
    .insert(urlMetadata)
    .values({
      normUrl: normUrl(url),
      method,
      metaJson: metadata as Record<string, unknown>,
      createdAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: [urlMetadata.normUrl, urlMetadata.method],
      set: {
        metaJson: metadata as Record<string, unknown>,
        createdAt: Date.now(),
      },
    });
}

export async function getCachedMeta(
  url: string,
  method: Method,
): Promise<Metadata | null> {
  if (method === "both") return null; // not a real cache key

  const rows = await db
    .select()
    .from(urlMetadata)
    .where(
      and(
        eq(urlMetadata.normUrl, normUrl(url)),
        eq(urlMetadata.method, method),
      ),
    )
    .limit(1);

  return (rows[0]?.metaJson as Metadata) ?? null;
}

export function normUrl(rawUrl: string): string {
  // Heavily normalise URLs for cache deduplication.
  // The original URL is still used for the actual request, so stripping
  // tracking params / protocol here is safe.
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
