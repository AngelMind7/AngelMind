# Incident Response and Escalation

Threat classification and control ownership follow [`threat-model-register.md`](./threat-model-register.md). The register is the canonical repository record for security assumptions, residual risk, verification evidence, and review triggers.

Workspace owners and operators may create incidents. Each incident records its severity, description, creator, escalation deadline, acknowledgement, resolution note, and immutable audit events. Auditors and reviewers can read the incident ledger but cannot create, acknowledge, or resolve incidents.

| Severity | Escalation deadline |
|---|---:|
| Critical | 30 minutes |
| High | 2 hours |
| Medium | 8 hours |
| Low | 24 hours |

The existing active-workspace scheduled administrative callback evaluates overdue unresolved incidents. It records `escalatedAt` once, emits a critical Signal Center alert, and reports the escalation count in its administrative check summary. The job only reads and updates AngelMind’s own records; it does not contact program targets or invoke research tools.

An owner or operator can attach an existing evidence artifact to an incident only when the artifact is in the same workspace. The link is unique, includes its creator and timestamp, and emits an audit event. The Assurance Control page lists linked artifact references for review.

## Security handling contract

During triage, operators must preserve the incident record, relevant audit trace, evidence artifact references, job/outbox identifiers, and deployment commit before changing state. Containment must use repository controls first: disable the affected capability or feature flag, pause the relevant worker/provider path, revoke compromised credentials through the owning provider, and prevent any target-facing action. No responder may expand scope, bypass workspace authorization, or use an incident as permission for active testing.

The incident owner must classify the event against the threat-model register, identify affected workspaces and data classes, record the containment decision, and create a post-incident review. A review may be closed only after the incident is resolved and closure evidence is present. The review must document root cause, corrective actions with owners and due dates, and whether a register row, test contract, runbook, or approval policy requires an update.

## Evidence and communication rules

All evidence references must be workspace-scoped, minimally sufficient, and redacted before external sharing. Secrets, raw tokens, private keys, and unapproved target data must not be copied into incidents, audit notes, or reports. External notification and disclosure remain disabled until an approved channel, owner, signing policy, and recipient scope are verified.
