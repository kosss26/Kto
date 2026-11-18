/* «Кто сказал?» — offline support.
 * shell: the page and its hashed /assets/* files; media: toys, stickers, sounds, voice, music.
 * Media URLs carry ?v=<content hash>, so a cached copy is always the right one (cache-first).
 * The page fills the media cache itself (src/lib/who-said/offline.ts), this worker serves it.
 */
const SHELL = "kto-shell-v1";
const MEDIA = "kto-media";
const FONTS = "kto-fonts";
const KEEP = [SHELL, MEDIA, FONTS];
const MEDIA_PATH = /^\/(felt|stickers|sfx|voice|music|worlds)\//;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.add("/"))
      .catch(() => {}),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => !KEEP.includes(n)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

/** Safari plays <audio> with Range requests; answer them from the cached file. */
async function ranged(request, response) {
  const range = request.headers.get("range");
  if (!range || !response) return response;
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  if (!m) return response;
  const buf = await response.arrayBuffer();
  const size = buf.byteLength;
  const start = m[1] ? Number(m[1]) : 0;
  const end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "audio/mpeg",
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
    },
  });
}

async function cacheFirst(cacheName, request, key = request) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(key);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok && res.status === 200) cache.put(key, res.clone()).catch(() => {});
  return res;
}

async function networkFirst(request, fallbackKey) {
  const cache = await caches.open(SHELL);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(fallbackKey || request, res.clone()).catch(() => {});
    return res;
  } catch (err) {
    const hit = await cache.match(fallbackKey || request, { ignoreSearch: true });
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (request.mode === "navigate") {
      // the game is one page: online it is always fresh, offline the saved copy opens
      event.respondWith(networkFirst(request, url.pathname === "/" && !url.search ? "/" : undefined).catch(() =>
        caches.open(SHELL).then((c) => c.match("/")),
      ));
      return;
    }
    if (MEDIA_PATH.test(url.pathname)) {
      // Range requests are cached under a plain request for the same URL
      const plain = new Request(url.href);
      event.respondWith(cacheFirst(MEDIA, plain).then((res) => ranged(request, res)));
      return;
    }
    if (url.pathname.startsWith("/assets/")) {
      event.respondWith(cacheFirst(SHELL, request));
      return;
    }
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(cacheFirst(FONTS, request));
  }
});
