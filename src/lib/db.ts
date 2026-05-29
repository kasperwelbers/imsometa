import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "./schema.ts";
import { batchItems } from "./schema.ts";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://imsometa:imsometa@localhost:5432/imsometa";

const client = postgres(DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 30,
});

export const db = drizzle(client, { schema });

export async function initDb(): Promise<void> {
  // Apply any pending migrations (creates tables on first run)
  await migrate(db, { migrationsFolder: "./drizzle" });

  // Reset items stuck in 'processing' state from a previous crash
  await db
    .update(batchItems)
    .set({ status: "pending" })
    .where(eq(batchItems.status, "processing"));

  console.log("✅ Database initialized");
}
