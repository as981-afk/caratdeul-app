/* CARATFLIX service worker.
 *
 * Only same-origin GET requests are handled. That deliberately covers the whole
 * YouTube side of the app: the embed player is on youtube-nocookie.com and the
 * thumbnails are on i.ytimg.com, so both are cross-origin and are passed
 * straight to the network — never intercepted, never served stale, and never
 * half-cached, which is exactly what breaks an embed. The synced data file
 * (src/data/youtubeVideos.json) is same-origin and is cached like the rest of
 * the app.
 *
 * - Navigations are network-first (falling back to the cached shell) so a new
 *   deploy is picked up immediately when online.
 * - Everything else (hashed JS/CSS/fonts/images) is cache-first: Vite's
 *   content-hashed filenames make stale copies impossible, and repeat visits
 *   then work with no network at all.
 */

const CACHE = "caratflix-v2";
const SHELL = ["/", "/index.html", "/manifest.webmanifest", "/favicon.svg", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Cross-origin (the YouTube embed iframe, its player requests, and the
  // i.ytimg.com thumbnails) is left entirely to the browser. See the header.
  if (new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put("/index.html", copy));
          return response;
        })
        .catch(() => caches.match("/index.html").then((cached) => cached || caches.match("/")))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
