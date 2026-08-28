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

## Container deployment and operations

A production-shaped container profile is included. Set secrets outside the repository, then run `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, and `JWT_SECRET` through the environment before starting the stack:

```bash
export MYSQL_PASSWORD='use-a-secret-manager-value'
export MYSQL_ROOT_PASSWORD='use-a-different-secret-manager-value'
export JWT_SECRET='use-a-long-random-secret'
docker compose up --build -d
curl http://localhost:3000/healthz
curl http://localhost:3000/readyz
curl http://localhost:3000/metrics
```

The image runs as a non-root user, uses a read-only filesystem with a temporary `/tmp`, exposes health/readiness checks, and applies baseline security headers. `infrastructure/prometheus.yml` provides a scrape configuration for the metrics endpoint. The container pipeline validates the image on pushes and pull requests but does not publish an image or handle secrets.

The public shell is installable as a PWA through `client/public/manifest.json` and uses a same-origin offline shell service worker. API routes are deliberately excluded from the cache.

## Optional Firebase Auth and Storage

Firebase is an optional supporting provider, not the primary AngelMind database. MySQL/Drizzle remains the source of truth for users, workspaces, findings, policy, audit, and evidence metadata. Set the `VITE_FIREBASE_*` values for the browser SDK and the `FIREBASE_*` values for server-side Admin token verification and Storage access. The client stays disabled when its public configuration is incomplete, and the server returns a controlled configuration error when Admin credentials are absent.

Create `firebase.json` and deploy `storage.rules` with the Firebase CLI after creating the project. The Storage rules restrict workspace evidence to authenticated users whose verified token contains the corresponding `workspaceIds` claim, cap uploads at 25 MiB, allow only reviewable MIME families, and deny updates/deletes. The application must set custom claims from a trusted server-side membership workflow; never trust a workspace ID supplied only by the browser.

For local work, use the Auth and Storage emulators configured in `firebase.json`. Do not commit service-account JSON, private keys, or populated `.env` files. The complete variable list is in `.env.example`.

## Blueprint and documentation
The supplied master blueprint is preserved at `docs/AI_Bug_Bounty_Master_Blueprint_Final.md`. Its implementation mapping, delivery status, and safety boundaries are tracked in `docs/blueprint-delivery-status.md` and `docs/master-blueprint-alignment.md`.

## Documentation

Read `docs/architecture.md` for the service boundary and domain flow, `docs/tool-contracts.md` for future integration requirements, `docs/governance.md` and `docs/policy-governance.md` for approval behavior, `docs/legal-compliance.md` for audit and retention handling, `docs/operations.md` for deployment and scheduling, `docs/incident-response.md` for escalation, `docs/notifications.md` for alert delivery controls, `docs/team-access.md` for workspace roles, `docs/audit-archives.md` for recovery records, `docs/webhook-drafts.md` for the outbound delivery boundary, and `docs/readiness-roadmap.md` for the remaining production-readiness plan.

> The control plane is deliberately not an active scanner. Any future capability must be separately hosted, restricted to an authorized workspace, and unable to bypass the deterministic control-plane policy.
