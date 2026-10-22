const CACHE = "picu-v41-category-colors";

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
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key !== CACHE)
        .map(key => caches.delete(key))
    );

    await self.clients.claim();

    const windows = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    });

    await Promise.all(windows.map(async client => {
      try {
        client.postMessage({ type: "APP_UPDATED", version: "41" });

        const url = new URL(client.url);
        if (url.origin !== self.location.origin) return;

        // Force a fresh navigation of the installed PWA without changing
        // the user's current page or losing its path.
        url.searchParams.set("_appv", "41");
        await client.navigate(url.href);
      } catch (_) {}
    }));
  })());
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
