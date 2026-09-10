import type { Express, Request, Response } from "express";
import * as evidenceWorkflow from "./evidence-workflow";
import { sdk } from "./_core/sdk";
import { authenticateApiKeyWithScopes } from "./security-platform";
import { canAccessWorkspace } from "./control-plane/operations";

function id(value: string, field: string) {
  if (!/^[1-9]\d*$/.test(value)) throw new Error(`${field} harus berupa bilangan bulat positif.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error(`${field} di luar batas aman.`);
  return parsed;
}
async function user(req: Request, scope: string) {
  const bearer = req.header("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (bearer?.startsWith("am_")) {
    const result = await authenticateApiKeyWithScopes(bearer);
    if (!result || (!result.scopes.includes(scope) && !result.scopes.includes("*"))) throw new Error("Authentication required.");
    return result.user;
  }
  const value = await sdk.authenticateRequest(req);
  if (!value) throw new Error("Authentication required.");
  return value;
}
async function workspace(req: Request, scope: string) {
  const u = await user(req, scope);
  const workspaceId = id(req.params.workspaceId, "workspaceId");
  if (!(await canAccessWorkspace(u.id, workspaceId, scope.endsWith(":write") ? "manage" : "read"))) throw new Error("Workspace tidak ditemukan atau tidak dapat diakses.");
  return { u, workspaceId };
}
function ok(res: Response, data: unknown, status = 200) { res.status(status).json({ data, request_id: res.locals.requestId, apiVersion: "v1" }); }
function fail(res: Response, error: unknown) { const message = error instanceof Error ? error.message : "Request failed."; const status = message.includes("Authentication required") ? 401 : message.includes("tidak ditemukan") || message.includes("not found") ? 404 : message.includes("tidak dapat") || message.includes("permission") ? 403 : 400; res.status(status).json({ error: true, code: status === 401 ? "UNAUTHENTICATED" : status === 403 ? "FORBIDDEN" : status === 404 ? "NOT_FOUND" : "BAD_REQUEST", message, details: {}, request_id: res.locals.requestId, apiVersion: "v1" }); }

export function registerRestV1EvidenceFindingRoutes(app: Express) {
  app.get("/api/v1/workspaces/:workspaceId/evidence", async (req, res) => { try { const { u, workspaceId } = await workspace(req, "evidence:read"); ok(res, await evidenceWorkflow.listEvidenceWithProvenance(u.id, workspaceId)); } catch (e) { fail(res, e); } });
  app.post("/api/v1/evidence/:evidenceId/provenance", async (req, res) => { try { const u = await user(req, "evidence:write"); const body = req.body ?? {}; ok(res, await evidenceWorkflow.recordEvidenceProvenance(u.id, { evidenceArtifactId: id(req.params.evidenceId, "evidenceId"), sourceType: String(body.sourceType ?? ""), sourceReference: String(body.sourceReference ?? ""), capturedAt: body.capturedAt ? new Date(String(body.capturedAt)) : new Date(), metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : undefined })); } catch (e) { fail(res, e); } });
  app.post("/api/v1/evidence/:evidenceId/research-links", async (req, res) => { try { const u = await user(req, "evidence:write"); const body = req.body ?? {}; ok(res, await evidenceWorkflow.linkEvidenceToResearchNode(u.id, { evidenceArtifactId: id(req.params.evidenceId, "evidenceId"), observationId: body.observationId === undefined ? undefined : id(String(body.observationId), "observationId"), hypothesisId: body.hypothesisId === undefined ? undefined : id(String(body.hypothesisId), "hypothesisId"), linkType: String(body.linkType ?? "") }), 201); } catch (e) { fail(res, e); } });
  app.get("/api/v1/findings/:findingId/relations", async (req, res) => { try { const u = await user(req, "findings:read"); ok(res, await evidenceWorkflow.listFindingRelations(u.id, id(req.params.findingId, "findingId"))); } catch (e) { fail(res, e); } });
  app.post("/api/v1/findings/:findingId/relations", async (req, res) => { try { const u = await user(req, "findings:write"); const body = req.body ?? {}; const relationType = body.relationType; if (!["duplicate", "related", "supersedes"].includes(relationType)) throw new Error("Invalid finding relation type."); ok(res, await evidenceWorkflow.linkFindingRelation(u.id, { findingId: id(req.params.findingId, "findingId"), relatedFindingId: id(String(body.relatedFindingId ?? ""), "relatedFindingId"), relationType }), 201); } catch (e) { fail(res, e); } });
  app.get("/api/v1/findings/:findingId/duplicates", async (req, res) => { try { const u = await user(req, "findings:read"); ok(res, await evidenceWorkflow.findDuplicateCandidates(u.id, { findingId: id(req.params.findingId, "findingId"), query: String(req.query.q ?? "") })); } catch (e) { fail(res, e); } });
  app.get("/api/v1/findings/:findingId/retests", async (req, res) => { try { const u = await user(req, "findings:read"); ok(res, await evidenceWorkflow.listFindingRetests(u.id, id(req.params.findingId, "findingId"))); } catch (e) { fail(res, e); } });
  app.post("/api/v1/findings/:findingId/retests", async (req, res) => { try { const u = await user(req, "findings:write"); const body = req.body ?? {}; ok(res, await evidenceWorkflow.requestFindingRetest(u.id, { findingId: id(req.params.findingId, "findingId"), expectedRevision: Number(body.expectedRevision) }), 201); } catch (e) { fail(res, e); } });
  app.post("/api/v1/retests/:retestId/complete", async (req, res) => { try { const u = await user(req, "findings:write"); const body = req.body ?? {}; const status = body.status; if (!["in_progress", "passed", "failed", "inconclusive", "cancelled"].includes(status)) throw new Error("Invalid retest status."); ok(res, await evidenceWorkflow.completeFindingRetest(u.id, { retestId: id(req.params.retestId, "retestId"), status, resultSummary: String(body.resultSummary ?? ""), evidenceArtifactId: body.evidenceArtifactId === undefined ? undefined : id(String(body.evidenceArtifactId), "evidenceArtifactId") })); } catch (e) { fail(res, e); } });
}
