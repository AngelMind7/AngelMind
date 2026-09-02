# Blueprint delivery backlog

Dokumen ini adalah source of truth untuk delivery bertahap terhadap blueprint. Status `Implemented` berarti ada route/API/domain/data/test yang dapat ditunjukkan di repository. Status `Partial` berarti sebagian vertical slice sudah ada tetapi lifecycle atau boundary belum lengkap. Status `Blocked` berarti implementasi memerlukan provider, secret, deployment, atau keputusan organisasi yang belum tersedia.

## Commit group A — foundation and authorization

| Area | Status awal | Target commit evidence |
|---|---|---|
| Workspace/tenant authorization matrix | Partial | Semua procedure sensitif memiliki workspace + role/ownership guard dan negative tests lintas tenant. |
| Session/device/security center | Implemented (core) | Device registration/revocation, auth events, onboarding profile, API key metadata, scoped creation, rotation, and revoke lifecycle. |
| Audit archive | Partial | Signed export batch, retention metadata, verification, dan restore drill contract. |
| Secret handling | Partial | No secret in frontend/source, secret references only, rotation/revocation metadata, tests, archive signing key separated from JWT fallback, and constant-time cron secret comparison. |
| Data lifecycle/privacy | Implemented (contract) | Export/delete/rectify request API, idempotent active-request guard, admin-gated processing lifecycle, result references, and terminal timestamps; actual export/delete worker remains environment/operations dependent. |

## Commit group B — research domain

| Area | Status awal | Target commit evidence |
|---|---|---|
| Programs and scope engine | Implemented (core) | `program-scope.ts`, normalization/overlap guard, version diff, preview API, create-program integration. |
| Research session state machine | Partial | Explicit transition rules, permission, validation, event, audit. |
| Asset intelligence | Implemented (core) | Server-derived scope validation, typed asset categories, provenance-ready metadata, and workspace isolation. |
| Task dependency graph | Implemented (presentation slice) | Dependency validation, lifecycle controls, cycle-safe deterministic graph layout, readiness indicators, and ResearchWorkspace dependency view; persistent worker orchestration remains environment/deployment dependent. |
| Failure domain | Implemented (vertical slice) | Typed validation contract, persisted `failureObservations`, workspace/session authorization, audit event, tRPC list/create procedures, and Failure Domain UI in Research Workspace. |
| Evolution and intelligence foundation | Implemented (vertical slice) | Persisted `evolutionSnapshots`, `intelligenceFeedItems`, and `playbooks` with migration, workspace-scoped list/create/compare procedures, deterministic snapshot diff, playbook matching, and feed normalization. External provider adapters and automated ingestion remain environment-dependent. |
| Observation → hypothesis → evidence → finding | Implemented (core) | Workspace-scoped observation/hypothesis flow, direct observation provenance on findings, quality gates, human-review state, and Research Workspace promotion UI are available; live provider ingestion remains environment-dependent. |
| Retest and duplicate intelligence | Implemented (core) | Duplicate candidate query, relation linking, retest evidence/result, and finding status synchronization. |

## Commit group C — reports and collaboration

| Area | Status awal | Target commit evidence |
|---|---|---|
| Report builder/versioning | Implemented (core) | Persisted draft autosave/restore, version/diff APIs, structured policy comparison rendering, preview/export contracts, and ReportStudio autosave path are available; real-time multi-user collaborative editing remains partial. |
| Submission tracking | Implemented (core) | `submissions` + `submissionEvents` migration, transition API, readiness/human-review gate. |
| Comments/mentions/review | Implemented (core) | Workspace-scoped comments, persisted mentions, in-app mention notifications, parentCommentId validation, recursive threaded rendering, and reviewer checks are available; provider delivery remains environment-dependent. |
| Notifications | Implemented (core) | Cursor polling, comment mention delivery, event preferences, bounded retry backoff, delivery ledger, and outbound safety boundary are available; provider activation remains gated. |
| Search/saved views/tags/notes | Implemented (core) | Workspace-scoped global search across findings, assets, sessions, programs, and reports. Saved views/tags/notes remain partial. |
| Knowledge graph/intelligence | Partial | Explicit relationship records and change detection signals. |

## Commit group D — AI and platform reliability

| Area | Status awal | Target commit evidence |
|---|---|---|
| Model registry/gateway health | Partial | Provider/model capability metadata plus admin health status, latency, and error metadata; live provider probes remain environment-dependent. |
| AI orchestration | Partial | Deterministic planner, role/task assignment, dependency gating, confidence-filtered synthesis, cross-check verdict, and human-review signal; provider execution and persisted agent-run graph remain environment/architecture dependent. |
| AI provenance/memory | Implemented (core) | Run trace, input/output references, workspace isolation, retention-aware output retrieval, scheduled purge worker, and expired payload deletion are available; live provider verification remains environment-dependent. |
| Job queue/retry/DLQ | Implemented (core) | Persistent claim lease recovery, retry backoff, max-attempt dead-letter, and completion/failure helpers. |
| Events/outbox/idempotency | Implemented (core) | Versioned schemaVersion, transactional persistence, dedupe/idempotency keys, bounded delivery transitions, worker dispatcher, unknown-handler dead-lettering, and admin-only failed-event replay are available; live replay drill remains environment-dependent. |
| Scheduler/realtime | Implemented (core) | Explicit administrative scheduler registry, safe metadata jobs, realtime event delivery boundaries, and worker retention/outbox recovery hooks are available; live schedule activation remains environment-dependent. |
| Cost governance/evaluation | Implemented (core) | Workspace budget ceiling, idempotent terminal billing, model health metadata, and rubric-based AI run evaluations are available; live dashboard visualization remains partial. |

## Commit group E — product surface and operations

| Area | Status awal | Target commit evidence |
|---|---|---|
| Public website | Partial | Blueprint route inventory, reviewed content, legal/trust/status boundaries, no interactive demo route, and public safety E2E checks. |
| Developer platform | Implemented (core) | Public API docs/playground routes, scoped API key create/rotation/revocation, workspace authorization, and hashed secrets. |
| Integrations | Blocked/Partial | Credential scopes, sync state, webhook/audit contracts; external activation requires secrets and review. |
| Billing/usage/invoices | Partial/Blocked | Data model and usage contracts can be implemented; payment provider activation requires account configuration. |
| Observability/incident/backup | Implemented (core) | Health/readiness/metrics endpoints, trace IDs, incident workflow, signed archive/restore contracts; provider backup drill remains deployment dependent. |
| Accessibility/performance/i18n | Implemented (core) | Localization/accessibility inventories, semantic dashboard navigation labels, lazy routes, PWA checks, vendor chunk splitting, public safety E2E, enforced bundle budgets, and manual staging axe workflow are available; live staging execution remains environment-dependent. |

## Definition of 100 percent

`100%` untuk repository berarti semua implementable contracts, database schema, server authorization, UI paths, tests, documentation, and safe disabled-by-default boundaries sudah ada. Integrations yang membutuhkan provider account, secrets, deployment DNS, payment account, or organizational legal approval akan dicatat sebagai `Blocked by environment` sampai konfigurasi tersebut diberikan; tidak akan dipalsukan sebagai aktif.
