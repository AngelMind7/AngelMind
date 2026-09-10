export const failureKinds = [
  "timeout",
  "dependency_failure",
  "partial_response",
  "error_state",
  "recovery_behavior",
  "retry_behavior",
  "concurrency",
  "race_condition",
  "transaction_failure",
  "degraded_mode",
  "cascading_failure",
] as const;
export type FailureKind = (typeof failureKinds)[number];

export type FailureObservation = {
  kind: FailureKind;
  normalState: string;
  condition: string;
  observedBehavior: string;
  impact: "none" | "low" | "medium" | "high" | "critical";
  evidenceRefs: string[];
};

export function validateFailureObservation(input: FailureObservation): FailureObservation {
  const required = [input.normalState, input.condition, input.observedBehavior];
  if (required.some(value => !value.trim())) throw new Error("Failure observation requires normal state, condition, and observed behavior.");
  if (input.evidenceRefs.some(ref => !ref.trim())) throw new Error("Failure evidence references cannot be empty.");
  return { ...input, evidenceRefs: Array.from(new Set(input.evidenceRefs.map(ref => ref.trim()))) };
}

export type AssetSnapshot = {
  assetId: string;
  version: string;
  capturedAt: string;
  attributes: Record<string, string | number | boolean | null>;
};

export type SnapshotChange = {
  key: string;
  before: AssetSnapshot["attributes"][string];
  after: AssetSnapshot["attributes"][string];
  kind: "added" | "removed" | "changed";
};

export function compareAssetSnapshots(before: AssetSnapshot, after: AssetSnapshot): SnapshotChange[] {
  if (before.assetId !== after.assetId) throw new Error("Snapshots must belong to the same asset.");
  const keys = new Set([...Object.keys(before.attributes), ...Object.keys(after.attributes)]);
  return Array.from(keys).sort().flatMap<SnapshotChange>(key => {
    const oldValue = before.attributes[key];
    const newValue = after.attributes[key];
    if (oldValue === newValue) return [];
    if (oldValue === undefined) return [{ key, before: null, after: newValue, kind: "added" as const }];
    if (newValue === undefined) return [{ key, before: oldValue, after: null, kind: "removed" as const }];
    return [{ key, before: oldValue, after: newValue, kind: "changed" as const }];
  });
}

const blockedPlaybookTaskTypePattern = /(exploit|payload|credential|password|brute|scan|attack|exfil|social|replay|shell|exec|probe)/i;

export function assertPassivePlaybookTaskType(type: string): string {
  const normalized = type.trim().toLowerCase();
  if (!normalized || normalized.length > 80 || blockedPlaybookTaskTypePattern.test(normalized)) throw new Error("Playbook task type is outside the passive research safety boundary.");
  return normalized;
}

export type PassiveAdapterFeedback = {
  adapterKey: "metadata-review" | "fingerprint-review" | "evidence-normalization";
  status: "completed";
  networkCalls: 0;
  output: Record<string, unknown>;
};

export function executePassiveAdapter(adapterKey: string, input: Record<string, unknown>): PassiveAdapterFeedback {
  const normalized = adapterKey.trim().toLowerCase();
  const safeInput = Object.fromEntries(Object.entries(input).filter(([key, value]) => key.length <= 80 && value !== undefined).slice(0, 50));
  if (normalized === "metadata-review") return { adapterKey: "metadata-review", status: "completed", networkCalls: 0, output: { reviewedKeys: Object.keys(safeInput).sort(), review: "metadata-only" } };
  if (normalized === "fingerprint-review") return { adapterKey: "fingerprint-review", status: "completed", networkCalls: 0, output: { fingerprintInput: safeInput, review: "deterministic-input-accepted" } };
  if (normalized === "evidence-normalization") return { adapterKey: "evidence-normalization", status: "completed", networkCalls: 0, output: { normalized: safeInput, review: "provider-neutral" } };
  throw new Error("Passive adapter is not registered or is outside the safety boundary.");
}

export type Playbook = {
  id: string;
  version: string;
  domains: string[];
  assetTypes: string[];
  technologies?: string[];
  taskTemplates: Array<{ type: string; title: string; priority: number; dependencies: number[] }>;
};

export function matchPlaybooks(playbooks: Playbook[], input: { domain: string; assetType: string; technology?: string }): Playbook[] {
  return playbooks.filter(playbook => {
    const domainMatch = playbook.domains.includes(input.domain) || playbook.domains.includes("*");
    const assetMatch = playbook.assetTypes.includes(input.assetType) || playbook.assetTypes.includes("*");
    const technologyMatch = !playbook.technologies?.length || (input.technology ? playbook.technologies.includes(input.technology) : false);
    return domainMatch && assetMatch && technologyMatch;
  }).sort((a, b) => a.id.localeCompare(b.id) || a.version.localeCompare(b.version));
}

export type IntelligenceFeedItem = {
  source: string;
  observedAt: string;
  assetRef: string;
  confidence: number;
  reference?: string;
  data: Record<string, unknown>;
};

export function normalizeIntelligenceFeed(input: IntelligenceFeedItem): IntelligenceFeedItem {
  if (!input.source.trim() || !input.assetRef.trim()) throw new Error("Intelligence feed requires source and asset reference.");
  if (!Number.isFinite(input.confidence) || input.confidence < 0 || input.confidence > 100) throw new Error("Intelligence confidence must be between 0 and 100.");
  return {
    source: input.source.trim().toLowerCase(),
    observedAt: new Date(input.observedAt).toISOString(),
    assetRef: input.assetRef.trim().toLowerCase(),
    confidence: Math.round(input.confidence),
    reference: input.reference?.trim() || undefined,
    data: input.data,
  };
}
