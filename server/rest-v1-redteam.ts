import type { Express, Request, Response } from "express";
import { authenticateRequest, canAccessWorkspace } from "./rest-v1-auth";
import {
  approveRedTeamOperation,
  buildC2SimulationPolicy,
  createRedTeamOperation,
  getRedTeamOperation,
  listRedTeamOperations,
  requestRedTeamApproval,
  setRedTeamOperationStatus,
  simulateRedTeamCapability,
} from "./redteam-operations";

function userId(req: Request) { return authenticateRequest(req).userId; }
function workspaceId(req: Request) { return Number(req.params.workspaceId); }
function jsonError(res: Response, error: unknown) { res.status(400).json({ error: error instanceof Error ? error.message : "request rejected" }); }

export function registerRedTeamRestV1Routes(app: Express) {
  app.get("/api/v1/workspaces/:workspaceId/redteam/operations", (req, res) => {
    try { const uid = userId(req); const wid = workspaceId(req); canAccessWorkspace(uid, wid); res.json({ operations: listRedTeamOperations(uid).filter(op => op.workspaceId === wid) }); } catch (error) { jsonError(res, error); }
  });
  app.post("/api/v1/workspaces/:workspaceId/redteam/operations", (req, res) => {
    try { const uid = userId(req); const wid = workspaceId(req); canAccessWorkspace(uid, wid); res.status(201).json(createRedTeamOperation(uid, { ...req.body, workspaceId: wid })); } catch (error) { jsonError(res, error); }
  });
  app.get("/api/v1/redteam/operations/:id", (req, res) => {
    try { res.json(getRedTeamOperation(userId(req), req.params.id)); } catch (error) { jsonError(res, error); }
  });
  app.post("/api/v1/redteam/operations/:id/request-approval", (req, res) => {
    try { res.json(requestRedTeamApproval(userId(req), req.params.id)); } catch (error) { jsonError(res, error); }
  });
  app.post("/api/v1/redteam/operations/:id/approve", (req, res) => {
    try { res.json(approveRedTeamOperation(userId(req), req.params.id)); } catch (error) { jsonError(res, error); }
  });
  app.post("/api/v1/redteam/operations/:id/status", (req, res) => {
    try { res.json(setRedTeamOperationStatus(userId(req), req.params.id, req.body.status)); } catch (error) { jsonError(res, error); }
  });
  app.post("/api/v1/redteam/operations/:id/simulate", (req, res) => {
    try { res.json(simulateRedTeamCapability({ ownerUserId: userId(req), operationId: req.params.id, capability: req.body.capability, approval: req.body.approval, syntheticInput: req.body.syntheticInput })); } catch (error) { jsonError(res, error); }
  });
  app.get("/api/v1/redteam/c2/policy", (req, res) => {
    try { userId(req); res.json(buildC2SimulationPolicy()); } catch (error) { jsonError(res, error); }
  });
}
