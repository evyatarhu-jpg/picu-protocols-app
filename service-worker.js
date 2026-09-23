const CACHE = 'picu-v8';
const APP_SHELL = [
  './', './index.html', './style.css', './app.js', './manifest.json',
  './dka.html', './bleeding.html', './anticoagulation.html', './warfarin.html',
  './feeding.html', './air-embolism.html', './delirium.html', './pain.html',
  './chylothorax.html', './assets/icon-192.png', './assets/icon-512.png',
  './assets/chylothorax-protocol.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request))
  );
});
