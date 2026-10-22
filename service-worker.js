const CACHE = "picu-v34-force-pwa-update";

const PRECACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./design-vnext.css",
  "./design-vnext.js",
  "./app.js",
  "./manifest.json",
  "./dka.html",
  "./bleeding.html",
  "./anticoagulation.html",
  "./warfarin.html",
  "./feeding.html",
  "./air-embolism.html",
  "./delirium.html",
  "./pain.html",
  "./chylothorax.html",
  "./bivalirudin.html",
  "./berlin-excor-anticoagulation.html",
  "./burn-pain.html",
  "./tbi.html",
  "./sildenafil.html",
  "./levosimendan.html",
  "./iloprost.html",
  "./assets/tbi-algorithm.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(async cache => {
      // Fetch a fresh copy of every precached resource rather than reusing
      // the browser HTTP cache from an older installed PWA.
      await Promise.all(
        PRECACHE.map(async path => {
          const request = new Request(path, { cache: "reload" });
          const response = await fetch(request);
          if (response && response.ok) await cache.put(path, response.clone());
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const request = event.request;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request, { cache: request.mode === "navigate" ? "reload" : "no-store" })
      .then(response => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
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
