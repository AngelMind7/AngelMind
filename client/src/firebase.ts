import { initializeAppCheck, ReCaptchaEnterpriseProvider, type AppCheck } from "firebase/app-check";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";

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

async function exchangeFirebaseUser(user: User) {
  const idToken = await user.getIdToken(true);
  const response = await fetch("/api/auth/firebase", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error || "Firebase Google Login failed.");
  }
  return user;
}

function shouldUseRedirectSignIn() {
  return typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function canFallbackToRedirect(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  const code = String((error as { code?: unknown }).code);
  return code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment";
}

export async function completeGoogleRedirectSignIn() {
  const client = getFirebaseClient();
  if (!client) return false;
  const result = await getRedirectResult(client.auth);
  if (!result?.user) return false;
  await exchangeFirebaseUser(result.user);
  return true;
}

export async function signInWithGoogle(): Promise<User | null> {
  const client = getFirebaseClient();
  if (!client) throw new Error("Firebase Google Login is not configured.");
  const provider = new GoogleAuthProvider();

  // Firebase recommends redirect sign-in on mobile browsers because popups are
  // frequently blocked or provide a poor experience on small screens.
  if (shouldUseRedirectSignIn()) {
    await signInWithRedirect(client.auth, provider);
    return null;
  }

  try {
    const result = await signInWithPopup(client.auth, provider);
    return exchangeFirebaseUser(result.user);
  } catch (error) {
    if (!canFallbackToRedirect(error)) throw error;
    await signInWithRedirect(client.auth, provider);
    return null;
  }
}

export async function signOutFirebase() {
  const client = getFirebaseClient();
  if (client) await signOut(client.auth);
}

export { config as firebaseClientConfig, appCheckSiteKey };
