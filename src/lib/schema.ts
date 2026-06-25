import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

// ---------------------------------------------------------------------------
// url_metadata  — cache for individual scrape results
// ---------------------------------------------------------------------------

export const urlMetadata = sqliteTable(
  "url_metadata",
  {
    normUrl: text("norm_url").notNull(),
    method: text("method").$type<"fetch" | "playwright">().notNull(),
    metaJson: text("meta_json", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull(),
    createdAt: integer("created_at").notNull(), // epoch ms, raw number
  },
  (t) => [primaryKey({ columns: [t.normUrl, t.method] })],
);

// ---------------------------------------------------------------------------
// batches  — a single submitted list of URLs
// ---------------------------------------------------------------------------

export const batches = sqliteTable("batches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tag: text("tag"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull(),
  totalCount: integer("total_count").default(0).notNull(),
  completedCount: integer("completed_count").default(0).notNull(),
  failedCount: integer("failed_count").default(0).notNull(),
});

// ---------------------------------------------------------------------------
// batch_items  — individual queue entries within a batch
// ---------------------------------------------------------------------------

export const batchItems = sqliteTable(
  "batch_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    batchId: integer("batch_id")
      .references(() => batches.id, { onDelete: "cascade" })
      .notNull(),
    url: text("url").notNull(),
    normUrl: text("norm_url").notNull(),
    domain: text("domain").notNull(),
    method: text("method")
      .$type<"fetch" | "playwright" | "both">()
      .default("both")
      .notNull(),
    tag: text("tag"),
    status: text("status")
      .$type<"pending" | "processing" | "done" | "failed">()
      .default("pending")
      .notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .notNull(),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    error: text("error"),
    metaJson: text("meta_json", { mode: "json" }).$type<
      Record<string, unknown>
    >(),
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

export type Batch = typeof batches.$inferSelect;
export type BatchItem = typeof batchItems.$inferSelect;
