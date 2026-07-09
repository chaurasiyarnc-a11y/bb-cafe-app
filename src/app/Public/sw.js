// public/sw.js
const CACHE_NAME = 'bb-cafe-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
];

// Install event (assets को लोकली स्टोर करना)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate event (पुराने कैश को डिलीट करना)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clientsClaim();
});

// Fetch event (Network request को हैंडल करना)
self.addEventListener('fetch', (event) => {
  // बाहरी APIs (जैसे Firebase db) को कैश करने से बचने के लिए साधारण फिल्टर
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
