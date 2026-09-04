import type { Express, Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { canAccessWorkspace } from "./control-plane/operations";
import { addPurpleTeamImprovement, approvePurpleTeamExercise, createPurpleTeamExercise, getPurpleTeamExercise, listDetectionRules, listPurpleTeamExercises, listPurpleTeamImprovements, listPurpleTeamScenarios, planPurpleTeamExercise, registerDetectionRule, runPurpleTeamExercise } from "./purple-team";

async function uid(req: Request) { const user = await sdk.authenticateRequest(req); if (!user) throw new Error("Authentication required"); return Number(user.id); }
function wid(req: Request) { return Number(req.params.workspaceId); }
function fail(res: Response, e: unknown) { res.status(400).json({ error: e instanceof Error ? e.message : "request rejected" }); }

export function registerPurpleTeamRestV1Routes(app: Express) {
  app.get("/api/v1/purpleteam/exercises", async (req, res) => { try { const id = await uid(req); const workspaceId = Number(req.query.workspaceId); if (!(await canAccessWorkspace(id, workspaceId, "read"))) return res.status(403).json({ error: "Forbidden" }); res.json({ exercises: listPurpleTeamExercises(id, workspaceId) }); } catch (e) { fail(res, e); } });
  app.post("/api/v1/purpleteam/exercises", async (req, res) => { try { const id = await uid(req); const workspaceId = wid(req); if (!(await canAccessWorkspace(id, workspaceId, "write"))) return res.status(403).json({ error: "Forbidden" }); res.status(201).json(createPurpleTeamExercise(id, { ...req.body, workspaceId })); } catch (e) { fail(res, e); } });
  app.get("/api/v1/purpleteam/exercises/:id", async (req, res) => { try { res.json(getPurpleTeamExercise(await uid(req), req.params.id)); } catch (e) { fail(res, e); } });
  app.post("/api/v1/purpleteam/exercises/:id/plan", async (req, res) => { try { res.json(planPurpleTeamExercise(await uid(req), req.params.id)); } catch (e) { fail(res, e); } });
  app.post("/api/v1/purpleteam/exercises/:id/approve", async (req, res) => { try { res.json(approvePurpleTeamExercise(await uid(req), req.params.id)); } catch (e) { fail(res, e); } });
  app.post("/api/v1/purpleteam/exercises/:id/run", async (req, res) => { try { res.json(runPurpleTeamExercise(await uid(req), req.params.id)); } catch (e) { fail(res, e); } });
  app.get("/api/v1/purpleteam/exercises/:id/gap", async (req, res) => { try { const exercise = getPurpleTeamExercise(await uid(req), req.params.id); res.json({ exerciseId: exercise.id, status: exercise.status, note: "Run the approved synthetic exercise to produce a detection-gap result." }); } catch (e) { fail(res, e); } });
  app.get("/api/v1/purpleteam/exercises/:id/improvements", async (req, res) => { try { getPurpleTeamExercise(await uid(req), req.params.id); res.json({ improvements: listPurpleTeamImprovements(req.params.id) }); } catch (e) { fail(res, e); } });
  app.post("/api/v1/purpleteam/exercises/:id/gap/improve", async (req, res) => { try { const id = await uid(req); res.status(201).json(addPurpleTeamImprovement(id, { ...req.body, exerciseId: req.params.id })); } catch (e) { fail(res, e); } });
  app.get("/api/v1/purpleteam/scenarios", async (req, res) => { try { await uid(req); res.json({ scenarios: listPurpleTeamScenarios() }); } catch (e) { fail(res, e); } });
  app.get("/api/v1/purpleteam/detection-rules", async (req, res) => { try { await uid(req); res.json({ rules: listDetectionRules() }); } catch (e) { fail(res, e); } });
  app.post("/api/v1/purpleteam/detection-rules", async (req, res) => { try { await uid(req); res.status(201).json(registerDetectionRule(req.body)); } catch (e) { fail(res, e); } });
}
