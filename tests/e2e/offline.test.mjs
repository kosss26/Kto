// Offline play. Needs the built app (service worker): npm run build && npm run preview:restart,
// then OFFLINE=1 BASE_URL=http://127.0.0.1:8081/ npm run test:e2e
import { test } from "node:test";
import assert from "node:assert/strict";
import { hold, openGame, openPhone } from "./helpers.mjs";

test(
  "downloads everything, then plays with the network off",
  { skip: !process.env.OFFLINE },
  async (t) => {
    const { browser, context, page, errors } = await openPhone(t, { autoplay: true });
    await hold(page, ".level-chip");
    await page.click(".parents-tab >> text=Звук");
    let text = "";
    for (let i = 0; i < 240 && !text.includes("Готово"); i++) {
      await page.waitForTimeout(1000);
      text =
        (await page
          .locator(".offline-row")
          .textContent()
          .catch(() => "")) || "";
    }
    assert.match(text, /Готово/);
    await context.setOffline(true);
    await page.reload({ waitUntil: "load" });
    await page.waitForTimeout(1500);
    assert.equal(await page.locator(".game-tile").count(), 6, "shelf opens offline");
    await openGame(page, "quiz", "Море");
    await page.locator(".cards .card").first().click({ force: true });
    await page.waitForTimeout(2500);
    assert.ok((await page.evaluate(() => window.__sounds.length)) >= 1, "sound offline");
    const broken = await page.evaluate(
      () => [...document.images].filter((i) => i.complete && !i.naturalWidth).length,
    );
    assert.equal(broken, 0, "pictures offline");
    assert.deepEqual(errors, []);
    await browser.close();
  },
);
