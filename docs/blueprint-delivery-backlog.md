# Blueprint delivery backlog

Dokumen ini adalah source of truth untuk delivery bertahap terhadap blueprint. Status `Implemented` berarti ada route/API/domain/data/test yang dapat ditunjukkan di repository. Status `Partial` berarti sebagian vertical slice sudah ada tetapi lifecycle atau boundary belum lengkap. Status `Blocked` berarti implementasi memerlukan provider, secret, deployment, atau keputusan organisasi yang belum tersedia.

## Commit group A — foundation and authorization

| Area | Status awal | Target commit evidence |
|---|---|---|
| Workspace/tenant authorization matrix | Partial | Semua procedure sensitif memiliki workspace + role/ownership guard dan negative tests lintas tenant. |
| Session/device/security center | Partial | Security lifecycle, revocation, login history, recovery boundary, dan API key metadata memiliki contract/test. |
| Audit archive | Partial | Signed export batch, retention metadata, verification, dan restore drill contract. |
| Secret handling | Partial | No secret in frontend/source, secret references only, rotation/revocation metadata, tests. |
| Data lifecycle/privacy | Partial | Export/delete/retention request contracts and audit trail. |

## Commit group B — research domain

| Area | Status awal | Target commit evidence |
|---|---|---|
| Programs and scope engine | Implemented (core) | `program-scope.ts`, normalization/overlap guard, version diff, preview API, create-program integration. |
| Research session state machine | Partial | Explicit transition rules, permission, validation, event, audit. |
| Asset intelligence | Implemented (core) | Server-derived scope validation, typed asset categories, provenance-ready metadata, and workspace isolation. |
| Task dependency graph | Partial | Dependency validation, block/unblock, retry, cancellation, priority. |
| Observation → hypothesis → evidence → finding | Partial | Provenance links and quality gates; no direct AI-output-to-finding shortcut. |
| Retest and duplicate intelligence | Implemented (core) | Duplicate candidate query, relation linking, retest evidence/result, and finding status synchronization. |

## Commit group C — reports and collaboration

| Area | Status awal | Target commit evidence |
|---|---|---|
| Report builder/versioning | Partial | Autosave/version/diff/preview/export contracts and UI path. |
| Submission tracking | Implemented (core) | `submissions` + `submissionEvents` migration, transition API, readiness/human-review gate. |
| Comments/mentions/review | Partial | Workspace-scoped collaboration and distinct reviewer checks. |
| Notifications | Partial | Event → notification → queue/delivery/retry/failure model; outbound delivery remains gated. |
| Search/saved views/tags/notes | Implemented (core) | Workspace-scoped global search across findings, assets, sessions, programs, and reports. Saved views/tags/notes remain partial. |
| Knowledge graph/intelligence | Partial | Explicit relationship records and change detection signals. |

## Commit group D — AI and platform reliability

| Area | Status awal | Target commit evidence |
|---|---|---|
| Model registry/gateway health | Partial | Provider/model capability metadata, health, cost, latency, error state. |
| AI orchestration | Partial | Planner, task graph, assignment, aggregation, cross-check, validation, synthesis. |
| AI provenance/memory | Partial | Run trace, input/output references, scope isolation, retention. |
| Job queue/retry/DLQ | Implemented (core) | Persistent claim lease recovery, retry backoff, max-attempt dead-letter, and completion/failure helpers. |
| Events/outbox/idempotency | Partial | Versioned schemas, transactional outbox, dedupe/idempotency keys. |
| Scheduler/realtime | Partial | Safe scheduled metadata jobs and realtime event delivery boundaries. |
| Cost governance/evaluation | Implemented (core) | Workspace budget ceiling and idempotent terminal AI billing; quality/latency evaluation remains partial. |

## Commit group E — product surface and operations

| Area | Status awal | Target commit evidence |
|---|---|---|
| Public website | Partial | Blueprint route inventory, reviewed content, legal/trust/status boundaries. |
| Developer platform | Partial | Versioned read-only API docs/playground, API key scopes/rotation/revocation. |
| Integrations | Blocked/Partial | Credential scopes, sync state, webhook/audit contracts; external activation requires secrets and review. |
| Billing/usage/invoices | Partial/Blocked | Data model and usage contracts can be implemented; payment provider activation requires account configuration. |
| Observability/incident/backup | Partial | Metrics, trace IDs, incident review, backup/restore evidence, runbook. |
| Accessibility/performance/i18n | Partial | Automated checks, route-level lazy loading, localization coverage, performance budgets. |

## Definition of 100 percent

`100%` untuk repository berarti semua implementable contracts, database schema, server authorization, UI paths, tests, documentation, and safe disabled-by-default boundaries sudah ada. Integrations yang membutuhkan provider account, secrets, deployment DNS, payment account, or organizational legal approval akan dicatat sebagai `Blocked by environment` sampai konfigurasi tersebut diberikan; tidak akan dipalsukan sebagai aktif.
