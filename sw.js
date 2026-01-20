const CACHE_NAME = 'attendance-app-v1';
const urlsToCache = [
  '/attendance-app/',
  '/attendance-app/index.html',
  '/attendance-app/login.html',
  '/attendance-app/register.html',
  '/attendance-app/style.css',
  '/attendance-app/app.js'
  // アイコンは後で追加（今は404なのでコメントアウト）
  // '/attendance-app/icon-192.png',
  // '/attendance-app/icon-512.png'
];

// インストール時：存在するファイルのみキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // 各ファイルを個別にキャッシュ（エラーを無視）
        return Promise.all(
          urlsToCache.map(url => {
            return cache.add(url).catch(err => {
              console.log('Failed to cache:', url);
            });
          })
        );
      })
  );
});

// アクティベート時：古いキャッシュを削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// フェッチ時：キャッシュ優先で返す
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});
