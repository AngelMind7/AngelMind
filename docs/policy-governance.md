# Policy Change Governance

Policy data is immutable by version. A workspace owner submits safe-harbor text, code of conduct, allowlist, exclusions, a human-readable change summary, and the calculated content hash. The candidate version stays `pending` until a distinct global administrator or delegated workspace reviewer approves or rejects it.

Only an approved version updates the workspace’s operative safe-harbor, conduct, allowlist, and exclusions. Any previous approved version becomes `superseded`. The decision, requester, reviewer, version number, and digest are recorded in the workspace audit stream. A policy change request also produces an in-app Signal Center event that can be suppressed only through that event’s explicit preference, never by bypassing the approval gate.

The stored `diffJson` contains only changed controlled fields with their prior and proposed values. Assurance Control renders the names of these changed fields for a reviewer before the decision. The `assurance-workflows` test suite validates the pending policy, distinct-reviewer approval, incident lifecycle, overdue-escalation, and no-delivery webhook decision contracts.

## Visual verification

Assurance Control was reviewed at desktop and 375×812 mobile breakpoints. The policy-change inputs, incident response form, escalation selection, webhook activation-review ledger, neon contrast treatment, and guarded empty states remain visible and usable without horizontal overflow. No policy, incident, or webhook request fixture was created for visual testing.

The final desktop review also confirmed that the persisted policy-diff ledger and incident-evidence linking controls sit alongside the approval forms without obscuring the activation-review ledger. The operations console retains a workspace-gated empty state; no fabricated workspace record was introduced solely to fill the interface.
