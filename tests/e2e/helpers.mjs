// Shared helpers for the browser tests.
// BASE_URL   — where the game runs (default: the dev server, http://127.0.0.1:8080/)
// PW_CHROMIUM — optional path to a Chrome/Chromium binary (otherwise Playwright's own browser)
import { chromium, devices } from "playwright";

export const BASE = process.env.BASE_URL || "http://127.0.0.1:8080/";

/** `t` is the node:test context: the browser closes even when an assertion fails. */
export async function openPhone(t, { progress, autoplay = false } = {}) {
  const browser = await chromium.launch({
    executablePath: process.env.PW_CHROMIUM || undefined,
    args: autoplay ? ["--autoplay-policy=no-user-gesture-required"] : [],
  });
  t?.after(() => browser.close().catch(() => {}));
  const context = await browser.newContext({ ...devices["iPhone 13"], serviceWorkers: "allow" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  // count every sound that starts, and optionally start from a saved progress
  await page.addInitScript((seed) => {
    window.__sounds = [];
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...a) {
      if (this.buffer && this.buffer.duration > 0.05) window.__sounds.push(this.buffer.duration);
      return start.apply(this, a);
    };
    if (seed && !sessionStorage.getItem("seeded")) {
      sessionStorage.setItem("seeded", "1");
      localStorage.setItem("kto-skazal:progress", JSON.stringify(seed));
    }
  }, progress ?? null);
  // not "networkidle": the built app keeps downloading files for offline play in the background
  await page.goto(BASE, { waitUntil: "load" });
  await page.locator(".game-tile, .rest").first().waitFor({ timeout: 60000 });
  await page.waitForTimeout(500);
  return { browser, context, page, errors };
}

/** Grown-up press: hold the button for 2.8 s. */
export async function hold(page, selector) {
  const box = await page.locator(selector).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(2800);
  await page.mouse.up();
  await page.waitForTimeout(400);
}

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

export async function openGame(page, game, set) {
  await page.click(`.game-tile.is-${game}`);
  if (set) {
    await page.click(`.set >> text=${set}`);
    await page.click('button[aria-label="Играть"]');
  }
  await page.waitForTimeout(1500);
}

export const finaleShown = (page) => page.locator(".praise").count();
