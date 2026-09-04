# AngelMind V4 — Data Flow

1. User authenticates and selects organization/workspace.
2. Research, asset and program scope are resolved.
3. Actions pass policy, authorization and approval checks.
4. Safe execution jobs enter the queue/runtime and emit lifecycle events.
5. Raw observations are normalized into structured evidence with provenance.
6. Findings, remediation, reports and knowledge-graph relationships are persisted.
7. Notifications and operational views consume explicit event records.

All external-impact actions must retain request, actor, workspace, scope and audit metadata.
