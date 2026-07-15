import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * 1. डिलीवरी बॉय के लिए
 */
export const requestNotificationPermission = async (deliveryBoyId: string, vapidKey: string) => {
  try {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const { getMessaging, getToken } = await import('firebase/messaging');
      const { default: app } = await import('./firebase');
      
      const messaging = getMessaging(app);
      
      // ✅ रोबस्ट PWA सुधार: सर्विस वर्कर को सीधे रजिस्टर करके getToken को पास करें
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
  } catch (error) {
    console.error('Delivery notification setup failed:', error);
  }
};

/**
 * 2. किचन (KDS) के लिए
 */
export const requestKitchenPermission = async (vapidKey: string) => {
  try {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const { getMessaging, getToken } = await import('firebase/messaging');
      const { default: app } = await import('./firebase');
      
      const messaging = getMessaging(app);
      
      // ✅ रोबस्ट PWA सुधार: सर्विस वर्कर को सीधे रजिस्टर करके getToken को पास करें
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      const currentToken = await getToken(messaging, { 
        vapidKey,
        serviceWorkerRegistration: registration
      });

      if (currentToken) {
        console.log('Kitchen FCM Token Generated:', currentToken);
        
        await setDoc(doc(db, "settings", "kds_token"), {
          fcmToken: currentToken
        }, { merge: true });
        
        return currentToken;
      }
    }
  } catch (error) {
    console.error('Kitchen notification permission failed:', error);
  }
};
