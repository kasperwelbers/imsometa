import Keyv from "keyv";
import KeyvSqlite from "@keyv/sqlite";
import type { Method } from "./types";
import { type Metadata } from "metascraper";

const cache = new Keyv(new KeyvSqlite("sqlite://imsometa_cache.sqlite"));

export async function getCachedMeta(
  url: string,
  method: Method,
): Promise<Metadata | null> {
  const metadata = await cache.get(`${method}:${url}`);
  console.log("get cache", `${method}:${url}`);
  return (metadata as Metadata) || null;
}

export async function setCachedMeta(
  url: string,
  method: Method,
  metadata: Metadata,
) {
  await cache.set(`${method}:${url}`, metadata);
  console.log("set cache", `${method}:${url}`);
}
