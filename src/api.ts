import { Hono } from "hono";
import z from "zod";
import { zValidator } from "@hono/zod-validator";
import { queueMetadataRequest } from "@/lib/queue.ts";
import { validator } from "hono/validator";

export const api = new Hono();

const metaPostSchema = z.object({
  urls: z.array(z.string()).max(100),
});

api.post("/api/meta", zValidator("json", metaPostSchema), async (c) => {
  const { urls } = c.req.valid("json");
  const results = await queueMetadataRequest({ urls });
  return c.json({ results });
});
