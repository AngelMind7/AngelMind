# Production-readiness Roadmap

The current release delivers an authenticated, workspace-scoped control plane with deterministic guardrails, zero-network rehearsal, immutable-style audit records, in-app notifications, and distinct-administrator approval checks. The following items are the most important remaining steps before operating a larger team or attaching any authorized target-facing capability.

| Priority | Gap | Why it matters | Recommended next change |
|---|---|---|---|
| P0 | Role enforcement across every resource | Workspace membership and delegated reviewer access are now available, but operator and auditor permissions are not yet applied to each future task and artifact procedure. | Extend each new procedure with a workspace-role authorization check and require a named reviewer group for Tier 3. |
| P0 | Immutable external audit archive | Implemented repository contract: signed manifests, managed-storage references, retention, verification, plan-only restore, idempotent restore drills, and explicit human confirmation. Live backup provider access remains deployment-dependent. | Keep running the drill against a provisioned staging backup and retain RTO/RPO evidence. |
| P0 | Controlled external notification delivery | Implemented governed boundary: webhook draft/configuration, allowlist/review workflow, redaction/signing/retry contracts, delivery ledger, and outbound-disabled default. Live provider delivery remains intentionally inactive until secrets and review exist. | Provision an approved provider and execute the protected activation workflow. |
| P1 | Policy version comparison view | Implemented: immutable policy versions persist structured diffs, change summaries, content hashes, and workspace-scoped comparison APIs/UI. | Continue regression coverage for effective policy activation. |
| P1 | Incident post-incident review | Implemented: review templates persist root cause, action owners, due dates, closure evidence, status, and audit events. | Continue operational review cadence after deployment. |
| P1 | Authorized capability adapter sandbox | No target-facing tool is enabled, by design. | Separate a least-privilege worker with capability-specific contracts, rate limits, egress allowlists, and independent audit telemetry. |
| P2 | SSO, SCIM, and stronger session policy | The app uses authenticated accounts and roles but not enterprise identity lifecycle automation. | Integrate enterprise IdP, just-in-time role mapping, and user offboarding. |

> No target-facing capability should be connected until the P0 controls have an owner, test plan, and documented authorization path.
