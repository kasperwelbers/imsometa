import { Semaphore, withTimeout, E_TIMEOUT } from "async-mutex";

const MAX_CONCURRENT_FETCH = 50;
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
        const response = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; AcademicMetaBot/1.0; Twitterbot",
          },
          signal: controller.signal,
        });

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
