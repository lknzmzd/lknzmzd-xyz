// sw.js — LKNZMZD (Safari-safe)

const CACHE_VERSION = "lknzmzd-v4";
const STATIC_CACHE = `${CACHE_VERSION}-static`;

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.map((key) => {
        if (!key.startsWith(CACHE_VERSION)) {
          return caches.delete(key);
        }
      })
    );
    await self.clients.claim();
  })());
});


// -----------
// NETWORK FIRST (HTML)
// -----------
async function networkFirst(request) {
  try {
    const response = await fetch(request, {
      redirect: "follow",
      cache: "no-store"
    });

    // Safari: DO NOT return redirected responses
    if (response.redirected) {
      return fetch(request.url, { cache: "no-store" });
    }

    return response;
  } catch (err) {
    const cached = await caches.match(request);
    return cached || Response.error();
  }
}


// -----------
// CACHE FIRST (assets)
// -----------
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);

  // 🚨 Never cache redirected responses
  if (!response || response.redirected || response.status >= 300) {
    return response;
  }

  const cache = await caches.open(STATIC_CACHE);
  cache.put(request, response.clone());

  return response;
}


// -----------
// FETCH HANDLER
// -----------
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (url.origin !== location.origin) return;

  // HTML → network first
  if (
    request.mode === "navigate" ||
    request.headers.get("accept")?.includes("text/html")
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets
  if (
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.match(/\.(png|jpg|jpeg|webp|svg|woff2?)$/)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }
});
