/**
 * V4 gap-closure contracts.
 *
 * These contracts make the eight V2.1 gap fixes executable at the policy boundary
 * without turning the application into an unrestricted offensive-control plane.
 */

export const V4_GAP_IDS = [
  "proxy-egress-mesh",
  "mobile-analysis",
  "database-consolidation",
  "custom-script-safety",
  "chain-builder",
  "governed-c2",
  "client-portal",
  "agent-namespaces",
] as const;

export type V4GapId = (typeof V4_GAP_IDS)[number];

export type EgressMode = "direct" | "proxy" | "simulation";
export type MobileTier = "static" | "dynamic-queue" | "physical-device";
export type DatabasePhase = "mvp" | "growth" | "enterprise";
export type ScriptLanguage = "python" | "bash" | "go";
export type AgentNamespace = "ai" | "redteam" | "utf";

export interface EgressPolicy {
  mode: EgressMode;
  allowedTargets: string[];
  blockedPrivateRanges: boolean;
  requireApproval: boolean;
}

export interface MobileAnalysisPolicy {
  tier: MobileTier;
  queueRequired: boolean;
  timeoutMinutes: number;
  simulationOnly: boolean;
}

export interface DatabaseStrategy {
  phase: DatabasePhase;
  primary: "postgresql";
  cache: "redis";
  objectStorage: "r2";
  optionalStores: string[];
  outboxSync: boolean;
}

export interface CustomScriptPolicy {
  language: ScriptLanguage;
  maxBytes: number;
  staticAnalysisRequired: boolean;
  networkAccess: "disabled" | "allowlisted";
  privilegedRuntime: false;
}

export interface ChainStep {
  id: string;
  dependsOn: string[];
  simulationOnly: boolean;
}

export interface C2Policy {
  mode: "simulation" | "governed";
  targetExecutionEnabled: false;
  approvalRequired: true;
  auditRequired: true;
}

export type ClientRole = "executive_viewer" | "security_manager" | "compliance_officer";

export interface ClientPortalPolicy {
  role: ClientRole;
  technicalRawData: false;
  reportsRead: boolean;
  findingsSummary: boolean;
  remediationWrite: boolean;
  complianceWrite: boolean;
}

export interface AgentNamespacePolicy {
  namespace: AgentNamespace;
  publicName: string;
  operationalKind: "analyst" | "worker" | "implant" | "beacon" | "runner";
}

export function validateEgressPolicy(policy: EgressPolicy): void {
  if (!policy.allowedTargets.length) throw new Error("egress policy requires an explicit target allowlist");
  if (!policy.blockedPrivateRanges) throw new Error("private/internal ranges must remain blocked");
  if (policy.mode !== "simulation" && !policy.requireApproval) {
    throw new Error("non-simulation egress requires explicit approval");
  }
}

export function validateMobilePolicy(policy: MobileAnalysisPolicy): void {
  if (policy.timeoutMinutes <= 0 || policy.timeoutMinutes > 30) throw new Error("mobile analysis timeout must be 1-30 minutes");
  if (policy.tier !== "static" && !policy.queueRequired) throw new Error("dynamic/physical mobile analysis requires a queue");
  if (policy.tier === "physical-device" && !policy.simulationOnly) throw new Error("physical-device analysis is simulation-only in the shared runtime");
}

export function validateDatabaseStrategy(strategy: DatabaseStrategy): void {
  if (strategy.primary !== "postgresql" || strategy.cache !== "redis" || strategy.objectStorage !== "r2") {
    throw new Error("V4 database strategy must use PostgreSQL + Redis + R2 as the baseline");
  }
  if (!strategy.outboxSync) throw new Error("optional stores require outbox synchronization");
}

export function validateCustomScriptPolicy(policy: CustomScriptPolicy): void {
  if (policy.maxBytes <= 0 || policy.maxBytes > 10 * 1024 * 1024) throw new Error("custom scripts are limited to 10MB");
  if (!policy.staticAnalysisRequired) throw new Error("custom scripts require pre-execution static analysis");
  if (policy.networkAccess !== "disabled" && policy.networkAccess !== "allowlisted") throw new Error("network access must be disabled or allowlisted");
  if (policy.privilegedRuntime !== false) throw new Error("custom scripts cannot request privileged runtime access");
}

export function validateChain(steps: ChainStep[]): void {
  const ids = new Set(steps.map(step => step.id));
  if (ids.size !== steps.length) throw new Error("chain step ids must be unique");
  for (const step of steps) {
    if (!step.simulationOnly) throw new Error("V4 chain-builder steps are simulation-only by default");
    for (const dependency of step.dependsOn) if (!ids.has(dependency)) throw new Error(`unknown chain dependency: ${dependency}`);
  }
}

export function validateC2Policy(policy: C2Policy): void {
  if (policy.targetExecutionEnabled !== false || !policy.approvalRequired || !policy.auditRequired) {
    throw new Error("C2 capabilities require governed, audited simulation and cannot enable unrestricted target execution");
  }
}

export function clientPortalPolicy(role: ClientRole): ClientPortalPolicy {
  switch (role) {
    case "executive_viewer":
      return { role, technicalRawData: false, reportsRead: true, findingsSummary: true, remediationWrite: false, complianceWrite: false };
    case "security_manager":
      return { role, technicalRawData: false, reportsRead: true, findingsSummary: true, remediationWrite: true, complianceWrite: false };
    case "compliance_officer":
      return { role, technicalRawData: false, reportsRead: true, findingsSummary: true, remediationWrite: false, complianceWrite: true };
  }
}

export const AGENT_NAMESPACE_POLICIES: readonly AgentNamespacePolicy[] = [
  { namespace: "ai", publicName: "AI Analyst", operationalKind: "analyst" },
  { namespace: "ai", publicName: "Autonomous Worker", operationalKind: "worker" },
  { namespace: "redteam", publicName: "C2 Implant", operationalKind: "implant" },
  { namespace: "redteam", publicName: "C2 Beacon", operationalKind: "beacon" },
  { namespace: "utf", publicName: "UTF Runner", operationalKind: "runner" },
];
