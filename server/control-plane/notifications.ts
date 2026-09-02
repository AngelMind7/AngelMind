export const notificationEvents = ["approval_required", "guardrail_blocked", "finding_validated", "scheduled_check", "policy_review_required", "incident_created", "webhook_activation_requested", "comment_mentioned"] as const;
export type NotificationEvent = (typeof notificationEvents)[number];
export type NotificationSeverity = "info" | "warning" | "critical";

export const notificationLabels: Record<NotificationEvent, string> = {
  approval_required: "Approval Tier 3 diperlukan",
  guardrail_blocked: "Guardrail memblokir aksi",
  finding_validated: "Finding tervalidasi",
  scheduled_check: "Pemeriksaan terjadwal selesai",
  policy_review_required: "Review perubahan policy diperlukan",
  incident_created: "Incident baru tercatat",
  webhook_activation_requested: "Aktivasi webhook menunggu review",
  comment_mentioned: "Anda disebut dalam comment finding",
};

export function isInAppEnabled(event: NotificationEvent, preferences: Array<{ eventType: NotificationEvent; inAppEnabled: number }>): boolean {
  if (!notificationEvents.includes(event) || !Array.isArray(preferences)) return false;
  return preferences.find(preference => preference.eventType === event)?.inAppEnabled !== 0;
}

export function planInAppDelivery(event: NotificationEvent, preferences: Array<{ eventType: NotificationEvent; inAppEnabled: number }>): { delivered: boolean; auditSubject: "in-app-delivered" | "in-app-suppressed" } {
  return isInAppEnabled(event, preferences)
    ? { delivered: true, auditSubject: "in-app-delivered" }
    : { delivered: false, auditSubject: "in-app-suppressed" };
}

export function canAcknowledgeNotification(notificationUserId: number, actingUserId: number): boolean {
  return Number.isInteger(notificationUserId) && notificationUserId > 0 && Number.isInteger(actingUserId) && actingUserId > 0 && notificationUserId === actingUserId;
}
