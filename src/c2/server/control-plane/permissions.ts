import type { WorkspaceRole } from "./operations";

/**
 * P6 — Permission model granular (resource + action).
 *
 * Melengkapi `access-matrix.ts` (yang sudah ada, berbasis action+intent) dengan
 * lapisan resource.action eksplisit sesuai Master Spec Section C2 — termasuk
 * permission baru `tool.approve_critical_execution` yang sebelumnya tidak ada
 * di mana pun di repo.
 *
 * Ini TIDAK mengganti role enum di database (organizationMemberRole /
 * workspaceMemberRole di drizzle/schema.ts) — role "approval_authority" di sini
 * adalah role tambahan yang perlu ditambahkan ke enum lewat migration 0054
 * sebelum benar-benar dipakai untuk authorize user sungguhan.
 */

export type ExtendedWorkspaceRole = WorkspaceRole | "approval_authority";

export type PermissionKey =
  | "tool.execute"
  | "tool.approve_critical_execution"
  | "research.create"
  | "scope.modify"
  | "audit.read";

export const PERMISSIONS: Record<PermissionKey, readonly ExtendedWorkspaceRole[]> = {
  "tool.execute": ["owner", "operator"],
  "tool.approve_critical_execution": ["owner", "approval_authority"],
  "research.create": ["owner", "operator"],
  "scope.modify": ["owner"],
  "audit.read": ["owner", "reviewer", "auditor"],
} as const;

export function hasPermission(role: ExtendedWorkspaceRole, permission: PermissionKey): boolean {
  return PERMISSIONS[permission]?.includes(role) ?? false;
}

/**
 * Guard siap pakai untuk dipanggil di procedure tRPC yang menangani approval
 * task high/critical (mis. approveResearchTask di research-workflow.ts).
 * Lempar error yang sama style-nya dengan guard lain di control-plane/*.
 */
export function assertCanApproveCriticalExecution(role: ExtendedWorkspaceRole): void {
  if (!hasPermission(role, "tool.approve_critical_execution")) {
    throw new Error("forbidden_missing_approval_authority");
  }
}
