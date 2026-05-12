const CACHE_NAME = 'water-system-pwa-cache-v1';

const urlsToCache = [
  '/',
  '/manifest.webmanifest',
  '/icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // ข้ามคำขอที่ไม่ใช่ GET หรือเป็นคำขอ API เพื่อไม่ให้ Service Worker บล็อกหรือขัดขวางการส่งข้อมูล (POST/PUT/DELETE)
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('/') || new Response('Offline', { status: 503 });
          }
          return new Response('', { status: 408 });
        });
      })
  );
});
