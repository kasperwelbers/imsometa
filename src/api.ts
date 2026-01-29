import { Hono } from "hono";
import z from "zod";
import { processUrl } from "@/lib/queue.ts";

export const api = new Hono();

// Regex to detect IPv4 and simple IPv6 patterns
const ipRegex =
  /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}$/i;

const paramsSchema = z.object({
  url: z.string().refine(
    (val) => {
      const { hostname } = new URL(val);
      if (ipRegex.test(hostname)) return false;
      if (hostname === "localhost" || hostname.endsWith(".local")) return false;
      return true;
    },
    {
      message: "Direct IP access is disabled. Please use a domain name.",
    },
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
