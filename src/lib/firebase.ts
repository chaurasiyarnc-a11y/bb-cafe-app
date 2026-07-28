import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
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

// Next.js क्रैश से बचने और WebView/5G पर 100% लॉगिन चलाने के लिए
let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    experimentalForceLongPolling: true, // लॉन्ग पोलिंग को बल दें
    useFetchStreams: false,             // स्टीम कनेक्शन बंद करें (WebView के लिए बहुत जरूरी)
  });
} catch (e) {
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;
export const storage = getStorage(app);

export default app;
