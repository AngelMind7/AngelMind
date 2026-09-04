import { createHash } from "node:crypto";

export type SimulationNodeKind = "action" | "condition" | "foreach" | "while" | "parallel" | "merge" | "sleep" | "subchain";

export interface SimulationNode {
  id: string;
  kind: SimulationNodeKind;
  capability: string;
  dependsOn?: string[];
  input?: Record<string, unknown>;
  maxIterations?: number;
}

export interface SimulationRequest {
  workspaceId: number;
  actorId: number;
  name: string;
  input: unknown;
  nodes: SimulationNode[];
}

export interface SimulationEvent {
  nodeId: string;
  kind: SimulationNodeKind;
  status: "simulated" | "skipped";
  evidenceId: string;
  detail: string;
}

export interface SimulationResult {
  simulationId: string;
  status: "completed";
  targetTraffic: false;
  events: SimulationEvent[];
  evidence: { id: string; sha256: string; provenance: "synthetic" }[];
}

function stable(value: unknown) {
  return JSON.stringify(value, Object.keys((value && typeof value === "object" && !Array.isArray(value)) ? value as Record<string, unknown> : {}).sort());
}

function evidenceId(simulationId: string, node: SimulationNode, index: number) {
  return createHash("sha256").update(`${simulationId}:${index}:${node.id}:${node.capability}:${stable(node.input ?? {})}`).digest("hex");
}

export function validateSimulationGraph(nodes: SimulationNode[]) {
  if (!nodes.length) throw new Error("Simulation graph must contain at least one node.");
  const ids = new Set<string>();
  for (const node of nodes) {
    if (!/^[a-zA-Z0-9._:-]{1,96}$/.test(node.id)) throw new Error(`Invalid simulation node id: ${node.id}`);
    if (ids.has(node.id)) throw new Error(`Duplicate simulation node id: ${node.id}`);
    ids.add(node.id);
    if (!node.capability.trim()) throw new Error(`Simulation node ${node.id} requires a capability.`);
    if (node.kind === "foreach" || node.kind === "while") {
      const limit = node.maxIterations ?? 3;
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error(`Invalid iteration bound for ${node.id}.`);
    }
  }
  for (const node of nodes) for (const dependency of node.dependsOn ?? []) if (!ids.has(dependency)) throw new Error(`Unknown dependency ${dependency} for ${node.id}.`);
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const walk = (id: string) => {
    if (visiting.has(id)) throw new Error("Simulation graph contains a cycle.");
    if (visited.has(id)) return;
    visiting.add(id);
    const node = nodes.find(item => item.id === id)!;
    for (const dependency of node.dependsOn ?? []) walk(dependency);
    visiting.delete(id);
    visited.add(id);
  };
  for (const node of nodes) walk(node.id);
}

export function simulateGovernedChain(request: SimulationRequest): SimulationResult {
  if (!Number.isSafeInteger(request.workspaceId) || request.workspaceId < 1) throw new Error("workspaceId must be positive.");
  if (!Number.isSafeInteger(request.actorId) || request.actorId < 1) throw new Error("actorId must be positive.");
  if (!request.name.trim()) throw new Error("Simulation name is required.");
  validateSimulationGraph(request.nodes);
  const simulationId = createHash("sha256").update(`${request.workspaceId}:${request.actorId}:${request.name}:${stable(request.input)}`).digest("hex").slice(0, 24);
  const events: SimulationEvent[] = [];
  const evidence: SimulationResult["evidence"] = [];
  const completed = new Set<string>();
  const pending = [...request.nodes];
  let safetyCounter = 0;
  while (pending.length && safetyCounter++ < request.nodes.length * 2) {
    const readyIndex = pending.findIndex(node => (node.dependsOn ?? []).every(dep => completed.has(dep)));
    if (readyIndex < 0) throw new Error("Simulation graph cannot be scheduled from its dependency state.");
    const node = pending.splice(readyIndex, 1)[0];
    const sha256 = evidenceId(simulationId, node, events.length);
    const id = `ev_${sha256.slice(0, 20)}`;
    evidence.push({ id, sha256, provenance: "synthetic" });
    events.push({ nodeId: node.id, kind: node.kind, status: "simulated", evidenceId: id, detail: `Synthetic simulation of ${node.capability}; no network or target execution performed.` });
    completed.add(node.id);
  }
  return { simulationId: `sim_${simulationId}`, status: "completed", targetTraffic: false, events, evidence };
}
