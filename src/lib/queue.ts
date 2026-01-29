import { browserManager } from "./browser";
import { fetchMethod } from "./fetcher";
import { getCachedMeta, setCachedMeta } from "./cache";
import { getMetadata } from "./metascraper";
import { type Cache, type Method, type Result } from "./types.ts";

export async function processUrl(params: {
  url: string;
  cache: Cache;
  method: Method;
}): Promise<Result | null> {
  const { url, method, cache } = params;

  if (method === "fetch" || method === "both") {
    const data = await getData(url, "fetch", cache);
    if (data) return data;
  }

  if (method === "playwright" || method === "both") {
    const data = await getData(url, "playwright", cache);
    if (data) return data;
  }

  return null;
}

async function downloadHTML(url: string, method: Method): Promise<string> {
  if (method === "fetch") {
    return await fetchMethod(url);
  }
  if (method === "playwright") {
    return await browserManager.getHTML(url);
  }
  throw new Error("invalid method");
}

async function getData(
  url: string,
  method: Method,
  cache: Cache,
): Promise<Result | null> {
  if (cache === "true") {
    const data = await getCachedMeta(url, method);
    if (data) return { data, method, cache: true };
  }

  const data = await downloadHTML(url, method)
    .then((html) => getMetadata(url, html))
    .catch((error) => {
      console.error(error);
      console.log("Could not get data");
      return null;
    });

  if (!data) return null;
  const incomplete = !data.title || !data.description;
  if (incomplete) return null;

  if (cache === "true" || cache === "refresh") {
    setCachedMeta(url, "fetch", data);
  }
  return { data, method, cache: false };
}
