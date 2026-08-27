# Notification Design

AngelMind provides a persistent in-app notification center for `approval_required`, `guardrail_blocked`, `finding_validated`, and `scheduled_check` events. Alerts are user-scoped, rendered in the authenticated dashboard, can be acknowledged individually or in bulk, and have an in-app preference switch per event type.

The default is enabled. When an operator disables an event type, future in-app delivery for that type is suppressed and the suppression is recorded in the relevant workspace audit trail. When delivery is enabled, the product stores the notification record and records an `in-app-delivered` audit event. Preferences are never used to bypass the underlying control-plane guardrail or the existing owner alert.

## External delivery boundary

External channels are intentionally not active in this release. A future webhook, chat, or email integration must use a secret-managed credential, explicit recipient configuration, payload minimization, retry and dead-letter behavior, destination allowlisting, and a tamper-evident delivery log. No external endpoint is accepted from a browser form in the current release.

## Visual verification

The Signal Center was reviewed at a 375×812 mobile viewport after authentication resolved. The compact header retains an unread-indicator entry point, alert acknowledgement remains reachable, all four preference controls remain visible, and the external delivery boundary copy is legible without horizontal overflow.
