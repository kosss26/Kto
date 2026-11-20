// Every toy has all its files: picture, sticker, its call (or «Где …?»), the spoken answers and fact.
// Runs without a browser.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const src = readFileSync(new URL("../../src/lib/who-said/content.ts", import.meta.url), "utf8");
const items = [
  ...src.matchAll(/\{ id: "(\w+)", name: "[^"]+", mode: "(\w+)"(, sound: true)?/g),
].map((m) => ({ id: m[1], mode: m[2], sound: Boolean(m[3]) }));
const pub = (p) => new URL(`../../public${p}`, import.meta.url);

test("content: every toy has its pictures and voice", () => {
  assert.ok(items.length >= 130, `toys: ${items.length}`);
  const missing = [];
  for (const { id, sound } of items) {
    const files = [
      `/felt/${id}.webp`,
      `/stickers/${id}.webp`,
      sound ? `/sfx/${id}.mp3` : `/voice/where-${id}.mp3`,
      `/voice/this-${id}.mp3`,
      `/voice/yes-${id}-1.mp3`,
      `/voice/fact-${id}.mp3`,
      `/voice/guest-${id}.mp3`,
    ];
    if (sound) files.push(`/voice/how-${id}.mp3`);
    for (const f of files) if (!existsSync(pub(f))) missing.push(f);
  }
  assert.deepEqual(missing, []);
});

test("content: every set has a world, a cover and its «all collected» line", () => {
  const modes = [...new Set(items.map((i) => i.mode))];
  assert.equal(modes.length, 10);
  for (const mode of modes) {
    assert.ok(existsSync(pub(`/voice/setdone-${mode}.mp3`)), `setdone-${mode}`);
    assert.ok(src.includes(`  ${mode}: { sky:`), `world for ${mode}`);
    assert.ok(
      new RegExp(`id: "${mode}", label: "[^"]+", cover: "\\w+"|id: "${mode}",\\s+label:`).test(src),
      `set ${mode}`,
    );
  }
  for (const w of ["farm", "pets", "forest", "zoo", "sea", "city", "music", "home"])
    assert.ok(existsSync(pub(`/worlds/${w}.webp`)), `world ${w}`);
});

test("content: every menu tile has its felt scene", () => {
  const tiles = src.match(/export const TILES = \[([^\]]+)\]/)[1].match(/\w+/g);
  assert.equal(tiles.length, 9);
  for (const t of tiles) assert.ok(existsSync(pub(`/felt/tile-${t}.webp`)), `tile-${t}`);
});
