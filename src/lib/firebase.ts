import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  initializeFirestore, 
  getFirestore,
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBROy-Nj2Aaq2nzaVZnTfovFkWHA3HpMOE", 
  authDomain: "gen-lang-client-0229168883.firebaseapp.com",
  projectId: "gen-lang-client-0229168883",
  storageBucket: "gen-lang-client-0229168883.firebasestorage.app",
  messagingSenderId: "1051643029309",
  appId: "1:1051643029309:web:3f5a9f9b7f981eaf814754"
};

// 1. App Initialize
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

// 2. Firestore with Multi-Tab Offline Persistence
let firestoreDb;

if (typeof window !== "undefined") {
  try {
    firestoreDb = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager() // 👈 यह .exe, Web और Mobile तीनों पर बिना क्रैश हुए ऑफलाइन चलाएगा
      }),
      experimentalForceLongPolling: true,
    });
  } catch (err) {
    // अगर पहले से इनिशियलाइज़ है तो पुराना इंस्टेंस उठा लो
    firestoreDb = getFirestore(app);
  }
} else {
  // Server-side / Build Time
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;
export const storage = getStorage(app);

export default app;
