/**
 * FiberHub ISP - Service Worker
 * Instant update: network-first + skipWaiting + claim
 * CACHE_VERSION must match version.json when you deploy
 */
const CACHE_VERSION = "fiberhub-v1.9.6";
const CACHE_NAME = `fiberhub-${CACHE_VERSION}`;

const ASSETS = [
  "./",
  "./index.html",
  "./dashboard.html",
  "./css/style.css",
  "./css/themes.css",
  "./js/firebase-config.js",
  "./js/auth.js",
  "./js/app.js",
  "./js/dashboard.js",
  "./assets/logo.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/apple-touch-icon.png",
  "./manifest.json",
  "./version.json"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS).catch(() => {}))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("fiberhub-") && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Network-first so new deploy is seen immediately
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) =>
          cached || caches.match("./index.html")
        )
      )
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data && event.data.type === "GET_VERSION") {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});
