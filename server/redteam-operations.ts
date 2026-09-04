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

export type RedTeamOperation = RedTeamOperationInput & { id: string; ownerUserId: number; status: RedTeamOperationStatus; simulationOnly: true; auditRequired: true; createdAt: string };
const operations = new Map<string, RedTeamOperation>();

function validateWindow(input: RedTeamOperationInput) {
  if (input.endAt <= input.startAt) throw new Error("operation endAt must be after startAt");
  if (!input.allowedTargets.length) throw new Error("operation requires an explicit target allowlist");
}

export function createRedTeamOperation(ownerUserId: number, rawInput: RedTeamOperationInput) {
  const input = redTeamOperationSchema.parse(rawInput); validateWindow(input);
  const id = `rtop_${crypto.randomUUID()}`;
  const operation: RedTeamOperation = { ...input, id, ownerUserId, status: "draft", simulationOnly: true, auditRequired: true, createdAt: new Date().toISOString() };
  operations.set(id, operation); return operation;
}
export function listRedTeamOperations(ownerUserId: number) { return [...operations.values()].filter(operation => operation.ownerUserId === ownerUserId); }
export function getRedTeamOperation(ownerUserId: number, id: string) { const operation = operations.get(id); if (!operation || operation.ownerUserId !== ownerUserId) throw new Error("red-team operation not found"); return operation; }
export function requestRedTeamApproval(ownerUserId: number, id: string) { const operation = getRedTeamOperation(ownerUserId, id); if (operation.status !== "draft" && operation.status !== "paused") throw new Error("operation is not awaiting approval"); operation.status = "pending_approval"; return operation; }
export function approveRedTeamOperation(ownerUserId: number, id: string) { const operation = getRedTeamOperation(ownerUserId, id); if (operation.status !== "pending_approval") throw new Error("operation must be pending approval"); operation.status = "approved"; return operation; }
export function setRedTeamOperationStatus(ownerUserId: number, id: string, status: Extract<RedTeamOperationStatus, "running" | "paused" | "completed" | "cancelled">) { const operation = getRedTeamOperation(ownerUserId, id); if (status === "running" && operation.status !== "approved" && operation.status !== "paused") throw new Error("operation must be approved before simulation starts"); if (operation.status === "completed" || operation.status === "cancelled") throw new Error("terminal operation cannot transition"); operation.status = status; return operation; }

export type RedTeamCapability = "c2" | "phishing" | "social_engineering" | "physical" | "lateral_movement" | "exfiltration" | "persistence" | "evasion" | "opsec";
export function authorizeRedTeamCapability(operation: RedTeamOperation, capability: RedTeamCapability, approval: "approved" | "missing") { if (operation.status !== "approved" && operation.status !== "running") return { allowed: false as const, reason: "operation_not_approved" as const }; if (approval !== "approved") return { allowed: false as const, reason: "human_approval_required" as const }; if (!operation.allowedTargets.length) return { allowed: false as const, reason: "scope_not_validated" as const }; return { allowed: true as const, capability, simulationOnly: true as const }; }
export function buildC2SimulationPolicy(): C2Policy { const policy: C2Policy = { mode: "simulation", targetExecutionEnabled: false, approvalRequired: true, auditRequired: true }; validateC2Policy(policy); return policy; }
export function simulateRedTeamCapability(input: { ownerUserId: number; operationId: string; capability: RedTeamCapability; approval?: "approved" | "missing"; syntheticInput?: Record<string, unknown> }) { const operation = getRedTeamOperation(input.ownerUserId, input.operationId); const decision = authorizeRedTeamCapability(operation, input.capability, input.approval ?? "missing"); if (!decision.allowed) return { ok: false as const, ...decision, operationId: operation.id }; return { ok: true as const, operationId: operation.id, capability: input.capability, mode: "simulation" as const, synthetic: true as const, targetExecutionEnabled: false as const, evidence: { input: input.syntheticInput ?? {}, generatedAt: new Date().toISOString(), chainOfCustody: `simulation:${operation.id}` } }; }

export type SimulatedImplant = { id: string; operationId: string; platform: "windows" | "linux" | "macos"; status: "generated" | "checked_in" | "revoked"; simulationOnly: true; generatedAt: string };
export type SimulatedCommand = { id: string; implantId: string; commandClass: "health_check" | "inventory" | "scenario_step"; status: "queued" | "simulated"; createdAt: string };
export type SimulatedPhishingCampaign = { id: string; operationId: string; name: string; template: "synthetic_email" | "synthetic_landing_page"; status: "draft" | "simulated"; clicks: number; createdAt: string; simulationOnly: true };
const implants = new Map<string, SimulatedImplant>();
const commands = new Map<string, SimulatedCommand>();
const phishingCampaigns = new Map<string, SimulatedPhishingCampaign>();

function requireApprovedOperation(ownerUserId: number, operationId: string) { const operation = getRedTeamOperation(ownerUserId, operationId); if (operation.status !== "approved" && operation.status !== "running") throw new Error("operation must be approved before simulation starts"); return operation; }
export function listSimulatedImplants(ownerUserId: number) { const ids = new Set(listRedTeamOperations(ownerUserId).map(o => o.id)); return [...implants.values()].filter(i => ids.has(i.operationId)); }
export function createSimulatedImplant(ownerUserId: number, operationId: string, platform: SimulatedImplant["platform"]) { requireApprovedOperation(ownerUserId, operationId); const id = `simimplant_${crypto.randomUUID()}`; const implant: SimulatedImplant = { id, operationId, platform, status: "generated", simulationOnly: true, generatedAt: new Date().toISOString() }; implants.set(id, implant); return implant; }
export function getSimulatedImplant(ownerUserId: number, id: string) { const implant = implants.get(id); if (!implant || !listRedTeamOperations(ownerUserId).some(o => o.id === implant.operationId)) throw new Error("simulated implant not found"); return implant; }
export function recordSimulatedBeacon(ownerUserId: number, id: string) { const implant = getSimulatedImplant(ownerUserId, id); requireApprovedOperation(ownerUserId, implant.operationId); implant.status = "checked_in"; return { implantId: id, received: true, mode: "simulation" as const, targetExecutionEnabled: false as const, receivedAt: new Date().toISOString() }; }
export function queueSimulatedCommand(ownerUserId: number, id: string, commandClass: SimulatedCommand["commandClass"]) { const implant = getSimulatedImplant(ownerUserId, id); requireApprovedOperation(ownerUserId, implant.operationId); const command: SimulatedCommand = { id: `simcmd_${crypto.randomUUID()}`, implantId: id, commandClass, status: "simulated", createdAt: new Date().toISOString() }; commands.set(command.id, command); return command; }
export function listSimulatedCommands(ownerUserId: number, id: string) { getSimulatedImplant(ownerUserId, id); return [...commands.values()].filter(c => c.implantId === id); }
export function createSimulatedPhishingCampaign(ownerUserId: number, operationId: string, input: { name: string; template?: SimulatedPhishingCampaign["template"] }) { requireApprovedOperation(ownerUserId, operationId); const campaign: SimulatedPhishingCampaign = { id: `simphish_${crypto.randomUUID()}`, operationId, name: input.name.trim().slice(0, 160), template: input.template ?? "synthetic_email", status: "draft", clicks: 0, createdAt: new Date().toISOString(), simulationOnly: true }; phishingCampaigns.set(campaign.id, campaign); return campaign; }
export function getSimulatedPhishingCampaign(ownerUserId: number, id: string) { const campaign = phishingCampaigns.get(id); if (!campaign || !listRedTeamOperations(ownerUserId).some(o => o.id === campaign.operationId)) throw new Error("simulated phishing campaign not found"); return campaign; }
export function simulatePhishingSend(ownerUserId: number, id: string) { const campaign = getSimulatedPhishingCampaign(ownerUserId, id); requireApprovedOperation(ownerUserId, campaign.operationId); campaign.status = "simulated"; return { campaignId: id, delivered: false, simulated: true, targetExecutionEnabled: false as const }; }
export function recordSimulatedClick(ownerUserId: number, id: string) { const campaign = getSimulatedPhishingCampaign(ownerUserId, id); campaign.clicks += 1; return { campaignId: id, tracked: true, simulated: true, credentialCollection: false as const, clicks: campaign.clicks }; }
