import { randomUUID } from "node:crypto";
import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { aiRuns } from "../drizzle/schema";
import { getDb } from "./db";
import { getAiRunOutput, listAiRuns } from "./ai-platform";
import { searchWorkspace } from "./global-search";
import { sdk } from "./_core/sdk";
import { canAccessWorkspace } from "./control-plane/operations";
import { authenticateApiKeyWithScopes } from "./security-platform";

export const REST_API_VERSION = "v1" as const;
type RestAuth = { user: Awaited<ReturnType<typeof sdk.authenticateRequest>> extends infer User ? NonNullable<User> : never; workspaceId?: number | null };

export function parseBearerToken(header: string | undefined) {
  const match = /^Bearer\s+(.+)$/i.exec(header ?? "");
  return match?.[1]?.trim() || null;
}

async function requireUser(req: Request, requiredScope?: string): Promise<RestAuth> {
  const bearer = parseBearerToken(req.header("authorization"));
  if (bearer?.startsWith("am_")) {
    const result = await authenticateApiKeyWithScopes(bearer);
    if (!result) throw new Error("Authentication required.");
    if (requiredScope && !result.scopes.includes(requiredScope) && !result.scopes.includes("*")) throw new Error("API key scope is insufficient.");
    return { user: result.user, workspaceId: result.workspaceId };
  }
  const user = await sdk.authenticateRequest(req);
  if (!user) throw new Error("Authentication required.");
  return { user };
}

export function parsePositiveInteger(value: string, field: string) {
  if (!/^[1-9]\d*$/.test(value)) throw new Error(`${field} harus berupa bilangan bulat positif.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error(`${field} di luar batas aman.`);
  return parsed;
}

function optionalPositiveInteger(value: unknown, field: string, maximum?: number) {
  if (value === undefined || value === "") return undefined;
  const parsed = parsePositiveInteger(String(value), field);
  return maximum === undefined ? parsed : Math.min(maximum, parsed);
}

function parseEntityTypes(value: unknown) {
  const values = Array.isArray(value) ? value : value === undefined ? [] : [String(value)];
  return Array.from(new Set(values.flatMap(item => String(item).split(",")).map(item => item.trim()).filter(Boolean))).slice(0, 12);
}

function requireBoundWorkspace(auth: RestAuth, workspaceId: number) {
  if (auth.workspaceId !== undefined && auth.workspaceId !== null && auth.workspaceId !== workspaceId) throw new Error("Workspace tidak dapat diakses.");
}

function withVersion(res: Response) {
  res.setHeader("X-API-Version", REST_API_VERSION);
  res.setHeader("X-Content-Type-Options", "nosniff");
}

function requestId(res: Response) {
  return typeof res.locals.requestId === "string" ? res.locals.requestId : randomUUID();
}

function sendError(res: Response, error: unknown) {
  withVersion(res);
  const message = error instanceof Error ? error.message : "Request failed.";
  const status = message.includes("Authentication required") ? 401 : message.includes("tidak dapat diakses") ? 403 : message.includes("tidak ditemukan") ? 404 : message.includes("Database tidak tersedia") ? 503 : message.includes("Too many") ? 429 : 400;
  const code = status === 401 ? "UNAUTHENTICATED" : status === 403 ? "FORBIDDEN" : status === 404 ? "NOT_FOUND" : status === 503 ? "DEPENDENCY_UNAVAILABLE" : status === 429 ? "RATE_LIMITED" : "BAD_REQUEST";
  res.status(status).json({ error: true, code, message, details: {}, request_id: requestId(res), apiVersion: REST_API_VERSION });
}

export function registerRestV1Routes(app: Express) {
  app.use("/api/v1", (req, res, next) => { const supplied = req.header("x-request-id")?.trim() ?? ""; res.locals.requestId = /^[A-Za-z0-9._:-]{1,128}$/.test(supplied) ? supplied : randomUUID(); res.setHeader("X-Request-ID", res.locals.requestId); withVersion(res); next(); });
  app.get("/api/v1/health", (_req, res) => res.json({ data: { ok: true }, request_id: requestId(res), apiVersion: REST_API_VERSION }));
  app.get("/api/v1/workspaces/:workspaceId/search", async (req, res) => {
    try {
      const auth = await requireUser(req, "search:read");
      const workspaceId = parsePositiveInteger(req.params.workspaceId, "workspaceId");
      requireBoundWorkspace(auth, workspaceId);
      const limit = optionalPositiveInteger(req.query.limit, "limit", 100) ?? 20;
      const freshnessDays = optionalPositiveInteger(req.query.freshnessDays, "freshnessDays", 3_650);
      const cursor = req.query.cursor === undefined ? undefined : String(req.query.cursor).trim();
      if (cursor && cursor.length > 512) throw new Error("cursor terlalu panjang.");
      const result = await searchWorkspace(auth.user.id, { workspaceId, query: String(req.query.q ?? ""), limit, cursor: cursor || undefined, entityTypes: parseEntityTypes(req.query.entityTypes), freshnessDays });
      res.json({ data: result, request_id: requestId(res), apiVersion: REST_API_VERSION });
    } catch (error) { sendError(res, error); }
  });
  app.get("/api/v1/workspaces/:workspaceId/ai-runs", async (req, res) => {
    try {
      const auth = await requireUser(req, "ai-runs:read");
      const workspaceId = parsePositiveInteger(req.params.workspaceId, "workspaceId");
      requireBoundWorkspace(auth, workspaceId);
      res.json({ data: await listAiRuns(auth.user.id, workspaceId), request_id: requestId(res), apiVersion: REST_API_VERSION });
    } catch (error) { sendError(res, error); }
  });
  app.get("/api/v1/ai-runs/:runId", async (req, res) => {
    try {
      const auth = await requireUser(req, "ai-runs:read");
      const runId = parsePositiveInteger(req.params.runId, "runId");
      const db = await getDb();
      if (!db) throw new Error("Database tidak tersedia.");
      const [run] = await db.select().from(aiRuns).where(eq(aiRuns.id, runId)).limit(1);
      if (!run || (auth.workspaceId !== undefined && auth.workspaceId !== null && auth.workspaceId !== run.workspaceId) || !(await canAccessWorkspace(auth.user.id, run?.workspaceId ?? 0, "read"))) return res.status(404).json({ error: true, code: "NOT_FOUND", message: "AI run tidak ditemukan.", details: {}, request_id: requestId(res), apiVersion: REST_API_VERSION });
      const output = await getAiRunOutput(auth.user.id, runId);
      res.json({ data: { ...run, output }, request_id: requestId(res), apiVersion: REST_API_VERSION });
    } catch (error) { sendError(res, error); }
  });
}
