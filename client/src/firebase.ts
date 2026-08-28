import { initializeAppCheck, ReCaptchaEnterpriseProvider, type AppCheck } from "firebase/app-check";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, type Auth } from "firebase/auth";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const requiredAuthConfig = [
  config.apiKey,
  config.authDomain,
  config.projectId,
  config.messagingSenderId,
  config.appId,
];
const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY?.trim();
let appCheck: AppCheck | null = null;

export function isFirebaseClientConfigured() {
  return requiredAuthConfig.every(value => typeof value === "string" && value.trim().length > 0);
}

export function isFirebaseAppCheckConfigured() {
  return Boolean(import.meta.env.PROD && isFirebaseClientConfigured() && appCheckSiteKey);
}

export function getFirebaseClient(): { app: FirebaseApp; auth: Auth } | null {
  if (!isFirebaseClientConfigured()) return null;
  const app = getApps().length ? getApp() : initializeApp(config);
  if (isFirebaseAppCheckConfigured() && !appCheck) {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey!),
      isTokenAutoRefreshEnabled: true,
    });
  }
  return { app, auth: getAuth(app) };
}

export async function getFirebaseIdToken(): Promise<string | null> {
  const client = getFirebaseClient();
  const user = client?.auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

export async function signInWithGoogle() {
  const client = getFirebaseClient();
  if (!client) throw new Error("Firebase Google Login is not configured.");
  const result = await signInWithPopup(client.auth, new GoogleAuthProvider());
  const idToken = await result.user.getIdToken(true);
  const response = await fetch("/api/auth/firebase", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error || "Firebase Google Login failed.");
  }
  return result.user;
}

export async function signOutFirebase() {
  const client = getFirebaseClient();
  if (client) await signOut(client.auth);
}

export { config as firebaseClientConfig, appCheckSiteKey };
