export type RoutePermission = "public" | "authenticated" | "self" | "owner" | "read-member" | "responder" | "distinct-reviewer" | "admin-or-distinct-reviewer";

/** This inventory mirrors every procedure exported by server/routers.ts. */
export const routedProcedurePermissions = {
  "auth.me": "public", "auth.logout": "public", "agent.analyzeEvidence": "authenticated", "agent.importPassiveInventory": "authenticated", "control.dashboard": "authenticated",
  "notification.list": "self", "notification.preferences": "self", "notification.setPreference": "self", "notification.markRead": "self", "notification.markAllRead": "self",
  "operations.members": "owner", "operations.addMember": "owner", "operations.removeMember": "owner", "operations.webhook": "owner", "operations.saveWebhookDraft": "owner", "operations.archives": "owner", "operations.createArchive": "owner", "operations.verifyArchive": "owner",
  "assurance.policies": "read-member", "assurance.requestPolicy": "owner", "assurance.decidePolicy": "admin-or-distinct-reviewer", "assurance.incidents": "read-member", "assurance.createIncident": "responder", "assurance.acknowledgeIncident": "responder", "assurance.resolveIncident": "responder", "assurance.incidentEvidence": "read-member", "assurance.linkIncidentEvidence": "responder", "assurance.webhookActivationRequests": "read-member", "assurance.requestWebhookActivation": "owner", "assurance.decideWebhookActivation": "admin-or-distinct-reviewer",
  "workspace.list": "authenticated", "workspace.create": "authenticated", "workspace.setStatus": "owner", "workspace.credentials": "owner", "workspace.addCredentialReference": "owner", "workspace.scheduleAdministrativeCheck": "owner",
  "rehearsal.run": "owner", "rehearsal.listRuns": "read-member",
  "governance.list": "admin-or-distinct-reviewer", "governance.requestTier3": "owner", "governance.decide": "admin-or-distinct-reviewer",
  "finding.list": "read-member", "finding.create": "owner", "finding.transition": "owner", "finding.approveReview": "owner",
  "audit.list": "read-member", "audit.evidence": "read-member", "audit.uploadEvidence": "owner",
} as const satisfies Record<string, RoutePermission>;

export function permissionNeedsWorkspaceRole(permission: RoutePermission): boolean {
  return ["owner", "read-member", "responder", "distinct-reviewer", "admin-or-distinct-reviewer"].includes(permission);
}
