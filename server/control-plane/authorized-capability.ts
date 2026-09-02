export type AuthorizedCapabilityPolicy = {
  target: string;
  allowlist: string[];
  exclusions: string[];
  safeHarbor: string;
  operatorId: string;
  approvedAt: string;
  expiresAt: string;
  maxRequestsPerMinute: number;
  killSwitch: boolean;
  humanApproval: boolean;
};

function normalizeHost(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return url.hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return "";
  }
}

function matches(host: string, rule: string) {
  const normalizedRule = normalizeHost(rule.replace(/^\*\./, ""));
  if (!normalizedRule) return false;
  return host === normalizedRule || host.endsWith(`.${normalizedRule}`);
}

export function validateAuthorizedCapabilityPolicy(policy: AuthorizedCapabilityPolicy, now = new Date()) {
  if (!policy || typeof policy !== "object" || !Array.isArray(policy.allowlist) || !Array.isArray(policy.exclusions)) throw new Error("Authorized capability policy is invalid.");
  if (!policy.allowlist.every(value => typeof value === "string") || !policy.exclusions.every(value => typeof value === "string")) throw new Error("Authorized capability policy is invalid.");
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error("Authorization window is invalid or expired.");
  const target = normalizeHost(policy.target);
  if (!target || !policy.allowlist.some(rule => matches(target, rule))) throw new Error("Target is outside the authorized allowlist.");
  if (policy.exclusions.some(rule => matches(target, rule))) throw new Error("Target is explicitly excluded from the authorized scope.");
  if (typeof policy.safeHarbor !== "string" || policy.safeHarbor.trim().length < 20) throw new Error("A documented safe-harbor policy is required.");
  if (typeof policy.operatorId !== "string" || !policy.operatorId.trim()) throw new Error("An accountable operator is required.");
  const approvedAt = new Date(policy.approvedAt);
  const expiresAt = new Date(policy.expiresAt);
  if (!Number.isFinite(approvedAt.getTime()) || !Number.isFinite(expiresAt.getTime()) || expiresAt <= approvedAt || now < approvedAt || now >= expiresAt) throw new Error("Authorization window is invalid or expired.");
  if (!Number.isInteger(policy.maxRequestsPerMinute) || policy.maxRequestsPerMinute < 1 || policy.maxRequestsPerMinute > 120) throw new Error("Rate limit must be between 1 and 120 requests per minute.");
  if (policy.killSwitch) throw new Error("Capability kill switch is active.");
  if (!policy.humanApproval) throw new Error("Human approval is required for authorized active capability execution.");
  return { ...policy, target, allowlist: policy.allowlist.map(normalizeHost), exclusions: policy.exclusions.map(normalizeHost) };
}
