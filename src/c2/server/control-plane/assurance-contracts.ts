export const escalationMinutes = { low: 1_440, medium: 480, high: 120, critical: 30 } as const;
export type IncidentSeverity = keyof typeof escalationMinutes;

export function getEscalationDueAt(severity: IncidentSeverity, now = Date.now()): Date {
  return new Date(now + escalationMinutes[severity] * 60_000);
}

export function canApplyReviewedChange(requesterId: number, reviewerId: number, isReviewer: boolean): boolean {
  return isReviewer && requesterId !== reviewerId;
}

export function isWebhookActivationReady(configuration: { endpointConfirmed: number; signingSecretReference: string | null; enabled: number }): boolean {
  return configuration.endpointConfirmed === 1 && Boolean(configuration.signingSecretReference) && configuration.enabled === 0;
}

export type PolicySnapshot = { safeHarbor: string; codeOfConduct: string; allowlist: string[]; exclusions: string[] };

export function buildPolicyDiff(previous: PolicySnapshot, next: PolicySnapshot): Record<string, { previous: string | string[]; next: string | string[] }> {
  const result: Record<string, { previous: string | string[]; next: string | string[] }> = {};
  (["safeHarbor", "codeOfConduct", "allowlist", "exclusions"] as const).forEach(field => {
    if (JSON.stringify(previous[field]) !== JSON.stringify(next[field])) result[field] = { previous: previous[field], next: next[field] };
  });
  return result;
}

export function canLinkIncidentEvidence(hasResponseAccess: boolean, evidenceWorkspaceId: number, incidentWorkspaceId: number): boolean {
  return hasResponseAccess && evidenceWorkspaceId === incidentWorkspaceId;
}
