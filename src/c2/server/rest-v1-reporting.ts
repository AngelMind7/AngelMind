import type { Express, Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { canAccessWorkspace } from "./control-plane/operations";
import * as reporting from "./reporting-workflow";

async function auth(req: Request) { const u = await sdk.authenticateRequest(req); if (!u) throw new Error("Authentication required."); return u; }
function ok(res: Response, data: unknown, status = 200) { res.status(status).json({ data, request_id: res.locals.requestId, apiVersion: "v1" }); }
function fail(res: Response, e: unknown) { const m = e instanceof Error ? e.message : "Request failed."; const s = m.includes("Authentication") ? 401 : m.includes("access") ? 403 : m.includes("not found") ? 404 : 400; res.status(s).json({ error: true, code: s === 401 ? "UNAUTHENTICATED" : s === 403 ? "FORBIDDEN" : s === 404 ? "NOT_FOUND" : "BAD_REQUEST", message: m, request_id: res.locals.requestId, apiVersion: "v1" }); }
function wid(v: unknown) { const n = Number(v); if (!Number.isSafeInteger(n) || n <= 0) throw new Error("Invalid workspaceId."); return n; }

export function registerRestV1ReportingRoutes(app: Express) {
  app.get("/api/v1/workspaces/:workspaceId/reports", async (req,res) => { try { const u=await auth(req), workspaceId=wid(req.params.workspaceId); if(!(await canAccessWorkspace(u.id,workspaceId,"read"))) throw new Error("Workspace access denied."); ok(res,reporting.listReports(workspaceId)); } catch(e){fail(res,e);} });
  app.post("/api/v1/workspaces/:workspaceId/reports", async (req,res) => { try { const u=await auth(req), workspaceId=wid(req.params.workspaceId); if(!(await canAccessWorkspace(u.id,workspaceId,"manage"))) throw new Error("Workspace access denied."); const b=req.body??{}; ok(res,reporting.createReport({workspaceId,title:String(b.title??""),view:b.view,findingIds:Array.isArray(b.findingIds)?b.findingIds.map(Number):[],evidenceIds:Array.isArray(b.evidenceIds)?b.evidenceIds.map(Number):[],createdByUserId:u.id}),201); } catch(e){fail(res,e);} });
  app.post("/api/v1/reports/:id/status", async (req,res) => { try { const u=await auth(req); const report=reporting.getReport(String(req.params.id)); if(!(await canAccessWorkspace(u.id,report.workspaceId,"manage"))) throw new Error("Workspace access denied."); ok(res,reporting.updateReportStatus(report.id,req.body?.status)); } catch(e){fail(res,e);} });
  app.get("/api/v1/reports/:id/export", async (req,res) => { try { const u=await auth(req); const report=reporting.getReport(String(req.params.id)); if(!(await canAccessWorkspace(u.id,report.workspaceId,"read"))) throw new Error("Workspace access denied."); ok(res,reporting.exportReport(report.id)); } catch(e){fail(res,e);} });
}
