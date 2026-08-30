# AngelMind Production Runbook

## Purpose

AngelMind is deployed as a governed AI security-research control plane. It assists with passive inventory analysis, evidence review, finding lifecycle management, and report drafting. It does not scan targets actively, execute exploits, replay credentials, exfiltrate data, or submit reports autonomously.

## Required environment

Railway hosts the web/API service, durable worker, cron callbacks, and the MySQL/TiDB database. Firebase is used for authentication, and Supabase is used only for private evidence storage.

Configure the platform's server-side environment through the hosting provider's secret manager. Never commit `.env` files or put secret values in source control.

| Variable | Required purpose |
| --- | --- |
| `DATABASE_URL` | Production MySQL/TiDB connection string |
| `APP_ENCRYPTION_KEY` | Application encryption/session secret |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Firebase Admin token verification |
| `VITE_FIREBASE_*` | Firebase Web Auth configuration |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` | Supabase Storage only for server-side evidence/object storage |
| `LLM_PRIMARY_API_BASE_URL`, `LLM_PRIMARY_API_KEY`, `LLM_PRIMARY_MODEL` | 9Router primary AI provider |
| `LLM_FALLBACK_API_BASE_URL`, `LLM_FALLBACK_API_KEY`, `LLM_FALLBACK_MODEL` | OmniRoute fallback AI provider |

Use separate values for development, staging, and production. Rotate application encryption, archive signing, Firebase Admin, Supabase, and AI provider credentials according to the hosting provider's policy. Never expose `SUPABASE_SERVICE_ROLE_KEY` or any AI provider key through `VITE_*`.

## Release procedure

1. Confirm the target commit is on `main` and the GitHub CI checks are green.
2. Configure the environment variables in the hosting provider.
3. Deploy the application build with `pnpm install --frozen-lockfile`, `pnpm build`, and `pnpm start` as the production lifecycle.
4. Run the schema migration against the intended production database with `pnpm db:push`. Review the generated SQL before applying it; never point this command at an unrelated database.
5. Open the deployed URL and complete the smoke test in `docs/e2e.md`.
6. Create a test workspace, upload only non-sensitive evidence, run a rehearsal, create a signed archive, verify it, and generate a restore plan. The restore operation must remain plan-only until a separately designed confirmation workflow exists.
7. Only after the smoke test succeeds should a production workspace be created from the program's official scope.

## Workspace onboarding

Record the program name, official allowlist, exclusions, safe-harbor language, code of conduct, budget, session limit, cooldown, retention, timezone, and designated reviewer. The workspace owner must verify these values against the program's current policy before any evidence is accepted.

## Incident response

If a policy mismatch, secret exposure, unauthorized artifact, or unexpected external request is observed, pause the affected workspace, preserve the audit trail, revoke exposed credentials, and create an incident record. Do not delete evidence before retention and incident owners agree on the action. Escalate target-facing concerns to the program owner through its official channel.

## Backup and restore

Create signed audit archives on a schedule appropriate for the workspace. Verify archive integrity after creation and before any restore discussion. Restore plans identify the archive and destination workspace but do not write or delete records. Test any future executor only against a separate recovery environment with an explicit human confirmation gate.

## Rollback

If a release introduces a regression, stop new workspace activity, preserve the audit records, roll back to the last known-good application commit, and re-run the smoke test. Do not roll back the database blindly; schema changes require an explicit forward migration or a reviewed restoration procedure.

## Security boundary

External platform submission remains a human action. Any proposed target-facing capability requires a new threat model, egress policy, least-privilege design, capability-specific rate limit, program authorization, independent review, and additional audit tests before implementation.

## Durable worker and migrations

After deploying the application image, apply Drizzle migrations before accepting durable AI jobs. The runtime has two processes: the web API (`node dist/index.js`) and the queue worker (`node dist/worker.js` with `RUN_WORKER=true`). The worker claims jobs with a worker identity, lease expiry, and heartbeat, recovers stale leases, retries transient failures with bounded exponential backoff, and moves exhausted jobs to `dead_letter`. Outbox consumers must claim an event/consumer receipt before applying side effects. It must use the same database, storage, and server-side LLM provider secrets as the web API; those secrets must never be placed in browser variables.

The migrations through `0029_evidence_quarantine_lifecycle.sql` add AI run lineage foreign keys, relational research task dependencies, worker lease/heartbeat fields, outbox consumer receipts, evidence quarantine lifecycle fields, `aiRunOutputs`, `searchDocuments`, and workspace foreign keys. Run the migration process during a controlled deployment window on the Railway MySQL/TiDB database, perform orphan-data and workspace-consistency preflight checks before applying foreign-key constraints, and verify existing workspace IDs. Rebuild each workspace search index through the protected `agent.rebuildSearchIndex` procedure after migration and after bulk imports.

Railway is the runtime boundary for the web API, durable worker, cron callbacks, and MySQL/TiDB database. Firebase is the authentication boundary. Supabase is used only for private evidence/object storage; its service-role credential remains server-side and is never exposed to the browser.

## Versioned API

Read-only REST endpoints are available under `/api/v1`. Health is exposed at `/api/v1/health`; workspace search is `/api/v1/workspaces/:workspaceId/search?q=...`; and AI run status is available at `/api/v1/ai-runs/:runId`. All non-health endpoints require the same Firebase bearer authentication and workspace authorization as the dashboard. Future breaking changes must use `/api/v2` rather than changing the v1 response contract.

## Automated DR rehearsal

Use `operations.runDrDrill` with a verified archive and a separate destination workspace during a scheduled recovery exercise. The drill verifies the signed archive, validates the manifest identity, returns record counts, and explicitly reports `mutationPerformed=false`. It is intentionally plan-only: a human-approved recovery executor and an isolated recovery environment are still required before records can be written.
