import type { Express, Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { canAccessWorkspace } from "./control-plane/operations";
import {
  approveRedTeamOperation, buildC2SimulationPolicy, createRedTeamOperation, createSimulatedImplant, createSimulatedPhishingCampaign,
  getRedTeamOperation, getSimulatedImplant, getSimulatedPhishingCampaign, listRedTeamOperations, listSimulatedCommands, listSimulatedImplants,
  queueSimulatedCommand, recordSimulatedBeacon, recordSimulatedClick, requestRedTeamApproval, setRedTeamOperationStatus, simulatePhishingSend, simulateRedTeamCapability,
} from "./redteam-operations";

async function userId(req: Request) { const user = await sdk.authenticateRequest(req); if (!user) throw new Error("Authentication required"); return Number(user.id); }
function workspaceId(req: Request) { return Number(req.params.workspaceId); }
function jsonError(res: Response, error: unknown) { res.status(400).json({ error: error instanceof Error ? error.message : "request rejected" }); }

export function registerRedTeamRestV1Routes(app: Express) {
  app.get("/api/v1/workspaces/:workspaceId/redteam/operations", async (req, res) => { try { const uid = await userId(req); const wid = workspaceId(req); if (!(await canAccessWorkspace(uid, wid, "read"))) return res.status(403).json({ error: "Forbidden" }); res.json({ operations: listRedTeamOperations(uid).filter(op => op.workspaceId === wid) }); } catch (error) { jsonError(res, error); } });
  app.post("/api/v1/workspaces/:workspaceId/redteam/operations", async (req, res) => { try { const uid = await userId(req); const wid = workspaceId(req); if (!(await canAccessWorkspace(uid, wid, "manage"))) return res.status(403).json({ error: "Forbidden" }); res.status(201).json(createRedTeamOperation(uid, { ...req.body, workspaceId: wid })); } catch (error) { jsonError(res, error); } });
  app.get("/api/v1/redteam/operations/:id", async (req, res) => { try { res.json(getRedTeamOperation(await userId(req), req.params.id)); } catch (error) { jsonError(res, error); } });
  app.post("/api/v1/redteam/operations/:id/request-approval", async (req, res) => { try { res.json(requestRedTeamApproval(await userId(req), req.params.id)); } catch (error) { jsonError(res, error); } });
  app.post("/api/v1/redteam/operations/:id/approve", async (req, res) => { try { res.json(approveRedTeamOperation(await userId(req), req.params.id)); } catch (error) { jsonError(res, error); } });
  app.post("/api/v1/redteam/operations/:id/status", async (req, res) => { try { res.json(setRedTeamOperationStatus(await userId(req), req.params.id, req.body.status)); } catch (error) { jsonError(res, error); } });
  app.post("/api/v1/redteam/operations/:id/simulate", async (req, res) => { try { res.json(simulateRedTeamCapability({ ownerUserId: await userId(req), operationId: req.params.id, capability: req.body.capability, approval: req.body.approval, syntheticInput: req.body.syntheticInput })); } catch (error) { jsonError(res, error); } });
  app.get("/api/v1/redteam/c2/policy", async (req, res) => { try { await userId(req); res.json(buildC2SimulationPolicy()); } catch (error) { jsonError(res, error); } });
  app.get("/api/v1/redteam/implants", async (req, res) => { try { res.json({ implants: listSimulatedImplants(await userId(req)) }); } catch (error) { jsonError(res, error); } });
  app.post("/api/v1/redteam/implants", async (req, res) => { try { const uid = await userId(req); res.status(201).json(createSimulatedImplant(uid, String(req.body.operationId), req.body.platform)); } catch (error) { jsonError(res, error); } });
  app.get("/api/v1/redteam/implants/:id", async (req, res) => { try { res.json(getSimulatedImplant(await userId(req), req.params.id)); } catch (error) { jsonError(res, error); } });
  app.post("/api/v1/redteam/implants/:id/beacon", async (req, res) => { try { res.json(recordSimulatedBeacon(await userId(req), req.params.id)); } catch (error) { jsonError(res, error); } });
  app.post("/api/v1/redteam/implants/:id/command", async (req, res) => { try { res.json(queueSimulatedCommand(await userId(req), req.params.id, req.body.commandClass ?? "scenario_step")); } catch (error) { jsonError(res, error); } });
  app.get("/api/v1/redteam/implants/:id/commands", async (req, res) => { try { res.json({ commands: listSimulatedCommands(await userId(req), req.params.id) }); } catch (error) { jsonError(res, error); } });
  app.post("/api/v1/redteam/phishing/campaigns", async (req, res) => { try { const uid = await userId(req); res.status(201).json(createSimulatedPhishingCampaign(uid, String(req.body.operationId), { name: String(req.body.name ?? "Synthetic campaign"), template: req.body.template })); } catch (error) { jsonError(res, error); } });
  app.get("/api/v1/redteam/phishing/campaigns/:id/stats", async (req, res) => { try { const c = getSimulatedPhishingCampaign(await userId(req), req.params.id); res.json({ campaignId: c.id, status: c.status, clicks: c.clicks, simulated: true, credentialCollection: false }); } catch (error) { jsonError(res, error); } });
  app.post("/api/v1/redteam/phishing/campaigns/:id/send", async (req, res) => { try { res.json(simulatePhishingSend(await userId(req), req.params.id)); } catch (error) { jsonError(res, error); } });
  app.get("/api/v1/redteam/phishing/campaigns/:id/click", async (req, res) => { try { res.json(recordSimulatedClick(await userId(req), req.params.id)); } catch (error) { jsonError(res, error); } });
}
