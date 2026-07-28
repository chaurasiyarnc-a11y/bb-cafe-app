import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore"; // <-- getFirestore भी इम्पोर्ट करें
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

// Next.js क्रैश से बचने के लिए सुरक्षित डेटाबेस इनिशियलाइजेशन
let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    experimentalForceLongPolling: true, // मोबाइल वेबव्यू के लिए लॉन्ग पोलिंग
  });
} catch (e) {
  // यदि पहले से इनिशियलाइज हो चुका है, तो डिफ़ॉल्ट गेट का उपयोग करें
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;
export const storage = getStorage(app);

export default app;
