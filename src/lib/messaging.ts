import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * 1. डिलीवरी बॉय के लिए (पुराना फंक्शन)
 */
export const requestNotificationPermission = async (deliveryBoyId: string, vapidKey: string) => {
  try {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const { getMessaging, getToken } = await import('firebase/messaging');
      const messaging = getMessaging();
      const currentToken = await getToken(messaging, { vapidKey });

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
 * 2. किचन (KDS) के लिए (नया फंक्शन)
 * यह किचन टर्मिनल के टोकन को "settings/kds_token" में सेव करेगा
 */
export const requestKitchenPermission = async (vapidKey: string) => {
  try {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const { getMessaging, getToken } = await import('firebase/messaging');
      const messaging = getMessaging();
      const currentToken = await getToken(messaging, { vapidKey });

      if (currentToken) {
        console.log('Kitchen FCM Token Generated:', currentToken);
        
        // इसे एक ग्लोबल सेटिंग्स डॉक्यूमेंट में सेव करें ताकि सभी नए आर्डर यहाँ सिग्नल भेज सकें
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
