importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// आपकी फ़ायरबेस सेटिंग्स यहाँ पहले से सेट हैं
firebase.initializeApp({
  apiKey: "AIzaSyCaVEWwnh7_-uDWcvO1Fmfymy7kiSxbyMI",
  authDomain: "gen-lang-client-0229168883.firebaseapp.com",
  projectId: "gen-lang-client-0229168883",
  storageBucket: "gen-lang-client-0229168883.firebasestorage.app",
  messagingSenderId: "1051643029309",
  appId: "1:1051643029309:web:3f5a9f9b7f981eaf814754",
  measurementId: "G-LSFXBMDTR3"
});

const messaging = firebase.messaging();

// जब ऐप बैकग्राउंड में हो तब नोटिफिकेशन हैंडलर
messaging.onBackgroundMessage((payload) => {
  console.log('[BG sw.js] Message received: ', payload);
  
  const notificationTitle = payload.notification.title || 'नया आर्डर तैयार है! 🛵';
  const notificationOptions = {
    body: payload.notification.body || 'कृपया आर्डर विवरण की जांच करें और वितरण के लिए निकलें।',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [200, 100, 200, 100, 200, 100, 200], // जेब में फोन वाइब्रेट करने के लिए
    data: {
      url: payload.data?.url || '/delivery' // क्लिक करने पर खुलने वाला पेज
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// नोटिफिकेशन क्लिक हैंडलर
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
