# Production-readiness Roadmap

The current release delivers an authenticated, workspace-scoped control plane with deterministic guardrails, zero-network rehearsal, immutable-style audit records, in-app notifications, and distinct-administrator approval checks. The following items are the most important remaining steps before operating a larger team or attaching any authorized target-facing capability.

| Priority | Gap | Why it matters | Recommended next change |
|---|---|---|---|
| P0 | Role enforcement across every resource | Workspace membership and delegated reviewer access are now available, but operator and auditor permissions are not yet applied to each future task and artifact procedure. | Extend each new procedure with a workspace-role authorization check and require a named reviewer group for Tier 3. |
| P0 | Immutable external audit archive | Signed audit manifests are stored in managed storage, but recovery drills and durable append-only external retention are not implemented. | Add signed export batches with retention review and verified restore exercises. |
| P0 | Controlled external notification delivery | In-app signals and safe webhook drafts are ready; outbound alerts remain intentionally inactive. | Add a secret-backed, allowlisted webhook provider with retry, signing, redaction, and delivery status. |
| P1 | Policy version comparison view | Immutable versions and distinct-reviewer approval are available, but visual structured diffs are not yet rendered. | Add line-by-line policy diff review with an explicit effective-at field. |
| P1 | Incident post-incident review | Incident records, acknowledgement, resolution, and idempotent escalation are available. | Add post-incident review templates, action owners, and due-date tracking. |
| P1 | Authorized capability adapter sandbox | No target-facing tool is enabled, by design. | Separate a least-privilege worker with capability-specific contracts, rate limits, egress allowlists, and independent audit telemetry. |
| P2 | SSO, SCIM, and stronger session policy | The app uses authenticated accounts and roles but not enterprise identity lifecycle automation. | Integrate enterprise IdP, just-in-time role mapping, and user offboarding. |

> No target-facing capability should be connected until the P0 controls have an owner, test plan, and documented authorization path.
