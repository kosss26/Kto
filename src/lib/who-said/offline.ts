import { useSyncExternalStore } from "react";
import { MUSIC_URL } from "./audio";
import { asset } from "./assets";
import {
  HOMES,
  HOME_IDS,
  ITEMS,
  PRAISE,
  VOICE,
  answerSrcs,
  callSrc,
  cardSrc,
  factSrc,
  guestSrc,
  MODES,
  setDoneSrc,
  homeAskSrc,
  howSrc,
  livesSrc,
  stickerSrc,
} from "./content";
import { nameLine } from "./names";
import { getProgress } from "./progress";

/**
 * Offline play: the service worker (public/sw.js) serves files from the "kto-media" cache;
 * this module fills that cache with every picture and sound the game can ask for,
 * a few files at a time in the background, and reports progress for the settings sheet.
 */
const MEDIA = "kto-media";
const SHELL = "kto-shell-v1";

export type OfflineState =
  | { stage: "off" }
  | { stage: "loading"; done: number; total: number }
  | { stage: "ready"; total: number }
  | { stage: "error"; done: number; total: number };

let state: OfflineState = { stage: "off" };
const listeners = new Set<() => void>();

function set(next: OfflineState) {
  state = next;
  for (const fn of listeners) fn();
}

export function useOffline() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => state,
    () => state,
  );
}

/** Every file the game can request, for the current child name. */
export function allMediaUrls() {
  const urls = new Set<string>();
  for (const { id, sound } of ITEMS) {
    urls.add(cardSrc(id));
    urls.add(stickerSrc(id));
    urls.add(callSrc(id));
    urls.add(factSrc(id));
    urls.add(guestSrc(id));
    for (const u of answerSrcs(id)) urls.add(u);
    if (sound) urls.add(howSrc(id));
  }
  for (const id of HOME_IDS) {
    urls.add(homeAskSrc(id));
    urls.add(livesSrc(id));
  }
  for (const m of MODES) urls.add(setDoneSrc(m.id));
  for (const h of HOMES) urls.add(asset(`/felt/home-${h.id}.webp`));
  for (const u of [...PRAISE, VOICE.bravo, VOICE.again, MUSIC_URL]) urls.add(u);
  const child = getProgress().child;
  if (child) for (const kind of ["hi", "bravo", "smart"] as const) urls.add(nameLine(child, kind));
  return [...urls];
}

const supported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "caches" in window;

let running: Promise<void> | null = null;

/** Download whatever is missing, then drop files from older versions. Safe to call any time. */
export function syncOffline() {
  if (!supported()) return Promise.resolve();
  if (running) return running;
  running = (async () => {
    const wanted = allMediaUrls().map((u) => new URL(u, location.origin).href);
    const cache = await caches.open(MEDIA);
    const have = new Set((await cache.keys()).map((r) => r.url));
    const todo = wanted.filter((u) => !have.has(u));
    const total = wanted.length;
    let done = total - todo.length;
    let failed = 0;
    set(todo.length ? { stage: "loading", done, total } : { stage: "ready", total });

    // the page's own scripts and styles, so the game also opens offline
    const shell = await caches.open(SHELL);
    const own = performance
      .getEntriesByType("resource")
      .map((e) => e.name)
      .filter((u) => u.startsWith(location.origin + "/assets/"));
    await Promise.all([location.origin + "/", ...own].map((u) => shell.add(u).catch(() => {})));
    // scripts from earlier versions of the game are no longer needed
    if (own.length) {
      for (const req of await shell.keys()) {
        if (req.url.includes("/assets/") && !own.includes(req.url)) await shell.delete(req);
      }
    }

    let next = 0;
    async function worker() {
      while (next < todo.length) {
        const url = todo[next++];
        try {
          const res = await fetch(url, { cache: "no-cache" });
          if (res.ok) await cache.put(url, res);
          else failed++;
        } catch {
          failed++;
        }
        done++;
        if (done % 10 === 0 || done === total) set({ stage: "loading", done, total });
      }
    }
    await Promise.all(Array.from({ length: 6 }, worker));

    // forget files that the current version no longer uses (old recordings, other names)
    const keep = new Set(wanted);
    for (const req of await cache.keys()) if (!keep.has(req.url)) await cache.delete(req);

    set(failed ? { stage: "error", done: total - failed, total } : { stage: "ready", total });
  })().finally(() => {
    running = null;
  });
  return running;
}

/** Register the worker (built app only) and start the background download when the page is idle. */
export function startOffline() {
  if (!supported() || !import.meta.env.PROD) return;
  navigator.serviceWorker
    .register("/sw.js")
    .then(() => navigator.serviceWorker.ready)
    .then(() => {
      const go = () => void syncOffline();
      if ("requestIdleCallback" in window) window.requestIdleCallback(go, { timeout: 4000 });
      else setTimeout(go, 2000);
    })
    .catch(() => {});
}
