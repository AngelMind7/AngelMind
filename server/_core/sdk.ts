import type { Request } from "express";
import { ForbiddenError } from "@shared/_core/errors";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { isFirebaseAdminConfigured, verifyFirebaseIdToken } from "../firebase";
import { authenticateApiKey } from "../security-platform";

export type AuthenticatedUser = User;

type FirebaseRequestUser = {
  uid: string;
  name?: string;
  email?: string;
  emailVerified?: boolean;
  signInProvider?: string;
};

function readBearerToken(req: Request): string | null {
  const authorization = req.headers.authorization;
  if (typeof authorization !== "string") return null;
  const [scheme, token] = authorization.split(" ", 2);
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  const normalized = token.trim();
  return normalized.length > 0 && normalized.length <= 12_000 ? normalized : null;
}

function getFirebaseRequestUser(decoded: Awaited<ReturnType<typeof verifyFirebaseIdToken>>): FirebaseRequestUser {
  return {
    uid: decoded.uid,
    name: typeof decoded.name === "string" ? decoded.name : undefined,
    email: typeof decoded.email === "string" ? decoded.email : undefined,
    emailVerified: decoded.email_verified === true,
    signInProvider:
      typeof decoded.firebase?.sign_in_provider === "string"
        ? decoded.firebase.sign_in_provider
        : undefined,
  };
}

class FirebaseAuthServer {
  async authenticateRequest(req: Request): Promise<AuthenticatedUser> {
    const token = readBearerToken(req);
    if (!token) {
      const apiKeyHeader = req.headers["x-api-key"];
      const apiKey = typeof apiKeyHeader === "string" ? apiKeyHeader.trim() : null;
      if (apiKey) {
        const apiUser = await authenticateApiKey(apiKey);
        if (apiUser) return apiUser;
      }
      throw ForbiddenError("Firebase ID token or API key is required");
    }

    if (!isFirebaseAdminConfigured()) {
      throw ForbiddenError("Firebase Authentication is not configured");
    }

    let decoded: Awaited<ReturnType<typeof verifyFirebaseIdToken>>;
    try {
      decoded = await verifyFirebaseIdToken(token);
    } catch (error) {
      console.warn("[Auth] Firebase ID token verification failed", String(error));
      throw ForbiddenError("Invalid Firebase ID token");
    }

    const identity = getFirebaseRequestUser(decoded);
    if (identity.signInProvider !== "google.com" && identity.signInProvider !== "password") {
      throw ForbiddenError("This Firebase sign-in provider is not enabled");
    }
    if (identity.emailVerified !== true) {
      throw ForbiddenError("A verified Firebase email is required");
    }
    const openId = `firebase:${identity.uid}`;
    const signedInAt = new Date();

    await db.upsertUser({
      openId,
      name: identity.name ?? identity.email ?? "Firebase user",
      email: identity.email ?? null,
      loginMethod: identity.signInProvider ?? "firebase",
      lastSignedIn: signedInAt,
    });

    const user = await db.getUserByOpenId(openId);
    if (!user) throw ForbiddenError("Authenticated user could not be loaded");
    return user;
  }
}

export const sdk = new FirebaseAuthServer();
