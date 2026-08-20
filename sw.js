/**
 * FiberHub ISP - Service Worker (PWA)
 * Offline support + auto cache update
 */

const CACHE_VERSION = "fiberhub-v1.0.0";
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
  "./manifest.json",
  "./version.json"
];

// Install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Caching app shell");
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate - clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k.startsWith("fiberhub-") && k !== CACHE_NAME)
            .map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - network first, fallback to cache
self.addEventListener("fetch", (event) => {
  // Skip non-GET and external (Firebase etc.)
  if (event.request.method !== "GET") return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          return cached || caches.match("./index.html");
        });
      })
  );
});

// Listen for version update messages
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
