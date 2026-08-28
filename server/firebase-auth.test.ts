import express from "express";
import { describe, expect, it } from "vitest";
import { registerFirebaseAuthRoutes } from "./firebase-auth";

async function request(app: express.Express, path: string, body: unknown) {
  const server = app.listen(0);
  await new Promise<void>(resolve => server.once("listening", () => resolve()));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  try {
    return await fetch(`http://127.0.0.1:${port}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } finally {
    server.close();
  }
}

describe("Firebase Google auth route", () => {
  it("returns a controlled unavailable response without Admin configuration", async () => {
    const app = express();
    app.use(express.json());
    registerFirebaseAuthRoutes(app);
    const response = await request(app, "/api/auth/firebase", { idToken: "test-token" });
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "Firebase Authentication is not configured." });
  });
});
