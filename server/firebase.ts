import { cert, getApps, getApp, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

function readConfig() {
  return {
    projectId: process.env.FIREBASE_PROJECT_ID?.trim(),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL?.trim(),
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  };
}

export function isFirebaseAdminConfigured() {
  const config = readConfig();
  return Boolean(config.projectId && config.clientEmail && config.privateKey);
}

export function getFirebaseAdmin(): { app: App; auth: Auth } | null {
  if (!isFirebaseAdminConfigured()) return null;
  const config = readConfig();
  const app = getApps().length
    ? getApp()
    : initializeApp({
        credential: cert({
          projectId: config.projectId,
          clientEmail: config.clientEmail,
          privateKey: config.privateKey,
        }),
      });
  return { app, auth: getAuth(app) };
}

export async function verifyFirebaseIdToken(idToken: string) {
  const firebase = getFirebaseAdmin();
  if (!firebase) throw new Error("Firebase Admin is not configured.");
  return firebase.auth.verifyIdToken(idToken, true);
}
