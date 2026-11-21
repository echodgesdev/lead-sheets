const CACHE = 'tabs-v81';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './css/app.css',
  './css/sheet.css',
  './css/keybar.css',
  './js/app.js',
  './js/routes.js',
  './js/strings.js',
  './js/core/autosave.js',
  './js/core/autoscroll.js',
  './js/core/compress.js',
  './js/core/dom.js',
  './js/core/events.js',
  './js/core/icons.js',
  './js/core/math.js',
  './js/core/svg.js',
  './js/core/wakelock.js',
  './js/data/backup.js',
  './js/data/db.js',
  './js/data/group.js',
  './js/data/links.js',
  './js/data/prefs.js',
  './js/data/setlists.js',
  './js/data/store.js',
  './js/data/theme.js',
  './js/sheet/chords.js',
  './js/sheet/circle.js',
  './js/sheet/infer.js',
  './js/sheet/insert.js',
  './js/sheet/parse.js',
  './js/sheet/transpose.js',
  './js/audio/click.js',
  './js/audio/context.js',
  './js/audio/listen.js',
  './js/audio/pitch.js',
  './js/audio/tone.js',
  './js/components/circle.js',
  './js/components/controls.js',
  './js/components/details.js',
  './js/components/keybar.js',
  './js/components/tools.js',
  './js/components/menu.js',
  './js/components/metronome.js',
  './js/components/modal.js',
  './js/components/parts.js',
  './js/components/rows.js',
  './js/components/settings.js',
  './js/components/share.js',
  './js/components/sheet.js',
  './js/components/toast.js',
  './js/components/theory-views.js',
  './js/components/tuner.js',
  './js/views/edit.js',
  './js/views/list.js',
  './js/views/live.js',
  './js/views/setlist.js',
  './js/views/shared.js',
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
