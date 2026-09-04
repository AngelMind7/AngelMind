import type { Express, Request, Response } from "express";
import * as tagsNotes from "./tags-notes";
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
  const workspaceId = id(req.params.id, "id");
  if (!(await canAccessWorkspace(u.id, workspaceId, scope.endsWith(":write") ? "manage" : "read"))) throw new Error("Workspace tidak ditemukan atau tidak dapat diakses.");
  return { u, workspaceId };
}

function ok(res: Response, data: unknown, status = 200) {
  res.status(status).json({ data, request_id: res.locals.requestId });
}

function fail(res: Response, error: unknown) {
  const message = error instanceof Error ? error.message : "Request failed.";
  const status = message.includes("Authentication required") ? 401 : message.includes("tidak ditemukan") || message.includes("not found") ? 404 : message.includes("tidak dapat") || message.includes("permission") ? 403 : 400;
  res.status(status).json({ error: true, code: status === 401 ? "UNAUTHENTICATED" : status === 403 ? "FORBIDDEN" : status === 404 ? "NOT_FOUND" : "BAD_REQUEST", message, details: {}, request_id: res.locals.requestId });
}

export function registerRestV1TagsNotesRoutes(app: Express) {
  app.get("/api/v1/workspaces/:id/tag-assignments", async (req, res) => { try { const { u, workspaceId } = await workspace(req, "workspace:read"); const entityType = String(req.query.entityType ?? "").trim(); const entityId = id(String(req.query.entityId ?? ""), "entityId"); if (!entityType) throw new Error("entityType is required."); ok(res, await tagsNotes.listAssignments(u.id, { workspaceId, entityType, entityId })); } catch (e) { fail(res, e); } });
  app.post("/api/v1/workspaces/:id/tag-assignments", async (req, res) => { try { const { u, workspaceId } = await workspace(req, "workspace:write"); const body = req.body ?? {}; ok(res, await tagsNotes.assignTag(u.id, { workspaceId, tagId: id(String(body.tagId ?? ""), "tagId"), entityType: String(body.entityType ?? "").trim(), entityId: id(String(body.entityId ?? ""), "entityId") }), 201); } catch (e) { fail(res, e); } });
  app.delete("/api/v1/workspaces/:id/tag-assignments/:assignmentId", async (req, res) => { try { const { u } = await workspace(req, "workspace:write"); ok(res, await tagsNotes.unassignTag(u.id, id(req.params.assignmentId, "assignmentId"))); } catch (e) { fail(res, e); } });
  app.get("/api/v1/workspaces/:id/notes", async (req, res) => { try { const { u, workspaceId } = await workspace(req, "workspace:read"); const entityType = req.query.entityType === undefined ? undefined : String(req.query.entityType); const entityId = req.query.entityId === undefined ? undefined : id(String(req.query.entityId), "entityId"); ok(res, await tagsNotes.listNotes(u.id, { workspaceId, entityType, entityId })); } catch (e) { fail(res, e); } });
  app.post("/api/v1/workspaces/:id/notes", async (req, res) => { try { const { u, workspaceId } = await workspace(req, "workspace:write"); const body = req.body ?? {}; ok(res, await tagsNotes.createNote(u.id, { workspaceId, entityType: String(body.entityType ?? ""), entityId: body.entityId === undefined ? undefined : id(String(body.entityId), "entityId"), title: String(body.title ?? ""), body: String(body.body ?? ""), visibility: body.visibility === "private" ? "private" : "workspace" }), 201); } catch (e) { fail(res, e); } });
  app.patch("/api/v1/workspaces/:id/notes/:noteId", async (req, res) => { try { const { u } = await workspace(req, "workspace:write"); const body = req.body ?? {}; ok(res, await tagsNotes.updateNote(u.id, { noteId: id(req.params.noteId, "noteId"), title: String(body.title ?? ""), body: String(body.body ?? ""), visibility: body.visibility === "private" ? "private" : "workspace" })); } catch (e) { fail(res, e); } });
  app.delete("/api/v1/workspaces/:id/notes/:noteId", async (req, res) => { try { const { u } = await workspace(req, "workspace:write"); ok(res, await tagsNotes.deleteNote(u.id, id(req.params.noteId, "noteId"))); } catch (e) { fail(res, e); } });
  app.get("/api/v1/workspaces/:id/tags/:tagId/assignments", async (req, res) => { try { const { u, workspaceId } = await workspace(req, "workspace:read"); const entityType = String(req.query.entityType ?? "").trim(); const entityId = id(String(req.query.entityId ?? ""), "entityId"); if (!entityType) throw new Error("entityType is required."); const rows = await tagsNotes.listAssignments(u.id, { workspaceId, entityType, entityId }); ok(res, rows.filter(row => row.assignment.tagId === id(req.params.tagId, "tagId"))); } catch (e) { fail(res, e); } });
}
