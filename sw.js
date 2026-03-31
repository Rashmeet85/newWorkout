// Service Worker — Hunter's System PWA
const CACHE_NAME = 'hunters-system-v1';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './js/data.js',
  './images/dark_e.png',
  './images/dark_d.png',
  './images/dark_c.png',
  './images/dark_b.png',
  './images/dark_a.png',
  './images/dark_s.png',
  './images/dark_ss.png',
  './images/dark_sss.png',
  './images/light_e.png',
  './images/light_d.png',
  './images/light_c.png',
  './images/light_b.png',
  './images/light_a.png',
  './images/light_s.png',
  './images/light_ss.png',
  './images/light_sss.png',
  './images/silhouette_dark.png',
  './images/silhouette_light.png',
  './images/str_dark.png',
  './images/str_light.png',
  './images/end_dark.png',
  './images/end_light.png',
  './images/agi_dark.png',
  './images/agi_light.png',
  './images/wil_dark.png',
  './images/wil_light.png',
  './images/gate_dark_1.png',
  './images/gate_dark_2.png',
  './images/gate_light_1.png',
  './images/gate_light_2.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (!e.request.url.startsWith('http')) return;

  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('./index.html'))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((res) => {
          if (!res || res.status !== 200 || res.type === 'opaque') return res;
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          return res;
        });
      })
    );
  }
});
