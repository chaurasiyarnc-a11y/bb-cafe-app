const CACHE_NAME = 'bb-cafe-cache-v4'; // कैशे का नाम v4 किया गया है ताकि पुराना कैशे क्लियर हो सके

const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/delivery',
  '/delivery-manifest.json',
  '/kitchen',
  '/kitchen-manifest.json',
  '/admin',
  '/admin-manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  // आपके public फोल्डर की सभी महत्वपूर्ण इमेजेस और साउंड्स को जोड़ा गया है
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

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event
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

// Fetch Event (Hybrid Smooth Strategy)
self.addEventListener('fetch', (event) => {
  // बाहरी लिंक्स या API (जैसे Firebase/Firestore) को कैशे न करें
  if (!event.request.url.startsWith(self.location.origin)) return;
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 1. CACHE-FIRST strategy for Static Assets (Images, Audio, Web Fonts)
  const isStaticAsset = 
    url.pathname.endsWith('.png') || 
    url.pathname.endsWith('.jpg') || 
    url.pathname.endsWith('.jpeg') || 
    url.pathname.endsWith('.svg') || 
    url.pathname.endsWith('.mp3') || 
    url.pathname.endsWith('.woff2');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse; // कैशे से तुरंत लोड करें
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
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

  // 2. STALE-WHILE-REVALIDATE for HTML, JS and CSS Files
  // (यह कैशे से पेज तुरंत दिखाएगा और बैकग्राउंड में नया डेटा अपडेट करेगा)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // नेटवर्क न होने पर एरर को ब्लॉक करें
      });

      return cachedResponse || fetchPromise;
    })
  );
});
