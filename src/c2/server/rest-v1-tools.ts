import type { Express, Request, Response } from "express";
import { getToolCatalogEntry, listToolCatalog } from "./tool-catalog";
import { checkRegisteredAdapterHealth, describeToolRuntime, listRegisteredAdapters } from "./tool-runtime";
import { requireRestUser, restError } from "./rest-v1-auth";

function id(value: string) {
  const decoded = decodeURIComponent(value).trim();
  if (!/^[A-Za-z0-9._:-]{1,160}$/.test(decoded)) throw new Error("tool id tidak valid.");
  return decoded;
}

function respond(res: Response, data: unknown, status = 200) {
  res.status(status).json({ data, request_id: res.locals.requestId, apiVersion: "v1" });
}

export function registerToolRestV1Routes(app: Express) {
  app.get("/api/v1/tools", async (req, res) => {
    try {
      await requireRestUser(req, "tools:read");
      respond(res, listToolCatalog({
        category: typeof req.query.category === "string" ? req.query.category : undefined,
        riskClass: typeof req.query.riskClass === "string" ? req.query.riskClass as never : undefined,
        disposition: typeof req.query.disposition === "string" ? req.query.disposition as never : undefined,
      }));
    } catch (e) { restError(res, e); }
  });

  app.get("/api/v1/tools/:id", async (req, res) => {
    try {
      await requireRestUser(req, "tools:read");
      const tool = getToolCatalogEntry(id(req.params.id));
      if (!tool) throw new Error("Tool tidak ditemukan.");
      respond(res, { ...tool, runtime: describeToolRuntime(tool.toolKey).adapter ?? null });
    } catch (e) { restError(res, e); }
  });

  app.post("/api/v1/tools/:id/health-check", async (req, res) => {
    try {
      await requireRestUser(req, "tools:read");
      const toolKey = id(req.params.id);
      const tool = getToolCatalogEntry(toolKey);
      if (!tool) throw new Error("Tool tidak ditemukan.");
      const runtime = describeToolRuntime(tool.toolKey);
      const health = runtime.adapter
        ? (await checkRegisteredAdapterHealth()).find(item => item.toolKey === tool.toolKey) ?? { toolKey: tool.toolKey, available: false }
        : { toolKey: tool.toolKey, available: false, reason: "adapter_not_registered" };
      respond(res, health);
    } catch (e) { restError(res, e); }
  });

  app.get("/api/v1/tools/capabilities", async (req, res) => {
    try {
      await requireRestUser(req, "tools:read");
      const catalog = listToolCatalog();
      respond(res, catalog.map(tool => ({ toolKey: tool.toolKey, name: tool.name, category: tool.category, riskClass: tool.riskClass, disposition: tool.disposition, approvalGate: tool.approvalGate })));
    } catch (e) { restError(res, e); }
  });

  app.get("/api/v1/tools/installed", async (req, res) => {
    try { await requireRestUser(req, "tools:read"); respond(res, listRegisteredAdapters()); }
    catch (e) { restError(res, e); }
  });

  app.get("/api/v1/tools/health", async (req, res) => {
    try { await requireRestUser(req, "tools:read"); respond(res, await checkRegisteredAdapterHealth()); }
    catch (e) { restError(res, e); }
  });
}
