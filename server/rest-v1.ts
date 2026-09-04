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
import { createResearchAsset, createResearchObservation, createResearchSession, listResearchAssets, promoteObservationToFinding } from "./research-workflow";
import { executeResearchTask } from "./research-execution-service";
import { executeGovernedCapability } from "./governed-execution-service";
import { getToolCatalogSummary, listToolCatalog, searchToolCatalog } from "./tool-catalog";
import { checkRegisteredAdapterHealth, listRegisteredAdapters } from "./tool-runtime";
import { getExecutionProgress } from "./execution-ledger";

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

  app.get("/api/v1/tools/catalog", async (req, res) => {
    try {
      await requireUser(req, "tools:read");
      const category = typeof req.query.category === "string" ? req.query.category : undefined;
      const riskClass = typeof req.query.riskClass === "string" ? req.query.riskClass : undefined;
      const disposition = typeof req.query.disposition === "string" ? req.query.disposition : undefined;
      res.json({ data: listToolCatalog({ category, riskClass, disposition } as Parameters<typeof listToolCatalog>[0]), request_id: requestId(res), apiVersion: REST_API_VERSION });
    } catch (error) { sendError(res, error); }
  });
  app.get("/api/v1/tools/summary", async (req, res) => {
    try { await requireUser(req, "tools:read"); res.json({ data: getToolCatalogSummary(), request_id: requestId(res), apiVersion: REST_API_VERSION }); }
    catch (error) { sendError(res, error); }
  });
  app.get("/api/v1/tools/search", async (req, res) => {
    try {
      await requireUser(req, "tools:read");
      const query = String(req.query.q ?? "").trim();
      if (!query) throw new Error("Tool search query is required.");
      res.json({ data: searchToolCatalog(query), request_id: requestId(res), apiVersion: REST_API_VERSION });
    } catch (error) { sendError(res, error); }
  });
  app.get("/api/v1/tools/runtime", async (req, res) => {
    try { await requireUser(req, "tools:read"); res.json({ data: { adapters: listRegisteredAdapters(), health: checkRegisteredAdapterHealth() }, request_id: requestId(res), apiVersion: REST_API_VERSION }); }
    catch (error) { sendError(res, error); }
  });
  app.post("/api/v1/workspaces/:workspaceId/tools/execute", async (req, res) => {
    try {
      const auth = await requireUser(req, "tools:execute");
      const workspaceId = parsePositiveInteger(req.params.workspaceId, "workspaceId");
      requireBoundWorkspace(auth, workspaceId);
      const body = req.body ?? {};
      const capability = typeof body.capability === "string" ? body.capability.trim() : "";
      const mode = typeof body.mode === "string" ? body.mode : "";
      if (!capability) throw new Error("capability wajib diisi.");
      if (!["offline_artifact", "passive_readonly", "active_nondestructive", "privileged_or_destructive"].includes(mode)) throw new Error("mode execution tidak valid.");
      const result = await executeGovernedCapability({
        userId: auth.user.id,
        workspaceId,
        capability,
        target: typeof body.target === "string" ? body.target.trim() : undefined,
        mode: mode as "offline_artifact" | "passive_readonly" | "active_nondestructive" | "privileged_or_destructive",
        approvalId: body.approvalId === undefined ? undefined : parsePositiveInteger(String(body.approvalId), "approvalId"),
        input: typeof body.input === "string" ? body.input : JSON.stringify(body.input ?? {}),
        sessionId: body.sessionId === undefined ? undefined : parsePositiveInteger(String(body.sessionId), "sessionId"),
        assetId: body.assetId === undefined ? undefined : parsePositiveInteger(String(body.assetId), "assetId"),
      });
      res.status(result.status === "completed" ? 200 : 202).json({ data: result, request_id: requestId(res), apiVersion: REST_API_VERSION });
    } catch (error) { sendError(res, error); }
  });
  app.get("/api/v1/executions/:jobId", async (req, res) => {
    try {
      const auth = await requireUser(req, "tools:read");
      const jobId = parsePositiveInteger(req.params.jobId, "jobId");
      const progress = await getExecutionProgress(auth.user.id, jobId);
      requireBoundWorkspace(auth, progress.workspaceId);
      res.json({ data: progress, request_id: requestId(res), apiVersion: REST_API_VERSION });
    } catch (error) { sendError(res, error); }
  });
  app.post("/api/v1/research-tasks/:taskId/execute", async (req, res) => {
    try {
      const auth = await requireUser(req, "research:execute");
      const taskId = parsePositiveInteger(req.params.taskId, "taskId");
      const result = await executeResearchTask(auth.user.id, taskId);
      res.status(result.status === "completed" ? 200 : 202).json({ data: result, request_id: requestId(res), apiVersion: REST_API_VERSION });
    } catch (error) { sendError(res, error); }
  });

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
  app.post("/api/v1/workspaces/:workspaceId/research-sessions", async (req, res) => {
    try {
      const auth = await requireUser(req, "research:write");
      const workspaceId = parsePositiveInteger(req.params.workspaceId, "workspaceId");
      requireBoundWorkspace(auth, workspaceId);
      const session = await createResearchSession(auth.user.id, { workspaceId, title: typeof req.body?.title === "string" ? req.body.title : "" });
      res.status(201).json({ data: session, request_id: requestId(res), apiVersion: REST_API_VERSION });
    } catch (error) { sendError(res, error); }
  });
  app.get("/api/v1/research-sessions/:sessionId/assets", async (req, res) => {
    try {
      const auth = await requireUser(req, "research:read");
      const assets = await listResearchAssets(auth.user.id, parsePositiveInteger(req.params.sessionId, "sessionId"));
      res.json({ data: assets, request_id: requestId(res), apiVersion: REST_API_VERSION });
    } catch (error) { sendError(res, error); }
  });
  app.post("/api/v1/research-sessions/:sessionId/assets", async (req, res) => {
    try {
      const auth = await requireUser(req, "research:write");
      const body = req.body ?? {};
      const asset = await createResearchAsset(auth.user.id, { sessionId: parsePositiveInteger(req.params.sessionId, "sessionId"), assetType: body.assetType, value: typeof body.value === "string" ? body.value : "", hostname: typeof body.hostname === "string" ? body.hostname : undefined, metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : undefined });
      res.status(201).json({ data: asset, request_id: requestId(res), apiVersion: REST_API_VERSION });
    } catch (error) { sendError(res, error); }
  });
  app.post("/api/v1/research-sessions/:sessionId/observations", async (req, res) => {
    try {
      const auth = await requireUser(req, "research:write");
      const body = req.body ?? {};
      const observation = await createResearchObservation(auth.user.id, { sessionId: parsePositiveInteger(req.params.sessionId, "sessionId"), assetId: body.assetId === undefined ? undefined : parsePositiveInteger(String(body.assetId), "assetId"), title: typeof body.title === "string" ? body.title : "", content: typeof body.content === "string" ? body.content : "", sourceType: typeof body.sourceType === "string" ? body.sourceType : undefined, sourceReference: typeof body.sourceReference === "string" ? body.sourceReference : undefined, rawOutputSha256: typeof body.rawOutputSha256 === "string" ? body.rawOutputSha256 : undefined, normalizedEvidenceSha256: typeof body.normalizedEvidenceSha256 === "string" ? body.normalizedEvidenceSha256 : undefined });
      res.status(201).json({ data: observation, request_id: requestId(res), apiVersion: REST_API_VERSION });
    } catch (error) { sendError(res, error); }
  });
  app.post("/api/v1/research-sessions/:sessionId/findings", async (req, res) => {
    try {
      const auth = await requireUser(req, "research:write");
      const body = req.body ?? {};
      const finding = await promoteObservationToFinding(auth.user.id, { sessionId: parsePositiveInteger(req.params.sessionId, "sessionId"), observationId: parsePositiveInteger(String(body.observationId ?? ""), "observationId"), confidence: body.confidence === undefined ? undefined : Number(body.confidence), impactSummary: typeof body.impactSummary === "string" ? body.impactSummary : "" });
      res.status(201).json({ data: finding, request_id: requestId(res), apiVersion: REST_API_VERSION });
    } catch (error) { sendError(res, error); }
  });
}
