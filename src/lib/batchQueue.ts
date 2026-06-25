import { and, eq, sql } from "drizzle-orm";
import { db } from "./db.ts";
import { batchItems, batches } from "./schema.ts";
import { processUrl } from "./queue.ts";
import type { BatchItem } from "./schema.ts";

const BATCH_CONCURRENCY = Number(process.env.BATCH_CONCURRENCY ?? 5);
// How many pending items to inspect when choosing the next one to process.
// A wider window gives better domain interleaving at the cost of a slightly
// heavier DB read.
const CANDIDATE_WINDOW = 20;
const POLL_INTERVAL_MS = 500;

let schedulerRunning = false;
// Domains currently in-flight – used to avoid consecutive same-domain hits.
const activeDomains = new Set<string>();
let activeCount = 0;

export function startBatchProcessor(): void {
  if (schedulerRunning) return;
  schedulerRunning = true;
  console.log("🔄 Batch processor started");
  runScheduler().catch(console.error);
}

async function runScheduler(): Promise<void> {
  while (schedulerRunning) {
    try {
      // Fill available worker slots
      while (activeCount < BATCH_CONCURRENCY) {
        const item = await claimNextItem();
        if (!item) break; // Nothing pending right now

        activeDomains.add(item.domain);
        activeCount++;

        // Fire-and-forget: runs concurrently with the scheduler
        processItem(item).finally(() => {
          activeDomains.delete(item.domain);
          activeCount--;
        });
      }
    } catch (error) {
      console.error("Batch scheduler error:", error);
    }

    await sleep(POLL_INTERVAL_MS);
  }
}

type QueueItem = Pick<
  BatchItem,
  "id" | "url" | "method" | "domain" | "batchId"
>;

async function claimNextItem(): Promise<QueueItem | null> {
  // Read the next CANDIDATE_WINDOW pending items so we can pick one whose
  // domain isn't already in-flight, achieving domain interleaving.
  const candidates = await db
    .select({
      id: batchItems.id,
      url: batchItems.url,
      method: batchItems.method,
      domain: batchItems.domain,
      batchId: batchItems.batchId,
    })
    .from(batchItems)
    .where(eq(batchItems.status, "pending"))
    .orderBy(batchItems.id)
    .limit(CANDIDATE_WINDOW);

  if (candidates.length === 0) return null;

  // Prefer a candidate from a domain not currently being processed.
  // Fall back to next-in-line when unavoidable (e.g., single-domain batch).
  const preferred = candidates.find((c) => !activeDomains.has(c.domain));
  const candidate = preferred ?? candidates[0]!;

  // Atomically mark it as processing. The status guard protects against
  // double-claiming if this code ever runs concurrently (e.g., multi-instance).
  const [claimed] = await db
    .update(batchItems)
    .set({ status: "processing" })
    .where(
      and(eq(batchItems.id, candidate.id), eq(batchItems.status, "pending")),
    )
    .returning({
      id: batchItems.id,
      url: batchItems.url,
      method: batchItems.method,
      domain: batchItems.domain,
      batchId: batchItems.batchId,
    });

  return claimed ?? null;
}

async function processItem(item: QueueItem): Promise<void> {
  console.log(`🔄 [batch] Processing ${item.url}`);

  try {
    const result = await processUrl({
      url: item.url,
      cache: "true",
      method: item.method,
    });

    await db
      .update(batchItems)
      .set({
        status: "done",
        completedAt: new Date(),
        metaJson: (result?.data ?? {}) as Record<string, unknown>,
      })
      .where(eq(batchItems.id, item.id));

    await db
      .update(batches)
      .set({ completedCount: sql`${batches.completedCount} + 1` })
      .where(eq(batches.id, item.batchId));

    console.log(`✅ [batch] Done: ${item.url}`);
  } catch (error) {
    console.error(`❌ [batch] Failed: ${item.url}`, error);

    await db
      .update(batchItems)
      .set({
        status: "failed",
        completedAt: new Date(),
        error: String(error),
      })
      .where(eq(batchItems.id, item.id));

    await db
      .update(batches)
      .set({
        completedCount: sql`${batches.completedCount} + 1`,
        failedCount: sql`${batches.failedCount}    + 1`,
      })
      .where(eq(batches.id, item.batchId));
  }
}

export async function getQueueStats(): Promise<{
  pending: number;
  processing: number;
}> {
  const [stats] = await db
    .select({
      pending: sql<number>`COUNT(*) FILTER (WHERE ${batchItems.status} = 'pending')`,
      processing: sql<number>`COUNT(*) FILTER (WHERE ${batchItems.status} = 'processing')`,
    })
    .from(batchItems);

  return {
    pending: Number(stats?.pending ?? 0),
    processing: Number(stats?.processing ?? 0),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
