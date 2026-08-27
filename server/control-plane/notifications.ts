export const notificationEvents = ["approval_required", "guardrail_blocked", "finding_validated", "scheduled_check"] as const;
export type NotificationEvent = (typeof notificationEvents)[number];
export type NotificationSeverity = "info" | "warning" | "critical";

export const notificationLabels: Record<NotificationEvent, string> = {
  approval_required: "Approval Tier 3 diperlukan",
  guardrail_blocked: "Guardrail memblokir aksi",
  finding_validated: "Finding tervalidasi",
  scheduled_check: "Pemeriksaan terjadwal selesai",
};

export function isInAppEnabled(event: NotificationEvent, preferences: Array<{ eventType: NotificationEvent; inAppEnabled: number }>): boolean {
  return preferences.find(preference => preference.eventType === event)?.inAppEnabled !== 0;
}

export function planInAppDelivery(event: NotificationEvent, preferences: Array<{ eventType: NotificationEvent; inAppEnabled: number }>): { delivered: boolean; auditSubject: "in-app-delivered" | "in-app-suppressed" } {
  return isInAppEnabled(event, preferences)
    ? { delivered: true, auditSubject: "in-app-delivered" }
    : { delivered: false, auditSubject: "in-app-suppressed" };
}

export function canAcknowledgeNotification(notificationUserId: number, actingUserId: number): boolean {
  return notificationUserId === actingUserId;
}
