// sw.js — LKNZMZD PWA cache (Safari-safe, no redirect responses)
const CACHE_NAME = "lknzmzd-v2";

const ASSETS = [
  "/index.html",
  "/division.html",
  "/style.css",
  "/main.js",
  "/manifest.webmanifest",

  // icons (adjust if your paths differ)
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

// Network-first for HTML navigations (fixes Safari back/forward + redirects)
// Cache-first for static assets
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // same-origin only
  if (url.origin !== self.location.origin) return;

  const isNav =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");

  if (isNav) {
    event.respondWith(networkFirst(req));
    return;
  }

  event.respondWith(cacheFirst(req));
});

async function networkFirst(req) {
  try {
    const fresh = await fetch(req, { redirect: "follow" });

    // Safari hates SW-served redirect responses
    if (fresh.redirected) return fresh;

    const cache = await caches.open(CACHE_NAME);
    cache.put(req, fresh.clone());
    return fresh;
  } catch {
    const cached = await caches.match(req);
    // fallback to homepage if offline and page missing
    return cached || caches.match("/index.html");
  }
}

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;

  const fresh = await fetch(req, { redirect: "follow" });

  // Don't cache redirected responses
  if (!fresh.redirected) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(req, fresh.clone());
  }
  return fresh;
}
