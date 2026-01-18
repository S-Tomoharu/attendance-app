const CACHE_NAME = 'attendance-app-v1';
const urlsToCache = [
  '/attendance-app/',
  '/attendance-app/index.html',
  '/attendance-app/style.css',
  '/attendance-app/app.js',
  '/attendance-app/login.html',
  '/attendance-app/login.js',
  '/attendance-app/register.html',
  '/attendance-app/register.js'
];

// インストール時にキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// キャッシュから返す
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
