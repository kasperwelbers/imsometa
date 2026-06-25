import { Semaphore, withTimeout, E_TIMEOUT } from "async-mutex";

// Optional datacenter proxy for outbound fetch requests (e.g. Webshare rotating endpoint).
// Format: http://user:pass@p.webshare.io:80
const PROXY_DATACENTER = process.env.PROXY_DATACENTER ?? null;

const MAX_CONCURRENT_FETCH = Number(process.env.FETCH_CONCURRENCY ?? 50);
const FETCH_QUEUE_TIMEOUT = 10_000; // 10s wait in queue
const NETWORK_TIMEOUT = 10_000; // 10s wait for the actual download

const fetchSemaphore = withTimeout(
  new Semaphore(MAX_CONCURRENT_FETCH),
  FETCH_QUEUE_TIMEOUT,
);

export async function fetchMethod(url: string): Promise<string> {
  try {
    return await fetchSemaphore.runExclusive(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), NETWORK_TIMEOUT);

      try {
        const fetchInit: RequestInit & { proxy?: string } = {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; AcademicMetaBot/1.0; Twitterbot",
          },
          signal: controller.signal,
          ...(PROXY_DATACENTER && { proxy: PROXY_DATACENTER }),
        };
        const response = await fetch(url, fetchInit);

        if (!response.ok) {
          console.warn(`Fetch failed for ${url}: ${response.status}`);
          return "";
        }

        return await response.text();
      } finally {
        clearTimeout(timeoutId);
      }
    });
  } catch (error) {
    if (error === E_TIMEOUT) {
      console.error(`⏳ Fetch Queue Timeout: Server overloaded for ${url}`);
      return "ERROR_QUEUE_TIMEOUT";
    }

    if (error instanceof Error && error.name === "AbortError") {
      console.error(`❌ Fetch Network Timeout for ${url}`);
      return "ERROR_NETWORK_TIMEOUT";
    }

    console.log(`Could not fetch ${url}:`, error);
    return "";
  }
}
