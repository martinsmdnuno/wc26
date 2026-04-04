import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "REDACTED_API_KEY",
  authDomain: "REDACTED_AUTH_DOMAIN",
  projectId: "wc26-15842",
  storageBucket: "REDACTED_STORAGE_BUCKET",
  messagingSenderId: "REDACTED_SENDER_ID",
  appId: "1:REDACTED_SENDER_ID:web:9bda5e878f5cff81cf26aa",
  measurementId: "REDACTED_MEASUREMENT_ID",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
