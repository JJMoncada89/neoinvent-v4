/* NEOINVENT V4 — Service Worker (PWA offline) */
const CACHE = 'neoinvent-v4-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/store.js',
  './js/utils.js',
  './js/ui.js',
  './js/app.js',
  './js/views/dashboard.js',
  './js/views/inventory.js',
  './js/views/pos.js',
  './js/views/sales.js',
  './js/views/clients.js',
  './js/views/reports.js',
  './js/views/settings.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetched = fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});