import type { Request, Response } from "express";
import { sdk } from "../_core/sdk";
import { runScheduledAdministrativeCheck } from "./service";

export async function workspaceMaintenanceHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const result = await runScheduledAdministrativeCheck(user.taskUid);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "scheduled-check-failed",
      context: { url: req.originalUrl },
      timestamp: new Date().toISOString(),
    });
  }
}
