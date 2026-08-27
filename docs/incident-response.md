# Incident Response and Escalation

Workspace owners and operators may create incidents. Each incident records its severity, description, creator, escalation deadline, acknowledgement, resolution note, and immutable audit events. Auditors and reviewers can read the incident ledger but cannot create, acknowledge, or resolve incidents.

| Severity | Escalation deadline |
|---|---:|
| Critical | 30 minutes |
| High | 2 hours |
| Medium | 8 hours |
| Low | 24 hours |

The existing active-workspace scheduled administrative callback evaluates overdue unresolved incidents. It records `escalatedAt` once, emits a critical Signal Center alert, and reports the escalation count in its administrative check summary. The job only reads and updates AngelMind’s own records; it does not contact program targets or invoke research tools.

An owner or operator can attach an existing evidence artifact to an incident only when the artifact is in the same workspace. The link is unique, includes its creator and timestamp, and emits an audit event. The Assurance Control page lists linked artifact references for review.
