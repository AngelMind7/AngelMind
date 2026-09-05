import type { Express, Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { canAccessWorkspace } from "./control-plane/operations";
import { buildCollectionPlan, ingestIntelligence, listIndicators, listIntelligence, listIntelligenceSources, listThreatActors, mapThreatActor, registerIntelligenceSource, upsertIndicator } from "./threat-intelligence";

async function uid(req: Request) { const user = await sdk.authenticateRequest(req); if (!user) throw new Error("Authentication required"); return Number(user.id); }
function fail(res: Response, e: unknown) { res.status(400).json({ error: e instanceof Error ? e.message : "request rejected" }); }
function wid(req: Request) { return Number(req.params.workspaceId ?? req.body?.workspaceId ?? req.query?.workspaceId); }
async function requireWorkspace(req: Request, mode: "read" | "manage") { const id = await uid(req); const workspaceId = wid(req); if (!Number.isInteger(workspaceId) || workspaceId < 1) throw new Error("workspaceId must be positive"); if (!(await canAccessWorkspace(id, workspaceId, mode))) throw new Error("Forbidden"); return workspaceId; }

export function registerThreatIntelligenceRestV1Routes(app: Express) {
  app.get("/api/v1/workspaces/:workspaceId/threat-intel", async (req, res) => { try { const workspaceId = await requireWorkspace(req, "read"); res.json({ intelligence: listIntelligence(workspaceId) }); } catch (e) { fail(res, e); } });
  app.post("/api/v1/workspaces/:workspaceId/threat-intel", async (req, res) => { try { const workspaceId = await requireWorkspace(req, "manage"); res.status(201).json(ingestIntelligence({ ...req.body, workspaceId })); } catch (e) { fail(res, e); } });
  app.get("/api/v1/threat-intel/sources", async (req, res) => { try { await uid(req); res.json({ sources: listIntelligenceSources() }); } catch (e) { fail(res, e); } });
  app.post("/api/v1/threat-intel/sources", async (req, res) => { try { await uid(req); res.status(201).json(registerIntelligenceSource(req.body)); } catch (e) { fail(res, e); } });
  app.get("/api/v1/threat-intel/indicators", async (req, res) => { try { await uid(req); res.json({ indicators: listIndicators(typeof req.query.type === "string" ? req.query.type as never : undefined) }); } catch (e) { fail(res, e); } });
  app.post("/api/v1/threat-intel/indicators", async (req, res) => { try { await uid(req); res.status(201).json(upsertIndicator(req.body)); } catch (e) { fail(res, e); } });
  app.get("/api/v1/threat-intel/actors", async (req, res) => { try { await uid(req); res.json({ actors: listThreatActors() }); } catch (e) { fail(res, e); } });
  app.post("/api/v1/threat-intel/actors", async (req, res) => { try { await uid(req); res.status(201).json(mapThreatActor(req.body)); } catch (e) { fail(res, e); } });
  app.post("/api/v1/workspaces/:workspaceId/threat-intel/collection-plan", async (req, res) => { try { const workspaceId = await requireWorkspace(req, "read"); res.json(buildCollectionPlan(String(req.body?.sourceId ?? ""), workspaceId)); } catch (e) { fail(res, e); } });
}
