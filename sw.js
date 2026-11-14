const CACHE = 'tabs-v35';

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
  './js/theme.js',
  './js/components/icons.js',
  './js/dom.js',
  './js/events.js',
  './js/routes.js',
  './js/autosave.js',
  './js/math.js',
  './js/strings.js',
  './js/components/parts.js',
  './js/live/autoscroll.js',
  './js/live/wakelock.js',
  './js/db.js',
  './js/store.js',
  './js/setlists.js',
  './js/group.js',
  './js/backup.js',
  './js/share.js',
  './js/components/modal.js',
  './js/prefs.js',
  './js/components/toast.js',
  './js/sheet/chords.js',
  './js/sheet/parse.js',
  './js/sheet/infer.js',
  './js/sheet/render.js',
  './js/sheet/transpose.js',
  './js/views/list.js',
  './js/views/live.js',
  './js/views/edit.js',
  './js/views/setlist.js',
  './js/components/settings.js',
  './js/components/menu.js',
  './js/components/details.js',
  './js/components/rows.js',
  './js/edit/insert.js',
  './js/components/keybar.js',
  './js/audio/context.js',
  './js/audio/pitch.js',
  './js/audio/listen.js',
  './js/audio/click.js',
  './js/components/tuner.js',
  './js/components/metronome.js',
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
