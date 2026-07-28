import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore"; // <-- 'getFirestore' की जगह 'initializeFirestore' का उपयोग
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

// केवल डेटाबेस कनेक्शन को सुचारू बनाने के लिए Long Polling इनेबल की गई है
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true, // <-- मोबाइल/एंड्रॉइड ऐप पर हैंग होने से बचाने वाली सेटिंग
});

export const storage = getStorage(app);

export default app;
