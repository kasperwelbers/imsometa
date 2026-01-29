import { type Browser, type Page } from "playwright";
import { chromium } from "playwright-extra";
import { Semaphore, withTimeout, E_TIMEOUT } from "async-mutex";

import stealth from "puppeteer-extra-plugin-stealth";

chromium.use(stealth());

export class BrowserManager {
  private browser: Browser | null = null;
  private timer: Timer | null = null;
  private readonly IDLE_TIMEOUT_MS = 30_000;
  private readonly MAX_CONCURRENT_PAGES = 5;
  private readonly QUEUE_TIMEOUT_MS = 15_000;

  private semaphore = withTimeout(
    new Semaphore(this.MAX_CONCURRENT_PAGES),
    this.QUEUE_TIMEOUT_MS,
  );

  async getHTML(url: string): Promise<string> {
    try {
      return await this.semaphore.runExclusive(async () => {
        const browser = await this.getBrowser();
        return await this.performScrape(browser, url);
      });
    } catch (err) {
      return this.handleGlobalError(url, err);
    }
  }

  private async performScrape(browser: Browser, url: string): Promise<string> {
    const page = await browser.newPage();
    try {
      await this.configurePage(page);

      // Navigate and Wait
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20_000 });
      await this.waitForMetadata(page);

      return await page.content();
    } finally {
      await page.close();
      this.resetTimer();
    }
  }

  /**
   * Block unnecessary assets
   */
  private async configurePage(page: Page) {
    await page.route("**/*", (route) => {
      const blocked = ["image", "font", "media", "stylesheet", "other"];
      return blocked.includes(route.request().resourceType())
        ? route.abort()
        : route.continue();
    });
  }

  /**
   * Wait for essential meta tags (Social share info)
   */
  private async waitForMetadata(page: Page) {
    const metaSelector =
      'title, meta[property="og:title"], meta[name="twitter:title"], meta[name="description"]';
    await page
      .waitForSelector(metaSelector, {
        state: "attached",
        timeout: 5000,
      })
      .catch(() => {
        console.warn("No standard metadata tags found within timeout.");
      });
  }

  private handleGlobalError(url: string, err: unknown): string {
    if (err === E_TIMEOUT) {
      console.warn(`⏳ Queue Timeout: Server too busy for ${url}`);
      return "ERROR_TIMEOUT";
    }
    console.error(`❌ Scrape Failed for ${url}:`, err);
    return "";
  }

  /**
   * Browser Lifecycle Management
   */
  private async getBrowser() {
    if (!this.browser) {
      console.log("🚀 Launching Headless Browser...");
      this.browser = await chromium.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
      });
    }
    this.resetTimer();
    return this.browser;
  }

  private resetTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(async () => {
      if (this.browser) {
        console.log("💤 Browser idle. Closing...");
        await this.browser.close();
        this.browser = null;
      }
    }, this.IDLE_TIMEOUT_MS);
  }
}

export const browserManager = new BrowserManager();
