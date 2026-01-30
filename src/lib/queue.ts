import { browserManager } from "./browser";
import { fetchMethod } from "./fetcher";
import { getCachedMeta, setCachedMeta } from "./cache";
import { parseHTML } from "./parseHTML.ts";
import { type Cache, type Data, type Method, type Result } from "./types.ts";

export async function processUrl(params: {
  url: string;
  cache: Cache;
  method: Method;
}): Promise<Result | null> {
  const { url, method, cache } = params;

  let result: Result | null = null;

  if (method === "fetch" || method === "both") {
    result = await getData(url, "fetch", cache);
    console.log(result);
    if (dataReady(result)) return result;
  }

  if (method === "playwright" || method === "both") {
    result = await getData(url, "playwright", cache);
  }

  return result;
}

/**
 * Checks if the given result is ready (i.e., has both title and description).
 */
function dataReady(result: Result | null): boolean {
  if (!result?.data) return false;
  return !!(result.data.title && result.data.description);
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
): Promise<Result> {
  if (cache === "true") {
    const data = await getCachedMeta(url, method);
    if (data) return { data, method, cache: true };
  }

  const data: Data = await downloadHTML(url, method)
    .then((html) => parseHTML(url, html))
    .catch((error) => {
      console.log("Could not get data");
      console.error(error);
      return {};
    });

  if (cache === "true" || cache === "refresh") {
    setCachedMeta(url, "fetch", data);
  }

  return { data, method, cache: false };
}
