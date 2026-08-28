import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { isFirebaseAdminConfigured, verifyFirebaseIdToken } from "./firebase";

const MAX_TOKEN_LENGTH = 12_000;

export function registerFirebaseAuthRoutes(app: Express) {
  app.post("/api/auth/firebase", async (req: Request, res: Response) => {
    if (!isFirebaseAdminConfigured()) {
      res.status(503).json({ error: "Firebase Authentication is not configured." });
      return;
    }

    const idToken = typeof req.body?.idToken === "string" ? req.body.idToken.trim() : "";
    if (!idToken || idToken.length > MAX_TOKEN_LENGTH) {
      res.status(400).json({ error: "A valid Firebase ID token is required." });
      return;
    }

    try {
      const decoded = await verifyFirebaseIdToken(idToken);
      const provider = decoded.firebase?.sign_in_provider;
      if (provider !== "google.com") {
        res.status(403).json({ error: "Only Google Firebase sign-in is enabled." });
        return;
      }
      if (decoded.email_verified !== true) {
        res.status(403).json({ error: "A verified Google email is required." });
        return;
      }

      const openId = `firebase:${decoded.uid}`;
      await db.upsertUser({
        openId,
        name: decoded.name ?? decoded.email ?? "Firebase user",
        email: decoded.email ?? null,
        loginMethod: "google-firebase",
        lastSignedIn: new Date(),
      });
      const sessionToken = await sdk.createSessionToken(openId, {
        name: decoded.name ?? decoded.email ?? "Firebase user",
        expiresInMs: ONE_YEAR_MS,
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ success: true });
    } catch (error) {
      console.error("[Firebase Auth] Token exchange failed", error);
      res.status(401).json({ error: "Firebase authentication failed." });
    }
  });
}
