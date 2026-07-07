
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: AIzaSyCaVEwWnh7_-uDWcvOlFmfymy7kiSxbyMI, 
  authDomain: gen-lang-client-0229168883.firebaseapp.com,
  projectId: gen-lang-client-0229168883,
  storageBucket: gen-lang-client-0229168883.firebasestorage.app,
  messagingSenderId: 1051643029309,
  appId: 1:1051643029309:web:3f5a9f9b7f981eaf814754
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
