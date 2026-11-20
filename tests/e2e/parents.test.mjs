// Parents' corner: sets switched off, time limit with the rest screen, volumes saved.
import { test } from "node:test";
import assert from "node:assert/strict";
import { hold, openPhone, today } from "./helpers.mjs";

test("switched-off sets disappear from the set picker", async (t) => {
  const { browser, page, errors } = await openPhone(t);
  await hold(page, ".level-chip");
  await page.click(".parents .switch >> text=Машины");
  await page.click(".parents .switch >> text=Море");
  await page.click(".parents-close");
  await page.click(".game-tile.is-quiz");
  await page.waitForTimeout(300);
  assert.equal(await page.locator(".sets-screen .set:not(.mix)").count(), 8);
  assert.deepEqual(errors, []);
  await browser.close();
});

test("time limit: rest screen, a grown-up adds 10 minutes", async (t) => {
  const { browser, page, errors } = await openPhone(t, {
    progress: { settings: { limit: 10 }, playLog: { [today()]: 700 } },
  });
  await page.waitForTimeout(500);
  assert.equal(await page.locator(".rest").count(), 1, "rest screen");
  await hold(page, ".rest-more");
  assert.equal(await page.locator(".rest").count(), 0);
  assert.equal(await page.locator(".game-tile").count(), 7);
  assert.deepEqual(errors, []);
  await browser.close();
});

test("volumes and facts are saved", async (t) => {
  const { browser, page, errors } = await openPhone(t);
  await hold(page, ".level-chip");
  await page.click(".parents .switch >> text=Факт после ответа");
  await page.click(".parents-tab >> text=Звук");
  await page.locator("#vol-Музыка").fill("0.3");
  const s = JSON.parse(
    await page.evaluate(() => localStorage.getItem("kto-skazal:progress")),
  ).settings;
  assert.equal(s.facts, false);
  assert.equal(s.volume.music, 0.3);
  assert.deepEqual(errors, []);
  await browser.close();
});
