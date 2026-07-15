importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCaVEWwnh7_-uDWcvO1Fmfymy7kiSxbyMI",
  authDomain: "gen-lang-client-0229168883.firebaseapp.com",
  projectId: "gen-lang-client-0229168883",
  storageBucket: "gen-lang-client-0229168883.firebasestorage.app",
  messagingSenderId: "1051643029309",
  appId: "1:1051643029309:web:3f5a9f9b7f981eaf814754"
});

var messaging = firebase.messaging();

// क्लासिक ES5 सिंटैक्स ताकि पुराना से पुराना मोबाइल टैबलेट भी इसे आसानी से पढ़ सके
messaging.onBackgroundMessage(function(payload) {
  console.log('[BG sw.js] Received message: ', payload);
  
  var title = payload.notification.title || 'नया आर्डर तैयार है! 🛵';
  var options = {
    body: payload.notification.body || 'कृपया आर्डर विवरण की जांच करें और वितरण के लिए निकलें।',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [200, 100, 200, 100, 200, 100, 200],
    data: {
      url: payload.data?.url || '/delivery'
    }
  };

  return self.registration.showNotification(title, options);
});
