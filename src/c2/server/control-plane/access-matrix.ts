import { roleAllowsWorkspaceAccess, type WorkspaceAccessIntent, type WorkspaceRole } from "./operations";

export const exposedWorkspaceActionMatrix = [
  { action: "workspace-policy-create", intent: "manage", allowed: ["owner"] },
  { action: "workspace-status-and-credentials", intent: "manage", allowed: ["owner"] },
  { action: "team-and-webhook-draft-management", intent: "manage", allowed: ["owner"] },
  { action: "evidence-upload-and-finding-mutation", intent: "manage", allowed: ["owner"] },
  { action: "findings-runs-audit-evidence-read", intent: "read", allowed: ["owner", "operator", "reviewer", "auditor"] },
  { action: "tier3-policy-and-webhook-review", intent: "review", allowed: ["owner", "reviewer"] },
  { action: "incident-create-acknowledge-resolve", intent: "respond", allowed: ["owner", "operator"] },
] as const;

export function roleIsPermittedForExposedAction(role: WorkspaceRole, intent: WorkspaceAccessIntent): boolean {
  return roleAllowsWorkspaceAccess(role, intent);
}
