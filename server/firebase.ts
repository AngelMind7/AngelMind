import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getStorage, type Storage } from "firebase-admin/storage";

function readConfig() {
  return {
    projectId: process.env.FIREBASE_PROJECT_ID?.trim(),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL?.trim(),
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET?.trim(),
  };
}

export function isFirebaseAdminConfigured() {
  const config = readConfig();
  return Boolean(config.projectId && config.clientEmail && config.privateKey && config.storageBucket);
}

export function getFirebaseAdmin(): { app: App; auth: Auth; storage: Storage } | null {
  if (!isFirebaseAdminConfigured()) return null;
  const config = readConfig();
  const app = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert({ projectId: config.projectId, clientEmail: config.clientEmail, privateKey: config.privateKey }),
        storageBucket: config.storageBucket,
      });
  return { app, auth: getAuth(app), storage: getStorage(app) };
}

export async function verifyFirebaseIdToken(idToken: string) {
  const firebase = getFirebaseAdmin();
  if (!firebase) throw new Error("Firebase Admin is not configured.");
  return firebase.auth.verifyIdToken(idToken, true);
}
