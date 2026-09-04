import type { Express, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { sdk } from "./_core/sdk";
import { simulateGovernedChain, type SimulationRequest } from "./simulation-engine";

export function registerSimulationRoutes(app: Express) {
  app.post("/api/v1/simulations/run", async (req: Request, res: Response) => {
    const requestId = res.locals.requestId ?? randomUUID();
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user) return res.status(401).json({ error: true, code: "UNAUTHENTICATED", message: "Authentication required.", request_id: requestId });
      const body = req.body ?? {};
      const request: SimulationRequest = {
        workspaceId: Number(body.workspaceId),
        actorId: Number(user.id),
        name: typeof body.name === "string" ? body.name : "",
        input: body.input ?? {},
        nodes: Array.isArray(body.nodes) ? body.nodes : [],
      };
      const result = simulateGovernedChain(request);
      return res.status(200).json({ data: result, request_id: requestId, apiVersion: "v1" });
    } catch (error) {
      return res.status(400).json({ error: true, code: "SIMULATION_INVALID", message: error instanceof Error ? error.message : "Simulation failed.", request_id: requestId });
    }
  });
}
