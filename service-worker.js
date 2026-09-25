const CACHE = "picu-v11";

const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./dka.html",
  "./bleeding.html",
  "./anticoagulation.html",
  "./bivalirudin.html",
  "./warfarin.html",
  "./feeding.html",
  "./air-embolism.html",
  "./delirium.html",
  "./pain.html",
  "./chylothorax.html",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/chylothorax-protocol.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(APP_SHELL))
  );

  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE)
          .map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  // Do not cache partial PDF/range requests
  if (request.headers.has("range")) {
    event.respondWith(fetch(request));
    return;
  }

  // Only manage files from this app
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.ok) {
          const copy = response.clone();

          caches.open(CACHE).then(cache => {
            cache.put(request, copy);
          });
        }

        return response;
      })
      .catch(() =>
        caches.match(request).then(cached => {
          if (cached) return cached;

          if (request.mode === "navigate") {
            return caches.match("./index.html");
          }
        })
      )
  );
});