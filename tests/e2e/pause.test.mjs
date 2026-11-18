// Pause when the app is hidden, and fast double taps.
import { test } from "node:test";
import assert from "node:assert/strict";
import { openGame, openPhone } from "./helpers.mjs";

/** Pretend the app went to the background / came back. */
const setHidden = (page, hidden) =>
  page.evaluate((h) => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => (h ? "hidden" : "visible"),
    });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);

/** Taps the right card: the one whose name the riddle asks for is unknown, so try until one is right. */
async function solveRound(page) {
  for (let k = 0; k < 6; k++) {
    if (await page.locator(".card.is-good").count()) return;
    await page.locator('.cards .card:not([aria-disabled="true"])').first().click({ force: true });
    await page.waitForTimeout(450);
  }
}

test("hidden app: the round waits, then carries on", async (t) => {
  const { browser, page, errors } = await openPhone(t, { autoplay: true });
  await openGame(page, "quiz", "Домашние");
  await solveRound(page);
  await setHidden(page, true);
  await page.waitForTimeout(7000); // longer than the answer + fact; without the pause the next round would start
  assert.equal(await page.locator(".card.is-good").count(), 1, "still on the solved round");
  await setHidden(page, false);
  let next = false;
  for (let i = 0; i < 30 && !next; i++) {
    await page.waitForTimeout(300);
    next = (await page.locator(".card.is-good").count()) === 0;
  }
  assert.ok(next, "next round after coming back");
  assert.deepEqual(errors, []);
  await browser.close();
});

test("double tap on the right card counts once", async (t) => {
  const { browser, page, errors } = await openPhone(t, {
    autoplay: true,
    progress: { level: "baby" },
  });
  await openGame(page, "quiz", "Домашние");
  // find the right card on round one: tap each card twice in the same moment
  const cards = page.locator(".cards .card");
  for (let k = 0; k < (await cards.count()); k++) {
    if (await page.locator(".card.is-good").count()) break;
    await cards.nth(k).evaluate((el) => {
      el.click();
      el.click();
    });
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(400);
  assert.equal(await page.locator(".track-star.is-on").count(), 1, "one star, not two");
  assert.deepEqual(errors, []);
  await browser.close();
});
