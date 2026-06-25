import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { eq } from "drizzle-orm";
import { mkdirSync } from "fs";
import * as schema from "./schema.ts";
import { batchItems } from "./schema.ts";

const DB_PATH = process.env.DATABASE_PATH ?? "./data/imsometa.db";

// Ensure the data directory exists before opening the file
mkdirSync(DB_PATH.substring(0, DB_PATH.lastIndexOf("/")), { recursive: true });

const sqlite = new Database(DB_PATH);
sqlite.run("PRAGMA journal_mode = WAL");
sqlite.run("PRAGMA foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

export async function initDb(): Promise<void> {
  // Apply any pending migrations (creates tables on first run)
  migrate(db, { migrationsFolder: "./drizzle" });

  // Reset items stuck in 'processing' state from a previous crash
  await db
    .update(batchItems)
    .set({ status: "pending" })
    .where(eq(batchItems.status, "processing"));

  console.log("✅ Database initialized");
}
