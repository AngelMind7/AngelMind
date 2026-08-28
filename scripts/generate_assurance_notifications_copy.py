import concurrent.futures
import json
from pathlib import Path

from openai import OpenAI

ROOT = Path(__file__).resolve().parents[1]
SOURCE = {
    "assurance.eyebrow": "Policy control · incident response · activation gate",
    "assurance.title": "Assurance Control",
    "assurance.description": "Every policy change and outbound-delivery activation follows a distinct-reviewer decision path. Incidents are workspace-scoped, timestamped, and retained in audit evidence.",
    "assurance.policyVersioning": "Policy versioning", "assurance.changeControl": "Change control", "assurance.policyRequestDescription": "A request remains pending until a distinct reviewer or administrator decides it. Only an approved version replaces the active workspace policy.",
    "assurance.selectWorkspace": "Select workspace", "assurance.changeSummary": "Change summary", "assurance.safeHarbor": "Safe-harbor text", "assurance.codeOfConduct": "Code of conduct", "assurance.allowlist": "Allowlist, one entry per line", "assurance.exclusions": "Exclusions, one entry per line", "assurance.requestPolicyReview": "Request policy review", "assurance.reviewNote": "Review note",
    "assurance.incidentResponse": "Incident response", "assurance.escalationLedger": "Escalation ledger", "assurance.selectIncident": "Select incident", "assurance.incidentTitle": "Incident title", "assurance.incidentDescription": "What happened, what is contained, and what requires review?", "assurance.severityLow": "Low · 24h escalation", "assurance.severityMedium": "Medium · 8h escalation", "assurance.severityHigh": "High · 2h escalation", "assurance.severityCritical": "Critical · 30m escalation", "assurance.openIncident": "Open incident", "assurance.escalationDue": "Escalation due", "assurance.acknowledge": "Acknowledge", "assurance.resolutionNote": "Resolution note",
    "assurance.reviewerEvidence": "Reviewer evidence", "assurance.policyDiffLedger": "Policy diff ledger", "assurance.changedFields": "Changed fields", "assurance.noParsableDiff": "no parsable diff", "assurance.noPolicyVersions": "No policy versions awaiting review.",
    "assurance.incidentEvidence": "Incident evidence", "assurance.traceableLinks": "Traceable links", "assurance.evidenceDescription": "Attach an existing workspace evidence artifact by ID. The server rejects artifacts from another workspace and requires incident-response access.", "assurance.evidenceArtifactId": "Evidence artifact ID", "assurance.selectIncidentForEvidence": "Select an incident to inspect evidence links.",
    "assurance.outboundGate": "Outbound delivery gate", "assurance.webhookReviews": "Webhook activation reviews", "assurance.webhookDescription": "A workspace owner must first save a confirmed HTTPS draft with a secret reference in Operations Console. A separate reviewer can approve or reject the readiness request, but this release still performs no outbound network delivery.", "assurance.workspace": "Workspace", "assurance.reviewerDecisionNote": "Reviewer decision note", "assurance.noWebhookRequest": "No webhook activation request.",
    "notifications.eyebrow": "Custom alerts · in-app delivery", "notifications.title": "Signal Center", "notifications.description": "Persistent, user-scoped alerts for governance and safety events. No external recipient or webhook is activated from this screen.", "notifications.markAllRead": "Mark all read", "notifications.deliveryLedger": "Delivery ledger", "notifications.unreadSignal": "unread signal", "notifications.unreadSignals": "unread signals", "notifications.selectToAcknowledge": "Select to acknowledge", "notifications.noRecords": "No notification records", "notifications.noRecordsDescription": "Alerts appear only after a governed event occurs; no synthetic activity has been added.",
    "notifications.eventPreferences": "Event preferences", "notifications.alertMatrix": "Alert matrix", "notifications.preferencesDescription": "In-app delivery is enabled by default. Disabling an event suppresses its inbox alert and records the result in its workspace audit trail.", "notifications.externalBoundary": "External delivery boundary", "notifications.externalBoundaryDescription": "Webhook, email, and chat integrations are intentionally unconfigured. Enabling one requires a recipient endpoint and credential managed as a secret, plus a delivery retry and signing policy.",
    "notifications.approvalRequired": "Tier 3 approval", "notifications.approvalRequiredDetail": "When a Tier 3 action is queued and blocked until human review.", "notifications.guardrailBlocked": "Guardrail block", "notifications.guardrailBlockedDetail": "When scope, conduct, budget, cooldown, or session guards stop an action.", "notifications.findingValidated": "Validated finding", "notifications.findingValidatedDetail": "When a candidate reaches validation and awaits human review.", "notifications.scheduledCheck": "Scheduled check", "notifications.scheduledCheckDetail": "Summary of safe metadata-only checks and retention review for active workspaces.", "notifications.policyReview": "Policy review", "notifications.policyReviewDetail": "When a new safe-harbor, conduct, allowlist, or exclusion version awaits review.", "notifications.incidentCreated": "Incident recorded", "notifications.incidentCreatedDetail": "When a new workspace incident is opened and receives an escalation schedule.", "notifications.webhookActivation": "Webhook activation", "notifications.webhookActivationDetail": "When a delivery draft awaits a distinct reviewer's decision.",
}
LOCALES = {"id": "Indonesian", "ms": "Malay", "ar": "Arabic", "zh-CN": "Simplified Chinese", "ja": "Japanese", "ko": "Korean", "es": "Spanish", "pt": "Portuguese", "fr": "French", "de": "German", "ru": "Russian"}
SCHEMA = {"name": "translations", "strict": True, "schema": {"type": "object", "properties": {key: {"type": "string"} for key in SOURCE}, "required": list(SOURCE), "additionalProperties": False}}

def translate(item):
    code, language = item
    response = OpenAI().chat.completions.create(
        model="gpt-5-mini",
        messages=[
            {"role": "system", "content": "You translate cybersecurity governance interface labels. Preserve safety meanings: dry-runs do not contact targets; external webhook delivery remains disabled; policy decisions require separate human review. Keep product names, HTTPS, SHA-256, URLs, values, identifiers, and user-entered records unchanged. Return only JSON."},
            {"role": "user", "content": f"Translate the following English UI strings to {language}.\n{json.dumps(SOURCE, ensure_ascii=False)}"},
        ],
        response_format={"type": "json_schema", "json_schema": SCHEMA},
        max_completion_tokens=12000,
    )
    return code, json.loads(response.choices[0].message.content)

result = {key: {"en": value} for key, value in SOURCE.items()}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
    for code, translations in executor.map(translate, LOCALES.items()):
        for key, value in translations.items():
            result[key][code] = value

for key, corrections in {
    "assurance.title": {"ar": "ضبط الضمان", "ko": "보증 제어", "de": "Sicherheitskontrolle"},
    "notifications.title": {"ar": "مركز الإشارات", "ja": "シグナルセンター", "ko": "신호 센터", "de": "Signalzentrale"},
}.items():
    result[key].update(corrections)

target = ROOT / "client/src/locales/assurance-notifications-copy.json"
target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Wrote {len(result)} explicit Assurance and Signal Center keys to {target}")
