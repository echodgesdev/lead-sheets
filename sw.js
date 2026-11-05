const CACHE = 'tabs-v14';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.svg',
  './css/app.css',
  './css/sheet.css',
  './css/keybar.css',
  './js/app.js',
  './js/theme.js',
  './js/icons.js',
  './js/db.js',
  './js/store.js',
  './js/group.js',
  './js/backup.js',
  './js/modal.js',
  './js/prefs.js',
  './js/toast.js',
  './js/sheet/chords.js',
  './js/sheet/parse.js',
  './js/sheet/infer.js',
  './js/sheet/render.js',
  './js/sheet/transpose.js',
  './js/views/list.js',
  './js/views/live.js',
  './js/views/edit.js',
  './js/views/settings.js',
  './js/views/info.js',
  './js/edit/keybar.js',
];

const URLS = ASSETS.map((path) => new URL(path, self.location.href).href);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(URLS.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE)
      .then((cache) => cache.match(request))
      .then((hit) => hit || fetch(request))
  );
});
