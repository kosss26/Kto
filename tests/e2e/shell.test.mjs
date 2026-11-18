// Shelf behaviour: grown-up lock, Android «Назад», album, guest of the day, set party.
import { test } from "node:test";
import assert from "node:assert/strict";
import { hold, openPhone, today } from "./helpers.mjs";

const where = (page) =>
  page.evaluate(() =>
    document.querySelector(".game-tile")
      ? "menu"
      : document.querySelector(".sets-screen")
        ? "sets"
        : document.querySelector(".album-page")
          ? "album"
          : document.querySelector("main.play")
            ? "play"
            : "?",
  );

test("settings open only after holding the button", async (t) => {
  const { browser, page, errors } = await openPhone(t);
  await page.tap(".level-chip");
  await page.waitForTimeout(300);
  assert.equal(await page.locator(".sheet").count(), 0, "short tap does nothing");
  assert.equal(await page.locator(".hold-hint").count(), 1, "hint for grown-ups");
  await hold(page, ".level-chip");
  assert.equal(await page.locator(".sheet").count(), 1, "hold opens");
  assert.deepEqual(errors, []);
  await browser.close();
});

test("«Назад» goes one step back", async (t) => {
  const { browser, page, errors } = await openPhone(t);
  await page.click(".game-tile.is-quiz");
  await page.click('button[aria-label="Играть"]');
  await page.waitForTimeout(1000);
  assert.equal(await where(page), "play");
  await page.goBack();
  await page.waitForTimeout(400);
  assert.equal(await where(page), "sets");
  await page.goBack();
  await page.waitForTimeout(400);
  assert.equal(await where(page), "menu");
  await page.click(".album-btn");
  await page.waitForTimeout(400);
  await page.goBack();
  await page.waitForTimeout(400);
  assert.equal(await where(page), "menu");
  await hold(page, ".level-chip");
  await page.goBack();
  await page.waitForTimeout(400);
  assert.equal(await page.locator(".sheet").count(), 0, "back closes the settings");
  assert.deepEqual(errors, []);
  await browser.close();
});

test("guest of the day leaves a sticker that completes a set → party", async (t) => {
  const pets = [
    "hamster",
    "guineapig",
    "chinchilla",
    "ferret",
    "rat",
    "mouse",
    "gerbil",
    "degu",
    "budgie",
  ];
  const { browser, page, errors } = await openPhone(t, {
    autoplay: true,
    progress: { stickers: pets, guest: { day: today(), id: "rabbit", met: false }, partied: [] },
  });
  await page.click(".guest");
  let party = 0;
  for (let i = 0; i < 20 && !party; i++) {
    await page.waitForTimeout(500);
    party = await page.locator(".party").count();
  }
  assert.equal(party, 1, "party for the completed set");
  await page.click(".party-ok");
  const saved = JSON.parse(await page.evaluate(() => localStorage.getItem("kto-skazal:progress")));
  assert.ok(saved.stickers.includes("rabbit"));
  assert.deepEqual(saved.partied, ["pets"]);
  assert.deepEqual(errors, []);
  await browser.close();
});
