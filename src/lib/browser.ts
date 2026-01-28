import { type Browser, type BrowserContext } from "playwright";
import { chromium } from "playwright-extra";

import stealth from "puppeteer-extra-plugin-stealth";

chromium.use(stealth());

export class BrowserManager {
  private browser: Browser | null = null;
  private timer: Timer | null = null;
  private readonly IDLE_TIMEOUT_MS = 30_000; // 30 seconds

  private async getBrowser() {
    if (!this.browser) {
      console.log("🚀 Launching Headless Browser...");
      this.browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"], // Needed for Docker
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

  /**
   * Fetches the head content using Playwright.
   * Blocks images, fonts, and media to save bandwidth.
   */
  async getHTML(url: string): Promise<string> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      // 1. Block heavy resources
      await page.route("**/*", (route) => {
        const type = route.request().resourceType();
        if (["image", "font", "media", "stylesheet", "other"].includes(type)) {
          return route.abort();
        }
        return route.continue();
      });

      // 2. Go to page and wait for DOM
      await page.goto(url);
      await page.waitForSelector('head meta[property="og:title"]', {
        state: "attached",
      });

      // 3. extract content
      return await page.content();
    } catch (err) {
      console.error(`Playwright failed for ${url}:`, err);
      return "";
    } finally {
      await page.close();
      this.resetTimer(); // Keep browser alive
    }
  }
}

export const browserManager = new BrowserManager();
