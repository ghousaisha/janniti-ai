import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCE7P6bHosXDtqaglsyxtoKxwk_YJqqmdY",
  authDomain: "janniti-ai-d2933.firebaseapp.com",
  projectId: "janniti-ai-d2933",
  storageBucket: "janniti-ai-d2933.firebasestorage.app",
  messagingSenderId: "575066462424",
  appId: "1:575066462424:web:67e9b5c44847d3714a1fad",
  measurementId: "G-KFPPRD1265"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

export const auth = getAuth(app);