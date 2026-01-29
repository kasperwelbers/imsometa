import { serve } from "bun";
import { api } from "./api.ts";
import index from "./index.html";

const server = serve({
  routes: {
    "/meta": api.fetch,
    "/": index,
  },
  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
