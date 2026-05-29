import { Hono } from "hono";
import z from "zod";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { processUrl } from "@/lib/queue.ts";
import { db } from "@/lib/db.ts";
import { batchItems, batches } from "@/lib/schema.ts";
import { getQueueStats } from "@/lib/batchQueue.ts";
import { normUrl } from "@/lib/cache.ts";
import type { Method } from "@/lib/types.ts";

export const api = new Hono();

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const ipRegex =
  /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}$/i;

function isValidUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    if (ipRegex.test(hostname)) return false;
    if (hostname === "localhost" || hostname.endsWith(".local")) return false;
    return true;
  } catch {
    return false;
  }
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "unknown";
  }
}

// ---------------------------------------------------------------------------
// GET /meta  — individual scrape (always immediate, never queued)
// ---------------------------------------------------------------------------

const paramsSchema = z.object({
  url: z.string().refine(
    (val) => {
      const { hostname } = new URL(val);
      if (ipRegex.test(hostname)) return false;
      if (hostname === "localhost" || hostname.endsWith(".local")) return false;
      return true;
    },
    { message: "Direct IP access is disabled. Please use a domain name." },
  ),
  cache: z.enum(["true", "false", "refresh"]).optional().default("true"),
  method: z.enum(["fetch", "playwright", "both"]).optional().default("both"),
});

api.get("/meta", async (c) => {
  const fullUrl = c.req.url;
  const targetUrl = fullUrl.split("url=")[1];
  const validation = paramsSchema.safeParse({
    url: targetUrl,
    cache: c.req.query("cache"),
    method: c.req.query("method"),
  });
  if (!validation.success) {
    return c.json({ error: validation.error.format() }, 400);
  }

  const { url, cache, method } = validation.data;
  const results = await processUrl({
    url: decodeURIComponent(url),
    cache,
    method,
  });
  return c.json({ ...results });
});

// ---------------------------------------------------------------------------
// POST /batch  — submit a list of URLs for background processing
// ---------------------------------------------------------------------------

const batchBodySchema = z.object({
  urls: z.array(z.string()).min(1, "At least one URL is required"),
  tag: z.string().optional(),
  method: z.enum(["fetch", "playwright", "both"]).optional().default("both"),
});

api.post("/batch", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = batchBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.format() }, 400);
  }

  const { urls, tag, method } = parsed.data;

  const validUrls = urls.map((u) => u.trim()).filter((u) => u && isValidUrl(u));
  const skipped = urls.length - validUrls.length;

  if (validUrls.length === 0) {
    return c.json({ error: "No valid URLs provided" }, 400);
  }

  const result = await db.transaction(async (tx) => {
    const [batch] = await tx
      .insert(batches)
      .values({ tag: tag ?? null, totalCount: validUrls.length })
      .returning({ id: batches.id });

    if (!batch) throw new Error("Failed to create batch");

    await tx.insert(batchItems).values(
      validUrls.map((url) => ({
        batchId: batch.id,
        url,
        normUrl: normUrl(url),
        domain: extractDomain(url),
        method: method as Method,
        tag: tag ?? null,
        status: "pending" as const,
      })),
    );

    return { batchId: batch.id, accepted: validUrls.length, skipped };
  });

  return c.json(result, 201);
});

// ---------------------------------------------------------------------------
// GET /batch  — list all batches with progress
// ---------------------------------------------------------------------------

api.get("/batch", async (c) => {
  const batchList = await db
    .select()
    .from(batches)
    .orderBy(desc(batches.id))
    .limit(200);

  return c.json({ batches: batchList });
});

// ---------------------------------------------------------------------------
// GET /batch/:id  — single batch status
// ---------------------------------------------------------------------------

api.get("/batch/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "Invalid ID" }, 400);

  const [batch] = await db
    .select()
    .from(batches)
    .where(eq(batches.id, id))
    .limit(1);

  if (!batch) return c.json({ error: "Batch not found" }, 404);

  const [counts] = await db
    .select({
      pendingCount: sql<number>`COUNT(*) FILTER (WHERE ${batchItems.status} = 'pending')`,
      processingCount: sql<number>`COUNT(*) FILTER (WHERE ${batchItems.status} = 'processing')`,
    })
    .from(batchItems)
    .where(eq(batchItems.batchId, id));

  return c.json({
    ...batch,
    pendingCount: Number(counts?.pendingCount ?? 0),
    processingCount: Number(counts?.processingCount ?? 0),
  });
});

// ---------------------------------------------------------------------------
// GET /queue/stats  — global pending / processing counts
// ---------------------------------------------------------------------------

api.get("/queue/stats", async (c) => {
  const stats = await getQueueStats();
  return c.json(stats);
});

// ---------------------------------------------------------------------------
// GET /results  — paginated completed results
//   ?after=<id>   cursor (exclusive lower bound on id)
//   ?tag=<tag>    filter by tag
//   ?batchId=<n>  filter by batch
//   ?limit=<n>    page size (max 200, default 50)
// ---------------------------------------------------------------------------

api.get("/results", async (c) => {
  const after = c.req.query("after");
  const tag = c.req.query("tag");
  const batchId = c.req.query("batchId");
  const limit = Math.min(Number(c.req.query("limit") ?? "50"), 200);

  const conditions = [eq(batchItems.status, "done")];
  if (after) conditions.push(gt(batchItems.id, Number(after)));
  if (tag) conditions.push(eq(batchItems.tag, tag));
  if (batchId) conditions.push(eq(batchItems.batchId, Number(batchId)));

  const items = await db
    .select({
      id: batchItems.id,
      batchId: batchItems.batchId,
      url: batchItems.url,
      tag: batchItems.tag,
      completedAt: batchItems.completedAt,
      meta: batchItems.metaJson,
    })
    .from(batchItems)
    .where(and(...conditions))
    .orderBy(batchItems.id)
    .limit(limit);

  const nextCursor =
    items.length === limit ? items[items.length - 1]!.id : null;

  return c.json({ items, nextCursor });
});

// ---------------------------------------------------------------------------
// GET /results/export  — download all matching results as JSON
// ---------------------------------------------------------------------------

api.get("/results/export", async (c) => {
  const tag = c.req.query("tag");
  const batchId = c.req.query("batchId");

  const conditions = [eq(batchItems.status, "done")];
  if (tag) conditions.push(eq(batchItems.tag, tag));
  if (batchId) conditions.push(eq(batchItems.batchId, Number(batchId)));

  const items = await db
    .select({
      id: batchItems.id,
      batchId: batchItems.batchId,
      url: batchItems.url,
      tag: batchItems.tag,
      completedAt: batchItems.completedAt,
      meta: batchItems.metaJson,
    })
    .from(batchItems)
    .where(and(...conditions))
    .orderBy(batchItems.id);

  const filename = tag ? `results-${tag}.json` : "results.json";
  c.header("Content-Disposition", `attachment; filename="${filename}"`);
  c.header("Content-Type", "application/json");
  return c.body(JSON.stringify(items, null, 2));
});
