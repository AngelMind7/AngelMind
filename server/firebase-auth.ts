import type { Express, Request, Response } from "express";
import * as db from "./db";
import { isFirebaseAdminConfigured, verifyFirebaseIdToken } from "./firebase";
import * as accountSecurity from "./account-security";

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
      if (provider !== "google.com" && provider !== "password") {
        res.status(403).json({ error: "This Firebase sign-in provider is not enabled." });
        return;
      }
      if (decoded.email_verified !== true) {
        res.status(403).json({ error: "A verified email is required." });
        return;
      }

      const openId = `firebase:${decoded.uid}`;
      await db.upsertUser({
        openId,
        name: decoded.name ?? decoded.email ?? "Firebase user",
        email: decoded.email ?? null,
        loginMethod: provider,
        lastSignedIn: new Date(),
      });
      const storedUser = await db.getUserByOpenId(openId);
      if (storedUser) await accountSecurity.recordAuthEvent(storedUser.id, "login", { provider });
      res.json({ success: true, provider: "firebase", uid: decoded.uid });
    } catch (error) {
      console.error("[Firebase Auth] Token exchange failed", error);
      res.status(401).json({ error: "Firebase authentication failed." });
    }
  });
}
