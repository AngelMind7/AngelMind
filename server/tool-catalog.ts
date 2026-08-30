import { generatedToolCatalog } from "./tool-catalog-data";

export type ToolRiskClass = "low" | "medium" | "high" | "critical" | "unknown";
export type ToolVerificationStatus = "provisional_from_user_pdf" | "unverified" | "verified" | "blocked";
export type ToolDisposition = "candidate_offline_or_artifact" | "candidate_passive_review" | "disabled_high_risk" | "disabled_review_required";

export type ToolCatalogEntry = {
  toolKey: string;
  name: string;
  category: string;
  riskClass: ToolRiskClass;
  approvalGate: string;
  verificationStatus: ToolVerificationStatus;
  disposition: ToolDisposition;
  enabledByDefault: boolean;
};

export const toolCatalog = generatedToolCatalog as readonly ToolCatalogEntry[];

export function listToolCatalog(input?: { category?: string; disposition?: ToolDisposition; riskClass?: ToolRiskClass }) {
  return toolCatalog.filter(tool =>
    (!input?.category || tool.category === input.category) &&
    (!input?.disposition || tool.disposition === input.disposition) &&
    (!input?.riskClass || tool.riskClass === input.riskClass),
  );
}

export function searchToolCatalog(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return toolCatalog.filter(tool => `${tool.toolKey} ${tool.name} ${tool.category}`.toLowerCase().includes(normalized));
}

export function getToolCatalogEntry(toolKey: string) {
  return toolCatalog.find(tool => tool.toolKey === toolKey);
}

export function canExecuteTool(input: {
  toolKey: string;
  mode: "offline_artifact" | "passive_readonly" | "active_nondestructive" | "privileged_or_destructive";
  scopeValidated: boolean;
  humanApproval: boolean;
}) {
  const tool = getToolCatalogEntry(input.toolKey);
  if (!tool) return { allowed: false as const, reason: "tool_not_found" as const };
  if (tool.verificationStatus !== "verified") return { allowed: false as const, reason: "tool_not_verified" as const };
  if (!input.scopeValidated) return { allowed: false as const, reason: "scope_not_validated" as const };
  if (tool.riskClass === "high" || tool.riskClass === "critical") {
    if (!input.humanApproval) return { allowed: false as const, reason: "human_approval_required" as const };
    if (input.mode !== "active_nondestructive" && input.mode !== "privileged_or_destructive") return { allowed: false as const, reason: "mode_mismatch" as const };
  }
  if (input.mode === "privileged_or_destructive") {
    if (tool.riskClass !== "critical" || !input.humanApproval) return { allowed: false as const, reason: "privileged_mode_blocked" as const };
  }
  if (input.mode === "offline_artifact" && tool.disposition !== "candidate_offline_or_artifact") return { allowed: false as const, reason: "offline_mode_not_supported" as const };
  if (input.mode === "passive_readonly" && tool.disposition !== "candidate_passive_review") return { allowed: false as const, reason: "passive_mode_not_supported" as const };
  return { allowed: true as const, tool };
}

export function getToolCatalogSummary() {
  return toolCatalog.reduce((summary, tool) => {
    summary.total += 1;
    summary.byRisk[tool.riskClass] = (summary.byRisk[tool.riskClass] ?? 0) + 1;
    summary.byDisposition[tool.disposition] = (summary.byDisposition[tool.disposition] ?? 0) + 1;
    return summary;
  }, {
    total: 0,
    byRisk: {} as Record<string, number>,
    byDisposition: {} as Record<string, number>,
  });
}
