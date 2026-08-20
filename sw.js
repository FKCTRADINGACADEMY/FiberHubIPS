/**
 * FiberHub ISP - Service Worker
 * Network-first + instant update on new version
 */

const CACHE_VERSION = "fiberhub-v1.6.0";
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

// Install - cache shell, take control immediately
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate - delete old caches, claim all clients
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

// Network-first for HTML/JS/CSS (always fresh), cache fallback offline
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  const url = event.request.url;

  // Always network-first for app files so updates show immediately
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
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
