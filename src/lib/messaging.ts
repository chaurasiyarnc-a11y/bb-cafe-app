import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * 1. डिलीवरी बॉय के लिए
 */
export const requestNotificationPermission = async (deliveryBoyId: string, vapidKey: string) => {
  try {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) {
      alert("यह ब्राउज़र नोटिफिकेशन सपोर्ट नहीं करता है।");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const { getMessaging, getToken } = await import('firebase/messaging');
      const { default: app } = await import('./firebase');
      
      const messaging = getMessaging(app);
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      const currentToken = await getToken(messaging, { 
        vapidKey,
        serviceWorkerRegistration: registration
      });

      if (currentToken) {
        await updateDoc(doc(db, "staff_members", deliveryBoyId), {
          fcmToken: currentToken
        });
        return currentToken;
      }
    }
  } catch (error: any) {
    console.error('Delivery notification setup failed:', error);
  }
};

/**
 * 2. किचन (KDS) के लिए (अलर्ट मैसेज के साथ)
 */
export const requestKitchenPermission = async (vapidKey: string) => {
  try {
    if (typeof window === 'undefined') return;
    
    if (!('Notification' in window)) {
      alert("❌ आपके ब्राउज़र में नोटिफिकेशन सपोर्ट नहीं है!");
      return;
    }

    // 1. परमिशन की स्थिति जांचें
    const permission = await Notification.requestPermission();
    alert("📢 नोटिफिकेशन परमिशन की स्थिति: " + permission);

    if (permission === 'granted') {
      const { getMessaging, getToken } = await import('firebase/messaging');
      const { default: app } = await import('./firebase');
      
      const messaging = getMessaging(app);
      
      // 2. सर्विस वर्कर रजिस्ट्रेशन जांचें
      alert("⚙️ सर्विस वर्कर रजिस्टर कर रहे हैं...");
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      alert("✅ सर्विस वर्कर सफलतापूर्वक रजिस्टर हो गया!");

      // 3. टोकन जनरेट करें
      alert("🔑 फ़ायरबेस से टोकन जनरेट कर रहे हैं...");
      const currentToken = await getToken(messaging, { 
        vapidKey,
        serviceWorkerRegistration: registration
      });

      if (currentToken) {
        alert("💾 टोकन मिल गया है! डेटाबेस में सेव कर रहे हैं...");
        
        await setDoc(doc(db, "settings", "kds_token"), {
          fcmToken: currentToken
        }, { merge: true });
        
        alert("🎉 बधाई हो! टोकन Firestore में 'settings/kds_token' में सेव हो गया है!");
        return currentToken;
      } else {
        alert("❌ एरर: खाली टोकन मिला!");
      }
    } else {
      alert("❌ अनुमति नहीं मिली! कृपया क्रोम सेटिंग में जाकर नोटिफिकेशन Allow करें।");
    }
  } catch (error: any) {
    // स्क्रीन पर आने वाली वास्तविक एरर दिखाएं
    alert("🚨 फ़ायरबेस एरर संदेश: " + error.message);
    console.error('Kitchen notification permission failed:', error);
  }
};
