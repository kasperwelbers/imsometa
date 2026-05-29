import { serve } from "bun";
import { api } from "./api.ts";
import { initDb } from "./lib/db.ts";
import { startBatchProcessor } from "./lib/batchQueue.ts";
import index from "./index.html";

// Initialise the database schema before accepting any requests
await initDb();

// Start the background queue processor
startBatchProcessor();

const server = serve({
  routes: {
    // Bun's native HTML serving handles bundling of frontend.tsx and assets.
    "/": index,
  },
  // All non-root routes fall through to Hono (API routes).
  fetch: (req) => api.fetch(req),
  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
