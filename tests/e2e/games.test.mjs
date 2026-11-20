// Every game can be played from the shelf to «Молодец!» on a phone, with sounds and no errors.
import { test } from "node:test";
import assert from "node:assert/strict";
import { finaleShown, openGame, openPhone } from "./helpers.mjs";

test("shelf shows seven games, fits the phone", async (t) => {
  const { browser, page, errors } = await openPhone(t);
  assert.equal(await page.locator(".game-tile").count(), 7);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  await browser.close();
});

test("«Кто сказал?»: eight rounds to the finale, a sticker is given", async (t) => {
  const { browser, page, errors } = await openPhone(t, { autoplay: true });
  await openGame(page, "quiz", "Домашние");
  for (let round = 0; round < 8; round++) {
    for (let k = 0; k < 6; k++) {
      if (await page.locator(".card.is-good").count()) break;
      const free = page.locator('.cards .card:not([aria-disabled="true"])');
      if (!(await free.count())) break;
      await free.first().click({ force: true });
      await page.waitForTimeout(450);
    }
    for (let w = 0; w < 40; w++) {
      await page.waitForTimeout(250);
      if ((await finaleShown(page)) || !(await page.locator(".card.is-good").count())) break;
    }
    if (await finaleShown(page)) break;
  }
  assert.equal(await finaleShown(page), 1, "finale");
  await page.waitForTimeout(1200);
  assert.equal(await page.locator(".sticker-img").count(), 1, "new sticker");
  assert.ok((await page.evaluate(() => window.__sounds.length)) > 10, "sounds played");
  assert.deepEqual(errors, []);
  await browser.close();
});

test("«Чей голос?»: bells to the finale", async (t) => {
  const { browser, page, errors } = await openPhone(t, { autoplay: true });
  await openGame(page, "reverse", "Машины");
  for (let round = 0; round < 8 && !(await finaleShown(page)); round++) {
    for (let k = 0; k < 3; k++) {
      if (await page.locator(".card.hero.is-good").count()) break;
      const bells = page.locator(".bell:not(.is-wrong)");
      if (!(await bells.count())) break;
      await bells.first().click();
      await page.waitForTimeout(3000);
    }
    await page.waitForTimeout(2200);
  }
  assert.equal(await finaleShown(page), 1);
  assert.deepEqual(errors, []);
  await browser.close();
});

test("«Найди пару»: all pairs found, next board is bigger", async (t) => {
  const { browser, page, errors } = await openPhone(t, { autoplay: true });
  await openGame(page, "pairs", "Домашние");
  const flips = page.locator(".flip");
  const n = await flips.count();
  const names = [];
  for (let i = 0; i < n; i++) {
    await flips.nth(i).click();
    await page.waitForTimeout(150);
    names.push(await flips.nth(i).getAttribute("aria-label"));
    if (i % 2 === 1) await page.waitForTimeout(3200);
  }
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      if (names[i] !== names[j]) continue;
      if ((await flips.nth(i).getAttribute("class")).includes("is-matched")) continue;
      await flips.nth(i).click();
      await page.waitForTimeout(150);
      await flips.nth(j).click();
      await page.waitForTimeout(2600);
    }
  await page.waitForTimeout(3000);
  assert.equal(await finaleShown(page), 1);
  await page.click('button[aria-label="Играть ещё"]');
  await page.waitForTimeout(800);
  assert.ok((await page.locator(".flip").count()) > n, "bigger board");
  assert.deepEqual(errors, []);
  await browser.close();
});

test("«Кто где живёт»: drag and tap toys home to the finale", async (t) => {
  const { browser, page, errors } = await openPhone(t, { autoplay: true });
  await openGame(page, "homes");
  for (let round = 0; round < 8 && !(await finaleShown(page)); round++) {
    const homes = page.locator(".home");
    const count = await homes.count();
    for (let k = 0; k < count; k++) {
      if (await page.locator(".card.drag.is-flying").count()) break;
      if (round % 2 === 0) {
        const card = await page.locator(".card.drag").boundingBox();
        const home = await homes.nth(k).boundingBox();
        await page.mouse.move(card.x + card.width / 2, card.y + card.height / 2);
        await page.mouse.down();
        await page.mouse.move(card.x + card.width / 2 + 10, card.y + card.height / 2 + 10, {
          steps: 3,
        });
        await page.mouse.move(home.x + home.width / 2, home.y + home.height / 2, { steps: 8 });
        await page.mouse.up();
      } else {
        await homes.nth(k).click();
      }
      await page.waitForTimeout(700);
    }
    await page.waitForTimeout(2600);
  }
  assert.equal(await finaleShown(page), 1);
  assert.deepEqual(errors, []);
  await browser.close();
});

test("«Послушать»: a tap plays the toy", async (t) => {
  const { browser, page, errors } = await openPhone(t, { autoplay: true });
  await openGame(page, "listen", "Лесные");
  await page.locator(".card.mini").nth(2).click();
  await page.waitForTimeout(1500);
  assert.ok((await page.evaluate(() => window.__sounds.length)) >= 1);
  assert.deepEqual(errors, []);
  await browser.close();
});

test("«Мама и малыш»: mums and babies to the finale", async (t) => {
  const { browser, page, errors } = await openPhone(t, { autoplay: true });
  await openGame(page, "babies");
  for (let round = 0; round < 8 && !(await finaleShown(page)); round++) {
    for (let k = 0; k < 4; k++) {
      if (await page.locator(".card.is-good").count()) break;
      const free = page.locator('.cards .card:not([aria-disabled="true"])');
      if (!(await free.count())) break;
      await free.first().click({ force: true });
      await page.waitForTimeout(450);
    }
    for (let w = 0; w < 30; w++) {
      await page.waitForTimeout(250);
      if ((await finaleShown(page)) || !(await page.locator(".card.is-good").count())) break;
    }
  }
  assert.equal(await finaleShown(page), 1);
  assert.ok((await page.evaluate(() => window.__sounds.length)) > 8, "sounds played");
  assert.deepEqual(errors, []);
  await browser.close();
});

test("«Прятки»: find the hidden toy by ear, to the finale", async (t) => {
  const { browser, page, errors } = await openPhone(t, { autoplay: true });
  await openGame(page, "hide", "Лесные");
  for (let round = 0; round < 8 && !(await finaleShown(page)); round++) {
    const spots = page.locator(".hide-spot");
    await spots.first().waitFor({ timeout: 20000 });
    for (let k = 0; k < (await spots.count()); k++) {
      if (await page.locator(".hide-spot.is-found").count()) break;
      if ((await spots.nth(k).getAttribute("aria-disabled")) === "true") continue;
      await spots.nth(k).click();
      await page.waitForTimeout(1600);
    }
    for (let w = 0; w < 40; w++) {
      await page.waitForTimeout(250);
      if ((await finaleShown(page)) || !(await page.locator(".hide-spot.is-found").count())) break;
    }
  }
  assert.equal(await finaleShown(page), 1);
  assert.ok((await page.evaluate(() => window.__sounds.length)) > 8, "calls played");
  assert.deepEqual(errors, []);
  await browser.close();
});
