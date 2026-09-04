import { z } from "zod";
import { validateC2Policy, type C2Policy } from "./v4-gap-closure";

export const redTeamOperationSchema = z.object({
  name: z.string().trim().min(3).max(160),
  objective: z.string().trim().min(10).max(10_000),
  workspaceId: z.number().int().positive(),
  allowedTargets: z.array(z.string().trim().min(1).max(255)).min(1).max(100),
  exclusions: z.array(z.string().trim().min(1).max(255)).max(100),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  rulesOfEngagement: z.string().trim().min(20).max(20_000),
});

export type RedTeamOperationInput = z.infer<typeof redTeamOperationSchema>;
export type RedTeamOperationStatus = "draft" | "pending_approval" | "approved" | "running" | "paused" | "completed" | "cancelled";

export type RedTeamOperation = RedTeamOperationInput & {
  id: string;
  ownerUserId: number;
  status: RedTeamOperationStatus;
  simulationOnly: true;
  auditRequired: true;
  createdAt: string;
};

const operations = new Map<string, RedTeamOperation>();

function validateWindow(input: RedTeamOperationInput) {
  if (input.endAt <= input.startAt) throw new Error("operation endAt must be after startAt");
  if (!input.allowedTargets.length) throw new Error("operation requires an explicit target allowlist");
}

export function createRedTeamOperation(ownerUserId: number, rawInput: RedTeamOperationInput) {
  const input = redTeamOperationSchema.parse(rawInput);
  validateWindow(input);
  const id = `rtop_${crypto.randomUUID()}`;
  const operation: RedTeamOperation = {
    ...input,
    id,
    ownerUserId,
    status: "draft",
    simulationOnly: true,
    auditRequired: true,
    createdAt: new Date().toISOString(),
  };
  operations.set(id, operation);
  return operation;
}

export function listRedTeamOperations(ownerUserId: number) {
  return [...operations.values()].filter(operation => operation.ownerUserId === ownerUserId);
}

export function getRedTeamOperation(ownerUserId: number, id: string) {
  const operation = operations.get(id);
  if (!operation || operation.ownerUserId !== ownerUserId) throw new Error("red-team operation not found");
  return operation;
}

export function requestRedTeamApproval(ownerUserId: number, id: string) {
  const operation = getRedTeamOperation(ownerUserId, id);
  if (operation.status !== "draft" && operation.status !== "paused") throw new Error("operation is not awaiting approval");
  operation.status = "pending_approval";
  return operation;
}

export function approveRedTeamOperation(ownerUserId: number, id: string) {
  const operation = getRedTeamOperation(ownerUserId, id);
  if (operation.status !== "pending_approval") throw new Error("operation must be pending approval");
  operation.status = "approved";
  return operation;
}

export function setRedTeamOperationStatus(ownerUserId: number, id: string, status: Extract<RedTeamOperationStatus, "running" | "paused" | "completed" | "cancelled">) {
  const operation = getRedTeamOperation(ownerUserId, id);
  if (status === "running" && operation.status !== "approved" && operation.status !== "paused") throw new Error("operation must be approved before simulation starts");
  if (operation.status === "completed" || operation.status === "cancelled") throw new Error("terminal operation cannot transition");
  operation.status = status;
  return operation;
}

export type RedTeamCapability = "c2" | "phishing" | "social_engineering" | "physical" | "lateral_movement" | "exfiltration" | "persistence" | "evasion" | "opsec";

export function authorizeRedTeamCapability(operation: RedTeamOperation, capability: RedTeamCapability, approval: "approved" | "missing") {
  if (operation.status !== "approved" && operation.status !== "running") return { allowed: false as const, reason: "operation_not_approved" as const };
  if (approval !== "approved") return { allowed: false as const, reason: "human_approval_required" as const };
  if (!operation.allowedTargets.length) return { allowed: false as const, reason: "scope_not_validated" as const };
  return { allowed: true as const, capability, simulationOnly: true as const };
}

export function buildC2SimulationPolicy(): C2Policy {
  const policy: C2Policy = { mode: "simulation", targetExecutionEnabled: false, approvalRequired: true, auditRequired: true };
  validateC2Policy(policy);
  return policy;
}

export function simulateRedTeamCapability(input: {
  ownerUserId: number;
  operationId: string;
  capability: RedTeamCapability;
  approval?: "approved" | "missing";
  syntheticInput?: Record<string, unknown>;
}) {
  const operation = getRedTeamOperation(input.ownerUserId, input.operationId);
  const decision = authorizeRedTeamCapability(operation, input.capability, input.approval ?? "missing");
  if (!decision.allowed) return { ok: false as const, ...decision, operationId: operation.id };
  return {
    ok: true as const,
    operationId: operation.id,
    capability: input.capability,
    mode: "simulation" as const,
    synthetic: true as const,
    targetExecutionEnabled: false as const,
    evidence: { input: input.syntheticInput ?? {}, generatedAt: new Date().toISOString(), chainOfCustody: `simulation:${operation.id}` },
  };
}
