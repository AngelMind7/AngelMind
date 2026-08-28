import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export function isFirebaseClientConfigured() {
  return Object.values(config).every(value => typeof value === "string" && value.trim().length > 0);
}

export function getFirebaseClient(): { app: FirebaseApp; auth: Auth; storage: FirebaseStorage } | null {
  if (!isFirebaseClientConfigured()) return null;
  const app = getApps().length ? getApp() : initializeApp(config);
  return { app, auth: getAuth(app), storage: getStorage(app) };
}

export { config as firebaseClientConfig };
