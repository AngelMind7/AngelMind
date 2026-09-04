import type { Express, Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { canAccessWorkspace } from "./control-plane/operations";
import { calculateBountyPayout, createBountyProgram, getBountyProgram, getBountySubmission, listBountyPrograms, listBountySubmissions, listDisclosure, listHallOfFame, listLeaderboard, listLegalDocs, publishDisclosure, registerResearcher, submitBountyReport, validateBountySubmission } from "./bug-bounty";

async function uid(req: Request) { const user = await sdk.authenticateRequest(req); if (!user) throw new Error("Authentication required"); return Number(user.id); }
function fail(res: Response, e: unknown) { res.status(400).json({ error: e instanceof Error ? e.message : "request rejected" }); }
function workspaceId(req: Request) { return Number(req.body?.workspaceId ?? req.query?.workspaceId); }

export function registerBugBountyRestV1Routes(app: Express) {
  app.get("/api/v1/bugbounty/programs", async (req, res) => { try { const id = await uid(req); const wid = workspaceId(req); if (Number.isInteger(wid) && wid > 0 && !(await canAccessWorkspace(id, wid, "read"))) return res.status(403).json({ error: "Forbidden" }); res.json({ programs: listBountyPrograms() }); } catch (e) { fail(res, e); } });
  app.post("/api/v1/bugbounty/programs", async (req, res) => { try { const id = await uid(req); const wid = workspaceId(req); if (wid > 0 && !(await canAccessWorkspace(id, wid, "write"))) return res.status(403).json({ error: "Forbidden" }); res.status(201).json(createBountyProgram(req.body)); } catch (e) { fail(res, e); } });
  app.get("/api/v1/bugbounty/programs/:id", async (req, res) => { try { await uid(req); res.json(getBountyProgram(req.params.id)); } catch (e) { fail(res, e); } });
  app.post("/api/v1/bugbounty/programs/:id/submission", async (req, res) => { try { const id = await uid(req); const submission = submitBountyReport({ ...req.body, programId: req.params.id, researcherId: String(req.body?.researcherId ?? id) }); res.status(201).json(submission); } catch (e) { fail(res, e); } });
  app.get("/api/v1/bugbounty/submissions", async (req, res) => { try { await uid(req); res.json({ submissions: listBountySubmissions(typeof req.query.programId === "string" ? req.query.programId : undefined) }); } catch (e) { fail(res, e); } });
  app.get("/api/v1/bugbounty/submissions/:id", async (req, res) => { try { await uid(req); res.json(getBountySubmission(req.params.id)); } catch (e) { fail(res, e); } });
  app.post("/api/v1/bugbounty/submissions/:id/validate", async (req, res) => { try { await uid(req); res.json(validateBountySubmission(req.params.id, req.body?.validationNote)); } catch (e) { fail(res, e); } });
  app.post("/api/v1/bugbounty/submissions/:id/payout", async (req, res) => { try { await uid(req); res.json(calculateBountyPayout(req.params.id)); } catch (e) { fail(res, e); } });

  // Supporting governed records for onboarding, disclosure, legal, leaderboard and hall-of-fame UI.
  app.post("/api/v1/bugbounty/researchers", async (req, res) => { try { await uid(req); res.status(201).json(registerResearcher(req.body)); } catch (e) { fail(res, e); } });
  app.get("/api/v1/bugbounty/leaderboard", async (req, res) => { try { await uid(req); res.json({ leaderboard: listLeaderboard() }); } catch (e) { fail(res, e); } });
  app.post("/api/v1/bugbounty/submissions/:id/disclosure", async (req, res) => { try { await uid(req); res.status(201).json(publishDisclosure(req.params.id, Boolean(req.body?.cveRequested))); } catch (e) { fail(res, e); } });
  app.get("/api/v1/bugbounty/disclosures", async (req, res) => { try { await uid(req); res.json({ disclosures: listDisclosure(typeof req.query.submissionId === "string" ? req.query.submissionId : undefined) }); } catch (e) { fail(res, e); } });
  app.get("/api/v1/bugbounty/legal", async (req, res) => { try { await uid(req); res.json({ documents: listLegalDocs(typeof req.query.programId === "string" ? req.query.programId : undefined) }); } catch (e) { fail(res, e); } });
  app.get("/api/v1/bugbounty/hall-of-fame", async (req, res) => { try { await uid(req); res.json({ entries: listHallOfFame() }); } catch (e) { fail(res, e); } });
}
