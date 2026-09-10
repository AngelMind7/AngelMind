import type { Express, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { sdk } from "./_core/sdk";
import { canAccessWorkspace } from "./control-plane/operations";
import { simulateGovernedChain, type SimulationNode, type SimulationRequest } from "./simulation-engine";

const MAX_NODES = 128;
const MAX_BODY_BYTES = 256_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function parseNodes(value: unknown): SimulationNode[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_NODES) throw new Error(`nodes must contain 1-${MAX_NODES} entries.`);
  return value.map((raw, index) => {
    if (!isRecord(raw)) throw new Error(`nodes[${index}] must be an object.`);
    if (typeof raw.id !== "string" || typeof raw.kind !== "string" || typeof raw.capability !== "string") throw new Error(`nodes[${index}] requires id, kind and capability.`);
    if (raw.dependsOn !== undefined && (!Array.isArray(raw.dependsOn) || raw.dependsOn.some(item => typeof item !== "string"))) throw new Error(`nodes[${index}].dependsOn must be an array of strings.`);
    if (raw.input !== undefined && !isRecord(raw.input)) throw new Error(`nodes[${index}].input must be an object.`);
    return {
      id: raw.id,
      kind: raw.kind as SimulationNode["kind"],
      capability: raw.capability,
      dependsOn: raw.dependsOn as string[] | undefined,
      input: raw.input as Record<string, unknown> | undefined,
      maxIterations: raw.maxIterations as number | undefined,
    };
  });
}

export function registerSimulationRoutes(app: Express) {
  app.post("/api/v1/simulations/run", async (req: Request, res: Response) => {
    const requestId = res.locals.requestId ?? randomUUID();
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user) return res.status(401).json({ error: true, code: "UNAUTHENTICATED", message: "Authentication required.", request_id: requestId });
      const body = req.body ?? {};
      const serializedSize = Buffer.byteLength(JSON.stringify(body), "utf8");
      if (serializedSize > MAX_BODY_BYTES) return res.status(413).json({ error: true, code: "SIMULATION_BODY_TOO_LARGE", message: `Simulation request exceeds ${MAX_BODY_BYTES} bytes.`, request_id: requestId });
      const workspaceId = Number(body.workspaceId);
      if (!Number.isSafeInteger(workspaceId) || workspaceId < 1) return res.status(400).json({ error: true, code: "INVALID_WORKSPACE", message: "workspaceId must be a positive integer.", request_id: requestId });
      if (!(await canAccessWorkspace(user.id, workspaceId, "read"))) return res.status(403).json({ error: true, code: "FORBIDDEN", message: "Workspace tidak dapat diakses.", request_id: requestId });
      const request: SimulationRequest = {
        workspaceId,
        actorId: Number(user.id),
        name: typeof body.name === "string" ? body.name : "",
        input: body.input ?? {},
        nodes: parseNodes(body.nodes),
      };
      const result = simulateGovernedChain(request);
      return res.status(200).json({ data: result, request_id: requestId, apiVersion: "v1" });
    } catch (error) {
      return res.status(400).json({ error: true, code: "SIMULATION_INVALID", message: error instanceof Error ? error.message : "Simulation failed.", request_id: requestId });
    }
  });
}
