/**
 * Firebase Configuration
 * 
 * Replace the firebaseConfig values with your own Firebase project credentials.
 * You can find these in your Firebase Console → Project Settings → General → Your apps.
 */
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyAqehHE67OurXCPI_6VErSkbVS2vQV-Xb4",
  authDomain: "e-review-e80a6.firebaseapp.com",
  projectId: "e-review-e80a6",
  storageBucket: "e-review-e80a6.firebasestorage.app",
  messagingSenderId: "414298555725",
  appId: "1:414298555725:web:397b9933d6b12f4fb5e304",
  measurementId: "G-9X5K1476YV",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;
