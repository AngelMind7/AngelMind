# Blueprint delivery backlog

Dokumen ini adalah source of truth untuk delivery bertahap terhadap blueprint. Status `Implemented` berarti ada route/API/domain/data/test yang dapat ditunjukkan di repository. Status `Partial` berarti sebagian vertical slice sudah ada tetapi lifecycle atau boundary belum lengkap. Status `Blocked` berarti implementasi memerlukan provider, secret, deployment, atau keputusan organisasi yang belum tersedia.

## Commit group A — foundation and authorization

| Area | Status awal | Target commit evidence |
|---|---|---|
| Workspace/tenant authorization matrix | Partial | Semua procedure sensitif memiliki workspace + role/ownership guard dan negative tests lintas tenant. |
| Session/device/security center | Implemented (core) | Device registration/revocation, auth events, onboarding profile, API key metadata, scoped creation, rotation, and revoke lifecycle. |
| Audit archive | Partial | Signed export batch, retention metadata, verification, dan restore drill contract. |
| Secret handling | Partial | No secret in frontend/source, secret references only, rotation/revocation metadata, tests. |
| Data lifecycle/privacy | Implemented (contract) | Export/delete/rectify request API, idempotent active-request guard, admin-gated processing lifecycle, result references, and terminal timestamps; actual export/delete worker remains environment/operations dependent. |

## Commit group B — research domain

| Area | Status awal | Target commit evidence |
|---|---|---|
| Programs and scope engine | Implemented (core) | `program-scope.ts`, normalization/overlap guard, version diff, preview API, create-program integration. |
| Research session state machine | Partial | Explicit transition rules, permission, validation, event, audit. |
| Asset intelligence | Implemented (core) | Server-derived scope validation, typed asset categories, provenance-ready metadata, and workspace isolation. |
| Task dependency graph | Partial | Dependency validation plus ResearchWorkspace dependency input and run/pause/retry/cancel controls; full visual DAG/worker orchestration remains partial. |
| Observation → hypothesis → evidence → finding | Partial | Evidence can now link to workspace-scoped observations/hypotheses, with quality gates; full observation-to-finding UI lifecycle remains partial. |
| Retest and duplicate intelligence | Implemented (core) | Duplicate candidate query, relation linking, retest evidence/result, and finding status synchronization. |

## Commit group C — reports and collaboration

| Area | Status awal | Target commit evidence |
|---|---|---|
| Report builder/versioning | Partial | Persisted draft autosave/restore, version/diff APIs, preview/export contracts, and ReportStudio autosave path; richer collaborative diff remains partial. |
| Submission tracking | Implemented (core) | `submissions` + `submissionEvents` migration, transition API, readiness/human-review gate. |
| Comments/mentions/review | Partial | Workspace-scoped comments, persisted mention metadata, in-app mention notifications, and distinct reviewer checks; full comment threading remains partial. |
| Notifications | Partial | Cursor polling, comment mention delivery, event preferences, and outbound boundary; provider retry/failure delivery remains gated. |
| Search/saved views/tags/notes | Implemented (core) | Workspace-scoped global search across findings, assets, sessions, programs, and reports. Saved views/tags/notes remain partial. |
| Knowledge graph/intelligence | Partial | Explicit relationship records and change detection signals. |

## Commit group D — AI and platform reliability

| Area | Status awal | Target commit evidence |
|---|---|---|
| Model registry/gateway health | Partial | Provider/model capability metadata plus admin health status, latency, and error metadata; live provider probes remain environment-dependent. |
| AI orchestration | Partial | Deterministic planner, role/task assignment, dependency gating, confidence-filtered synthesis, cross-check verdict, and human-review signal; provider execution and persisted agent-run graph remain environment/architecture dependent. |
| AI provenance/memory | Partial | Run trace, input/output references, workspace isolation, and configurable 1–3650 day retentionUntil policy; purge worker/memory retrieval remains partial. |
| Job queue/retry/DLQ | Implemented (core) | Persistent claim lease recovery, retry backoff, max-attempt dead-letter, and completion/failure helpers. |
| Events/outbox/idempotency | Partial | Versioned schemaVersion, transactional persistence, dedupe/idempotency keys, bounded delivery transitions; production dispatcher remains partial. |
| Scheduler/realtime | Partial | Safe scheduled metadata jobs and realtime event delivery boundaries. |
| Cost governance/evaluation | Partial | Workspace budget ceiling, idempotent terminal billing, model health metadata, and rubric-based AI run evaluations; live evaluation dashboards remain partial. |

## Commit group E — product surface and operations

| Area | Status awal | Target commit evidence |
|---|---|---|
| Public website | Partial | Blueprint route inventory, reviewed content, legal/trust/status boundaries, and synthetic read-only `/demo` route with passing desktop/mobile E2E safety checks. |
| Developer platform | Implemented (core) | Public API docs/playground routes, scoped API key create/rotation/revocation, workspace authorization, and hashed secrets. |
| Integrations | Blocked/Partial | Credential scopes, sync state, webhook/audit contracts; external activation requires secrets and review. |
| Billing/usage/invoices | Partial/Blocked | Data model and usage contracts can be implemented; payment provider activation requires account configuration. |
| Observability/incident/backup | Implemented (core) | Health/readiness/metrics endpoints, trace IDs, incident workflow, signed archive/restore contracts; provider backup drill remains deployment dependent. |
| Accessibility/performance/i18n | Implemented (core) | Localization/accessibility inventories, lazy routes, PWA checks, vendor chunk splitting, passing public safety E2E across desktop/mobile, and enforced JavaScript gzip/raw bundle budgets; full automated axe/Lighthouse CI remains partial. |

## Definition of 100 percent

`100%` untuk repository berarti semua implementable contracts, database schema, server authorization, UI paths, tests, documentation, and safe disabled-by-default boundaries sudah ada. Integrations yang membutuhkan provider account, secrets, deployment DNS, payment account, or organizational legal approval akan dicatat sebagai `Blocked by environment` sampai konfigurasi tersebut diberikan; tidak akan dipalsukan sebagai aktif.
