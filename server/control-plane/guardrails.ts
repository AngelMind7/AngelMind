import type { ActionKind, GovernanceTier, PolicyDecision } from "./contracts";

const actionTier: Record<ActionKind, GovernanceTier> = {
  policy_review: "tier1",
  scope_inventory: "tier1",
  coverage_plan: "tier1",
  authenticated_validation: "tier2",
  privileged_proof: "tier3",
  denial_of_service: "tier3",
  social_engineering: "tier3",
  data_exfiltration: "tier3",
};

const prohibitedConductActions = new Set<ActionKind>(["denial_of_service", "social_engineering", "data_exfiltration"]);

export function violatesCodeOfConduct(action: ActionKind, codeOfConduct: string): boolean {
  if (typeof codeOfConduct !== "string") return true;
  const policy = codeOfConduct.toLowerCase();
  if (prohibitedConductActions.has(action)) return true;
  if (action === "privileged_proof" && /(no\s+(privilege|account takeover|destructive)|no destructive)/.test(policy)) return true;
  return false;
}

const normalizeRule = (value: string) => value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");

export function ruleMatchesTarget(rule: string, target: string): boolean {
  const normalizedRule = normalizeRule(rule);
  const normalizedTarget = normalizeRule(target);
  if (!normalizedRule || !normalizedTarget) return false;
  if (normalizedRule.startsWith("*.")) {
    const suffix = normalizedRule.slice(1);
    return normalizedTarget.endsWith(suffix) && normalizedTarget.length > suffix.length;
  }
  return normalizedRule === normalizedTarget;
}

export function isTargetInScope(target: string, allowlist: string[], exclusions: string[]): boolean {
  if (typeof target !== "string" || !Array.isArray(allowlist) || !Array.isArray(exclusions) || !allowlist.every(rule => typeof rule === "string") || !exclusions.every(rule => typeof rule === "string")) return false;
  const excluded = exclusions.some(rule => ruleMatchesTarget(rule, target));
  const allowed = allowlist.some(rule => ruleMatchesTarget(rule, target));
  return allowed && !excluded;
}

export function classifyGovernanceTier(action: ActionKind): GovernanceTier {
  return actionTier[action];
}

export function evaluatePolicy(input: {
  target: string;
  allowlist: string[];
  exclusions: string[];
  safeHarbor: string;
  codeOfConduct: string;
  action: ActionKind;
  spentCents: number;
  budgetCents: number;
  elapsedMinutes: number;
  sessionLimitMinutes: number;
  dryRun: boolean;
}): PolicyDecision {
  if (!input || typeof input !== "object") throw new Error("Policy input is invalid.");
  const tier = classifyGovernanceTier(input.action);
  const reasons: string[] = [];

  if (typeof input.safeHarbor !== "string" || !input.safeHarbor.trim()) reasons.push("Safe-harbor record is required.");
  if (typeof input.codeOfConduct !== "string" || !input.codeOfConduct.trim()) reasons.push("Code-of-conduct record is required.");
  if (violatesCodeOfConduct(input.action, input.codeOfConduct)) reasons.push("Action is prohibited by the deterministic code-of-conduct policy.");
  if (!isTargetInScope(input.target, input.allowlist, input.exclusions)) {
    reasons.push("Target is not permitted by the allowlist/exclusion policy.");
  }
  if (!Number.isFinite(input.spentCents) || !Number.isFinite(input.budgetCents) || input.spentCents >= input.budgetCents) reasons.push("Budget ceiling has been reached.");
  if (!Number.isFinite(input.elapsedMinutes) || !Number.isFinite(input.sessionLimitMinutes) || input.elapsedMinutes >= input.sessionLimitMinutes) reasons.push("Session duration limit has been reached.");
  if (tier === "tier3") reasons.push("Tier 3 actions are blocked until a human approval exists.");

  return {
    allowed: reasons.length === 0,
    tier,
    networkAllowed: !input.dryRun && reasons.length === 0 && tier !== "tier3",
    reasons,
  };
}
