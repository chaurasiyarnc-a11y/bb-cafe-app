import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// आपकी असली VAPID Key को हमने यहाँ पक्का कर दिया है
const MY_VAPID_KEY = "BCKwFGxjNPQdsUFLasSoQonNesm5nVYy9uoikufClZCsCFqhJNUWDP9j1Cqujd8VzqwRKn8I3R3exxo85RtPEn0";

/**
 * 1. डिलीवरी बॉय के लिए
 */
export const requestNotificationPermission = async (deliveryBoyId: string, vapidKey: string) => {
  try {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) {
      console.warn("यह ब्राउज़र नोटिफिकेशन सपोर्ट नहीं करता है।");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const { getMessaging, getToken } = await import('firebase/messaging');
      const { default: app } = await import('./firebase');
      
      const messaging = getMessaging(app);
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      
      const currentToken = await getToken(messaging, { 
        vapidKey: MY_VAPID_KEY,
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
 * 2. किचन (KDS) के लिए (अलर्ट मैसेजेस को हटाकर कंसोल लॉग्स में बदला गया)
 */
export const requestKitchenPermission = async (vapidKey: string) => {
  try {
    if (typeof window === 'undefined') return;
    
    if (!('Notification' in window)) {
      console.warn("❌ आपके ब्राउज़र में नोटिफिकेशन सपोर्ट नहीं है!");
      return;
    }

    const permission = await Notification.requestPermission();
    console.log("📢 नोटिफिकेशन परमिशन की स्थिति: " + permission);

    if (permission === 'granted') {
      const { getMessaging, getToken } = await import('firebase/messaging');
      const { default: app } = await import('./firebase');
      
      const messaging = getMessaging(app);
      
      console.log("⚙️ सर्विस वर्कर रजिस्टर कर रहे हैं...");
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log("✅ सर्विस वर्कर सफलतापूर्वक रजिस्टर हो गया!");

      console.log("🔑 फ़ायरबेस से टोकन जनरेट कर रहे हैं...");
      
      const currentToken = await getToken(messaging, { 
        vapidKey: MY_VAPID_KEY,
        serviceWorkerRegistration: registration
      });

      if (currentToken) {
        console.log("💾 टोकन मिल गया है! डेटाबेस में सेव कर रहे हैं...");
        
        await setDoc(doc(db, "settings", "kds_token"), {
          fcmToken: currentToken
        }, { merge: true });
        
        console.log("🎉 बधाई हो! टोकन Firestore में 'settings/kds_token' में सेव हो गया है!");
        return currentToken;
      } else {
        console.error("❌ एरर: खाली टोकन मिला!");
      }
    } else {
      console.warn("❌ अनुमति नहीं मिली! कृपया क्रोम सेटिंग में जाकर नोटिफिकेशन Allow करें।");
    }
  } catch (error: any) {
    console.error("🚨 फ़ायरबेस एरर संदेश: " + error.message);
  }
};
