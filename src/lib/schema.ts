import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// url_metadata  — cache for individual scrape results
// ---------------------------------------------------------------------------

export const urlMetadata = pgTable(
  "url_metadata",
  {
    normUrl:   text("norm_url").notNull(),
    method:    text("method").$type<"fetch" | "playwright">().notNull(),
    metaJson:  jsonb("meta_json").$type<Record<string, unknown>>().notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.normUrl, t.method] })],
);

// ---------------------------------------------------------------------------
// batches  — a single submitted list of URLs
// ---------------------------------------------------------------------------

export const batches = pgTable("batches", {
  id:             serial("id").primaryKey(),
  tag:            text("tag"),
  createdAt:      timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  totalCount:     integer("total_count").default(0).notNull(),
  completedCount: integer("completed_count").default(0).notNull(),
  failedCount:    integer("failed_count").default(0).notNull(),
});

// ---------------------------------------------------------------------------
// batch_items  — individual queue entries within a batch
// ---------------------------------------------------------------------------

export const batchItems = pgTable(
  "batch_items",
  {
    id:          serial("id").primaryKey(),
    batchId:     integer("batch_id")
                   .references(() => batches.id, { onDelete: "cascade" })
                   .notNull(),
    url:         text("url").notNull(),
    normUrl:     text("norm_url").notNull(),
    domain:      text("domain").notNull(),
    method:      text("method").$type<"fetch" | "playwright" | "both">().default("both").notNull(),
    tag:         text("tag"),
    status:      text("status").$type<"pending" | "processing" | "done" | "failed">().default("pending").notNull(),
    createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    error:       text("error"),
    metaJson:    jsonb("meta_json").$type<Record<string, unknown>>(),
  },
  (t) => [
    index("batch_items_status_id_idx").on(t.status, t.id),
    index("batch_items_domain_idx").on(t.domain),
    index("batch_items_tag_idx").on(t.tag),
    index("batch_items_batch_id_idx").on(t.batchId),
  ],
);

// ---------------------------------------------------------------------------
// Convenience types inferred from the schema
// ---------------------------------------------------------------------------

export type Batch     = typeof batches.$inferSelect;
export type BatchItem = typeof batchItems.$inferSelect;
