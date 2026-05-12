const CACHE_NAME = 'water-system-pwa-cache-v1';

// วางไฟล์พื้นฐานที่ต้องการแคชไว้เพื่อให้โหลดเร็วขึ้นเมื่อออฟไลน์
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
  // ข้ามคำขอที่ไปเรียก API หรือไม่ใช่ HTTP(S)
  if (!event.request.url.startsWith('http') || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // พบในแคช ส่งแคชกลับไป
        if (response) {
          return response;
        }
        // ไม่พบในแคช ดึงข้อมูลจากเครือข่าย
        return fetch(event.request).catch(() => {
          // หากเครือข่ายล่มและเป็นคำขอหน้าเว็บ ให้พยายามคืนค่าหน้าแรกจากแคช
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});
