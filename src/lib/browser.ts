import { type Browser, type BrowserContext, type Page } from "playwright";
import { chromium } from "playwright-extra";
import { Semaphore, withTimeout, E_TIMEOUT } from "async-mutex";
import stealth from "puppeteer-extra-plugin-stealth";

chromium.use(stealth());

// Optional residential proxy for Playwright requests (e.g. Webshare static residential endpoint).
// Format: http://user:pass@residential.webshare.io:80
const PROXY_RESIDENTIAL = process.env.PROXY_RESIDENTIAL ?? null;

/** Parse a full proxy URL into the shape Playwright expects. */
function parseProxyUrl(proxyUrl: string): {
  server: string;
  username: string;
  password: string;
} {
  const url = new URL(proxyUrl);
  return {
    server: `${url.protocol}//${url.hostname}:${url.port}`,
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
  };
}

export class BrowserManager {
  private browser: Browser | null = null;
  private timer: Timer | null = null;
  private activePages = 0; // Track active tasks

  private readonly IDLE_TIMEOUT_MS = 30_000;
  private readonly MAX_CONCURRENT_PAGES = Number(
    process.env.PLAYWRIGHT_CONCURRENCY ?? 5,
  );
  private readonly QUEUE_TIMEOUT_MS = 15_000;

  private semaphore = withTimeout(
    new Semaphore(this.MAX_CONCURRENT_PAGES),
    this.QUEUE_TIMEOUT_MS,
  );

  async getHTML(url: string): Promise<string> {
    try {
      return await this.semaphore.runExclusive(async () => {
        const browser = await this.getBrowser();
        // Create a context with a real Human User-Agent
        const context = await browser.newContext({
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          viewport: { width: 1280, height: 720 },
          ...(PROXY_RESIDENTIAL && { proxy: parseProxyUrl(PROXY_RESIDENTIAL) }),
        });

        this.activePages++;
        try {
          return await this.performScrape(context, url);
        } finally {
          this.activePages--;
          await context.close(); // Closes all pages in this context
          this.resetTimer();
        }
      });
    } catch (err) {
      return this.handleGlobalError(url, err);
    }
  }

  private async performScrape(
    context: BrowserContext,
    url: string,
  ): Promise<string> {
    const page = await context.newPage();
    await this.configurePage(page);

    // Navigate
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25_000 });

    // Custom wait: Wait for body or specific social metadata
    await this.waitForContent(page);

    return await page.content();
  }

  private async configurePage(page: Page) {
    await page.route("**/*", (route) => {
      // Keep: document (the page), script (needed for SPA meta rendering), xhr/fetch (API-driven meta)
      // Block everything else — none of it contributes to metadata
      const blocked = new Set([
        "stylesheet",
        "image",
        "media",
        "font",
        "texttrack",
        "manifest",
        "eventsource",
        "websocket",
        "other",
      ]);
      return blocked.has(route.request().resourceType())
        ? route.abort()
        : route.continue();
    });
  }

  private async waitForContent(page: Page) {
    // Wait for at least some text or meta tags to appear
    await Promise.race([
      page.waitForSelector("title", { state: "attached" }),
      page.waitForTimeout(5000),
    ]);
  }

  private async getBrowser() {
    if (!this.browser) {
      console.log("🚀 Launching Headless Browser...");
      this.browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-dev-shm-usage"],
      });
    }
    if (this.timer) clearTimeout(this.timer);
    return this.browser;
  }

  private resetTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(async () => {
      // Only close if no pages are currently processing
      if (this.browser && this.activePages === 0) {
        console.log("💤 Browser idle. Closing...");
        await this.browser.close();
        this.browser = null;
      }
    }, this.IDLE_TIMEOUT_MS);
  }

  private handleGlobalError(url: string, err: unknown): string {
    if (err === E_TIMEOUT) return "ERROR_TIMEOUT";
    console.error(`❌ Playwright Failed for ${url}:`, err);
    return "";
  }
}

export const browserManager = new BrowserManager();
