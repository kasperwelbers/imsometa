import pLimit from "p-limit";
import { browserManager } from "./browser";
import { fetchMethod } from "./fetcher";
import { getCachedMeta, setCachedMeta } from "./cache";
import { getMetadata } from "./metascraper";
import { type Method, type Result } from "./types.ts";

// Concurrency limit: Only 5 URLs processed in parallel
const limit = pLimit(5);

export function queueMetadataRequest({
  urls,
  fetch = true,
  playwright = true,
  useCache = true,
}: {
  urls: string[];
  fetch?: boolean;
  playwright?: boolean;
  useCache?: boolean;
}): Promise<(Result | null)[]> {
  const promises = urls.map((url) =>
    limit(() => processUrl({ url, fetch, playwright, useCache })),
  );
  return Promise.all(promises);
}

async function processUrl(params: {
  url: string;
  fetch: boolean;
  playwright: boolean;
  useCache: boolean;
}): Promise<Result | null> {
  const { url, fetch, playwright, useCache } = params;

  if (fetch) {
    const data = await getData(url, "fetch", useCache);
    if (data) return data;
  }

  if (playwright) {
    const data = await getData(url, "playwright", useCache);
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
  useCache: boolean,
): Promise<Result | null> {
  if (useCache) {
    const data = await getCachedMeta(url, method);
    if (data) return { data, method, cache: true };
  }

  const data = await downloadHTML(url, method)
    .then((html) => getMetadata(url, html))
    .catch(() => {
      console.log("Could not get data");
      return null;
    });

  if (!data) return null;
  const incomplete = !data.title || !data.description;
  if (incomplete) return null;

  setCachedMeta(url, "fetch", data);
  return { data, method, cache: false };
}
