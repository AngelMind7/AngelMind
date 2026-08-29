import type { Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";
import { runScheduledAdministrativeCheck, runScheduledAdministrativeChecks } from "./service";

function isAuthorizedRailwayCron(req: Request): boolean {
  const expected = process.env.RAILWAY_CRON_SECRET?.trim();
  if (!expected) return false;
  const supplied = req.headers["x-railway-cron-secret"];
  if (typeof supplied !== "string" || supplied.length === 0) return false;
  const suppliedBuffer = Buffer.from(supplied, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer);
}

export async function workspaceMaintenanceHandler(req: Request, res: Response) {
  if (!isAuthorizedRailwayCron(req)) {
    return res.status(401).json({ error: "railway-cron-unauthorized" });
  }

  const taskUid = typeof req.body?.taskUid === "string" ? req.body.taskUid.trim() : "";

  if (taskUid && !/^railway:workspace:\d+$/.test(taskUid)) {
    return res.status(400).json({ error: "valid workspace taskUid is required" });
  }

  try {
    const result = taskUid
      ? await runScheduledAdministrativeCheck(taskUid)
      : await runScheduledAdministrativeChecks();
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "scheduled-check-failed",
      context: { url: req.originalUrl },
      timestamp: new Date().toISOString(),
    });
  }
}
