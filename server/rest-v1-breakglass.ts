import type { Express } from "express";
import { approveBreakGlass, listBreakGlassRequests, requestBreakGlass, revokeBreakGlass } from "./breakglass";
import { requireRestUser, restError } from "./rest-v1-auth";

export function registerBreakGlassRestV1Routes(app: Express) {
  app.post("/api/v1/breakglass/request", async (req, res) => {
    try {
      const auth = await requireRestUser(req, "admin");
      const result = await requestBreakGlass(auth.user, {
        workspaceId: Number(req.body?.workspaceId),
        reason: req.body?.reason,
        durationMinutes: req.body?.durationMinutes,
      });
      res.status(201).json({ data: result, request_id: res.locals.requestId, apiVersion: "v1" });
    } catch (error) {
      restError(res, error);
    }
  });

  app.get("/api/v1/breakglass/requests", async (req, res) => {
    try {
      const auth = await requireRestUser(req, "admin");
      const workspaceId = req.query.workspaceId === undefined ? undefined : Number(req.query.workspaceId);
      const requests = await listBreakGlassRequests(auth.user, workspaceId);
      res.json({ data: requests, request_id: res.locals.requestId, apiVersion: "v1" });
    } catch (error) {
      restError(res, error);
    }
  });

  app.post("/api/v1/breakglass/requests/:id/approve", async (req, res) => {
    try {
      const auth = await requireRestUser(req, "admin");
      const result = await approveBreakGlass(auth.user, Number(req.params.id));
      res.json({ data: result, request_id: res.locals.requestId, apiVersion: "v1" });
    } catch (error) {
      restError(res, error);
    }
  });

  app.post("/api/v1/breakglass/requests/:id/revoke", async (req, res) => {
    try {
      const auth = await requireRestUser(req, "admin");
      const result = await revokeBreakGlass(auth.user, Number(req.params.id));
      res.json({ data: result, request_id: res.locals.requestId, apiVersion: "v1" });
    } catch (error) {
      restError(res, error);
    }
  });
}
