import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { aiRuns } from "../drizzle/schema";
import { getDb } from "./db";
import { getAiRunOutput, listAiRuns } from "./ai-platform";
import { searchWorkspace } from "./global-search";
import { sdk } from "./_core/sdk";

async function requireUser(req: Request) {
  const user = await sdk.authenticateRequest(req);
  if (!user) throw new Error("Authentication required.");
  return user;
}

function sendError(res: Response, error: unknown) {
  const message = error instanceof Error ? error.message : "Request failed.";
  const status = message.includes("Authentication required") ? 401 : message.includes("tidak dapat diakses") ? 403 : 400;
  res.status(status).json({ error: { code: status === 401 ? "UNAUTHENTICATED" : status === 403 ? "FORBIDDEN" : "BAD_REQUEST", message }, apiVersion: "v1" });
}

export function registerRestV1Routes(app: Express) {
  app.get("/api/v1/health", (_req, res) => res.json({ ok: true, apiVersion: "v1" }));
  app.get("/api/v1/workspaces/:workspaceId/search", async (req, res) => {
    try {
      const user = await requireUser(req);
      const workspaceId = Number(req.params.workspaceId);
      const result = await searchWorkspace(user.id, { workspaceId, query: String(req.query.q ?? ""), limit: Number(req.query.limit ?? 20) });
      res.json({ data: result, apiVersion: "v1" });
    } catch (error) {
      sendError(res, error);
    }
  });
  app.get("/api/v1/workspaces/:workspaceId/ai-runs", async (req, res) => {
    try {
      const user = await requireUser(req);
      const workspaceId = Number(req.params.workspaceId);
      res.json({ data: await listAiRuns(user.id, workspaceId), apiVersion: "v1" });
    } catch (error) {
      sendError(res, error);
    }
  });
  app.get("/api/v1/ai-runs/:runId", async (req, res) => {
    try {
      const user = await requireUser(req);
      const runId = Number(req.params.runId);
      const db = await getDb();
      if (!db) return res.json({ data: null, apiVersion: "v1" });
      const [run] = await db.select().from(aiRuns).where(eq(aiRuns.id, runId)).limit(1);
      if (!run) return res.status(404).json({ error: { code: "NOT_FOUND", message: "AI run tidak ditemukan." }, apiVersion: "v1" });
      const output = await getAiRunOutput(user.id, runId);
      res.json({ data: { ...run, output }, apiVersion: "v1" });
    } catch (error) {
      sendError(res, error);
    }
  });
}
