import type { Express, Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { canAccessWorkspace } from "./control-plane/operations";
import {
  approveRedTeamOperation, buildC2SimulationPolicy, createRedTeamOperation,
  getRedTeamOperation, listRedTeamOperations, requestRedTeamApproval,
  setRedTeamOperationStatus, simulateRedTeamCapability,
} from "./redteam-operations";

async function userId(req: Request) { const user = await sdk.authenticateRequest(req); if (!user) throw new Error("Authentication required"); return Number(user.id); }
function workspaceId(req: Request) { return Number(req.params.workspaceId); }
function jsonError(res: Response, error: unknown) { res.status(400).json({ error: error instanceof Error ? error.message : "request rejected" }); }

export function registerRedTeamRestV1Routes(app: Express) {
  app.get("/api/v1/workspaces/:workspaceId/redteam/operations", async (req, res) => { try { const uid = await userId(req); const wid = workspaceId(req); if (!(await canAccessWorkspace(uid, wid, "read"))) return res.status(403).json({ error: "Forbidden" }); res.json({ operations: listRedTeamOperations(uid).filter(op => op.workspaceId === wid) }); } catch (error) { jsonError(res, error); } });
  app.post("/api/v1/workspaces/:workspaceId/redteam/operations", async (req, res) => { try { const uid = await userId(req); const wid = workspaceId(req); if (!(await canAccessWorkspace(uid, wid, "write"))) return res.status(403).json({ error: "Forbidden" }); res.status(201).json(createRedTeamOperation(uid, { ...req.body, workspaceId: wid })); } catch (error) { jsonError(res, error); } });
  app.get("/api/v1/redteam/operations/:id", async (req, res) => { try { res.json(getRedTeamOperation(await userId(req), req.params.id)); } catch (error) { jsonError(res, error); } });
  app.post("/api/v1/redteam/operations/:id/request-approval", async (req, res) => { try { res.json(requestRedTeamApproval(await userId(req), req.params.id)); } catch (error) { jsonError(res, error); } });
  app.post("/api/v1/redteam/operations/:id/approve", async (req, res) => { try { res.json(approveRedTeamOperation(await userId(req), req.params.id)); } catch (error) { jsonError(res, error); } });
  app.post("/api/v1/redteam/operations/:id/status", async (req, res) => { try { res.json(setRedTeamOperationStatus(await userId(req), req.params.id, req.body.status)); } catch (error) { jsonError(res, error); } });
  app.post("/api/v1/redteam/operations/:id/simulate", async (req, res) => { try { res.json(simulateRedTeamCapability({ ownerUserId: await userId(req), operationId: req.params.id, capability: req.body.capability, approval: req.body.approval, syntheticInput: req.body.syntheticInput })); } catch (error) { jsonError(res, error); } });
  app.get("/api/v1/redteam/c2/policy", async (req, res) => { try { await userId(req); res.json(buildC2SimulationPolicy()); } catch (error) { jsonError(res, error); } });
}
