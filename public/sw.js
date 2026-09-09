// Version ko v5 kar diya gaya hai taaki purana kharab cache turant clear ho jaye
const CACHE_NAME = 'bb-cafe-cache-v5';

const ASSETS_TO_CACHE = [
  '/',
  '/pos',
  '/manifest.json',
  '/delivery',
  '/kitchen',
  '/admin',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/facebook.png',
  '/instagram.png',
  '/snapchat.png',
  '/whatsapp.png',
  '/youtube.png',
  '/paytm.png',
  '/phonepe.png',
  '/googlepay.png',
  '/phonepe-qr.png',
  '/admin.mp3',
  '/delivery.mp3',
  '/kitchen.mp3'
];

// 1. Install Event (Safe Cache Loading)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Promise.allSettled use kiya hai taaki agar koi ek photo ya mp3 missing ho,
      // tab bhi installation FAIL na ho aur POS app chalta rahe
      await Promise.allSettled(
        ASSETS_TO_CACHE.map((url) =>
          fetch(url)
            .then((res) => {
              if (res.ok) return cache.put(url, res);
            })
            .catch(() => {})
        )
      );
    })
  );
  self.skipWaiting();
});

// 2. Activate Event (Purge old v1, v2, v3, v4 caches)
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
  self.clients.claim();
});

// 3. Fetch Event
self.addEventListener('fetch', (event) => {
  // Sirf GET requests handle karein
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Firebase, Google APIs ya external links ko cache na karein
  if (
    !event.request.url.startsWith(self.location.origin) ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('firestore') ||
    url.hostname.includes('googleapis.com')
  ) {
    return;
  }

  // 1. Static Assets (Images, Audio, Fonts) -> CACHE FIRST Strategy
  const isStaticAsset =
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.mp3') ||
    url.pathname.endsWith('.woff2');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 2. HTML Pages & POS Navigation -> NETWORK FIRST with Cache Fallback
  // (POS terminal ke liye zaroori hai taaki live order aur bill count hamesha naya mile)
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Agar internet band ho jaye, tab offline cache se load karein
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;
        
        // Agar page cache mein nahi mila, toh home/pos page dikhayein
        return caches.match('/pos') || caches.match('/');
      })
  );
});
