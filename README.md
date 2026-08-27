# AngelMind Security Research Control Plane

AngelMind is an authenticated internal dashboard for governing **authorized** security research programs. It records program terms, preserves workspace isolation, runs zero-network rehearsals, maintains audit evidence, and keeps privileged activity behind a human approval gate.

## Delivered capabilities

| Area | Included behavior |
|---|---|
| Workspaces | Owner-scoped workspace and program records with safe-harbor, conduct, allowlist, exclusions, budgets, session limits, cooldown, retention, and active/paused/archive state |
| Rehearsal | Deterministic hypothetical plan with cost and duration estimate; fixed at zero network calls and tool executions |
| Governance | Tier 1/2/3 policy classification; Tier 3 creates a blocked approval record and owner notification, not execution |
| Runs and audit | Run event logs, checkpoints, SHA-256 audit evidence, timestamped decisions, and workspace-scoped artifact references |
| Findings | Deduplicated intake, lifecycle state changes, confidence/impact/report drafts, human review before reported state, and no automated submission endpoint |
| Evidence | Workspace-scoped upload to managed storage, with only a reference and SHA-256 digest retained in the database |
| Scheduling | Deployed callback for active-only metadata checks that respects cooldown and budget; it never contacts a target |
| Python foundation | Python 3.12+ core contracts, deterministic guardrails, and property-based invariant tests without active capability integrations |

## Run and verify

```bash
pnpm install
pnpm dev
pnpm check
pnpm test

cd research-service
python -m pip install -e '.[dev]'
PYTHONPATH=src pytest
```

## Documentation

Read `docs/architecture.md` for the service boundary and domain flow, `docs/tool-contracts.md` for future integration requirements, `docs/governance.md` and `docs/policy-governance.md` for approval behavior, `docs/legal-compliance.md` for audit and retention handling, `docs/operations.md` for deployment and scheduling, `docs/incident-response.md` for escalation, `docs/notifications.md` for alert delivery controls, `docs/team-access.md` for workspace roles, `docs/audit-archives.md` for recovery records, `docs/webhook-drafts.md` for the outbound delivery boundary, and `docs/readiness-roadmap.md` for the remaining production-readiness plan.

> The control plane is deliberately not an active scanner. Any future capability must be separately hosted, restricted to an authorized workspace, and unable to bypass the deterministic control-plane policy.
