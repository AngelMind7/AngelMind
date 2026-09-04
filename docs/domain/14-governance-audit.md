# Domain 14 — Governance & Audit

Blueprint coverage: Policy Engine, Approval Workflow, Audit Log, Compliance Mapping, Data Retention, Incident Response, Risk Register, Vendor Assessment.

The policy layer governs scope, approvals, and data handling. Approval decisions are persisted and authorization-gated. Audit entries use evidence and chain hashes so integrity can be verified. Incident lifecycle follows Open → Acknowledged → Investigating → Escalated → Resolved → Closed. Compliance frameworks exposed by the contract are SOC2, ISO27001, PCI-DSS, and GDPR.

Retention is enforced through the existing workspace retention/archive controls. Compliance, risk, and vendor assessment helpers are deterministic planning/assessment boundaries; they do not perform external security actions. High-risk offensive actions remain approval-gated and simulation-only.
