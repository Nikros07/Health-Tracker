const CACHE = 'tracker-v1';
const ASSETS = [
  './',
  './index.html',
  './css/reset.css',
  './css/design-system.css',
  './css/layout.css',
  './css/components.css',
  './css/animations.css',
  './js/main.js',
  './js/router.js',
  './js/store.js',
  './js/models.js',
  './js/charts.js',
  './js/utils.js',
  './js/github-storage.js',
  './js/views/dashboard.js',
  './js/views/log.js',
  './js/views/history.js',
  './js/views/settings.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('api.github.com') || e.request.url.includes('fonts.googleapis.com') || e.request.url.includes('cdn.jsdelivr.net')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
