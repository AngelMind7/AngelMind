# AngelMind V4.0 — Data Flow

1. User authenticates and selects organization/workspace.
2. Research, asset and program scope are resolved.
3. Proposed actions are evaluated against authorization, scope, policy and approval requirements.
4. Approved safe/simulated jobs enter the queue/runtime and emit lifecycle events.
5. Raw observations are normalized into structured evidence with provenance.
6. Findings, remediation, reports and knowledge-graph relationships are persisted.
7. Notifications and operational views consume explicit event records.

Every externally relevant action retains actor, tenant, workspace, scope, authorization decision, policy decision, approval reference, idempotency key and audit metadata. Failed governance checks fail closed and do not enqueue work.
