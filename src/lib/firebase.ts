import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, enableIndexedDbPersistence } from "firebase/firestore"; // <-- enableIndexedDbPersistence इम्पोर्ट करें
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBROy-Nj2Aaq2nzaVZnTfovFkWHA3HpMOE", 
  authDomain: "gen-lang-client-0229168883.firebaseapp.com",
  projectId: "gen-lang-client-0229168883",
  storageBucket: "gen-lang-client-0229168883.firebasestorage.app",
  messagingSenderId: "1051643029309",
  appId: "1:1051643029309:web:3f5a9f9b7f981eaf814754"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Next.js क्रैश से बचने और ऑफलाइन-फर्स्ट लॉगिन चलाने के लिए
let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    experimentalForceLongPolling: true, // लॉन्ग पोलिंग को बल दें
  });

  // मोबाइल ब्राउज़र/वेबव्यू में स्थानीय स्टोरेज (Offline Cache) चालू करना
  if (typeof window !== "undefined") {
    enableIndexedDbPersistence(firestoreDb).catch((err) => {
      console.warn("Firestore cache initialization failed: ", err.code);
    });
  }
} catch (e) {
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;
export const storage = getStorage(app);

export default app;
