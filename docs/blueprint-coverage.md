# AngelMind Blueprint Coverage Matrix

**Sumber acuan:** `Angelmindstrukturjelas.pdf` yang diberikan pengguna. Dokumen ini membedakan implementasi nyata dari desain target. Requirement hanya boleh disebut **Implemented** bila mempunyai jalur UI/API/domain/persistence atau boundary yang sesuai; folder, komentar, dan tombol tanpa backend tidak dihitung.

**Sinkronisasi terakhir:** Setelah commit privacy lifecycle `063b25d` dan endpoint signed-download `193d1ca`. Status di bawah mencerminkan repository `main`; provider secrets, migration production, deployment, dan smoke test live tetap berstatus environment-dependent.

## Status ringkas

Repository saat ini adalah control plane terintegrasi yang aman untuk workflow workspace, policy, rehearsal offline, findings, evidence, reports, audit, incidents, notifications, dan operations. Blueprint PDF mendeskripsikan platform end-to-end yang lebih luas. Matrix ini menjadi daftar kerja resmi untuk menutup gap tanpa membuat demo/dummy.

| Status | Arti |
|---|---|
| **Implemented** | Ada implementasi nyata dan test/boundary yang relevan. |
| **Partial** | Sebagian alur nyata tersedia, tetapi belum memenuhi seluruh acceptance criteria PDF. |
| **Planned** | Belum ada implementasi production yang boleh disebut selesai. |
| **Deferred** | Sengaja tidak diaktifkan karena safety, legal, atau kebutuhan infrastruktur belum terpenuhi. |

## Requirement 1–23: platform, identity, workspace, dan research foundation

| No. | Requirement | Status | Bukti/gap utama |
|---:|---|---|---|
| 1 | Prinsip utama dan capability chain | **Partial** | Jalur UI–API–authz–validation–domain–DB/storage–audit sudah ada untuk core; event/worker/AI penuh belum merata. |
| 2 | Website public | **Partial** | Product, features, docs, trust, security, pricing, legal, status, contact, academy, roadmap, changelog tersedia; blog/program/researcher public belum menjadi fitur penuh. |
| 3 | Authentication | **Partial** | Firebase Google Sign-In, token verification, session, logout tersedia; register/email verification/password reset/MFA/passkey belum lengkap. |
| 4 | Account security | **Partial** | Device registry, login/security event ledger, API key lifecycle, revocation, and security page are implemented; MFA/passkey/connected-app recovery remains incomplete. |
| 5 | User profile | **Partial** | Identitas dasar tersedia; profil researcher, skill, reputation, achievements, privacy controls belum lengkap. |
| 6 | Onboarding | **Partial** | Workspace onboarding dan policy gate tersedia; lifecycle register–verify–profile–preferences–security setup belum end-to-end. |
| 7 | Organization/workspace | **Partial** | Workspace, membership, owner/operator/reviewer/auditor, isolation, settings, audit tersedia; organization/team hierarchy penuh belum. |
| 8 | Authorization | **Partial** | Workspace access matrix dan role checks tersedia; resource/action/ownership matrix belum diterapkan ke semua domain future. |
| 9 | Dashboard command center | **Partial** | Dashboard real berbasis MySQL dan workflow metrics tersedia; intelligence/AI activity/reports aggregate belum lengkap. |
| 10 | Programs | **Partial** | `programName` melekat pada workspace; program discovery/recommended/saved/following/history belum menjadi domain terpisah. |
| 11 | Scope engine | **Implemented** | Allowlist, exclusions, safe harbor, conduct, retention, budget, cooldown, policy validation tersedia. |
| 12 | Scope change detection | **Implemented** | Snapshot, digest, diff/change notification, audit, dan scheduled metadata check tersedia. |
| 13 | Research workspace | **Partial** | Workspace, inventory, findings, evidence, runs, audit, coverage, and scoped AI memory are available; asset graph and richer research-context synthesis remain incomplete. |
| 14 | Research session | **Partial** | Run/rehearsal tersedia; entity `ResearchSession` dengan lifecycle PDF belum menjadi domain terpisah. |
| 15 | State machine | **Implemented** | Transition rules dan approval/validation gates tersedia untuk workspace, runs, findings, policy, incidents, webhook. |
| 16 | Asset intelligence | **Partial** | Passive assets/import dan scope filtering tersedia; relationship graph domains/technologies/services belum. |
| 17 | Attack-surface model | **Deferred** | Tidak ada active discovery; model relasional offline belum lengkap. |
| 18 | Task engine | **Partial** | Rehearsal planning dan scheduled metadata checks ada; task persistence/status worker penuh belum. |
| 19 | Task dependency graph | **Partial** | Dependency validation, deterministic cycle-safe graph/readiness layout, task status transitions, and Research Workspace visualization are implemented; durable parallel worker orchestration remains incomplete. |
| 20 | Hypothesis engine | **Partial** | AI evidence analyst mengeluarkan hypotheses; lifecycle persisted PROPOSED–VALIDATED belum. |
| 21 | Observation engine | **Partial** | Passive inventory dan evidence intake ada; entity Observation terpisah sebelum hypothesis/evidence/finding belum. |
| 22 | Evidence vault | **Implemented** | Upload validation, workspace authorization, SHA-256 reference, Supabase storage, metadata, audit tersedia; quarantine/security scan penuh belum. |
| 23 | Evidence provenance | **Partial** | Storage reference/hash/audit and multi-event provenance records are implemented; full source–acquisition–transformation lineage semantics remain incomplete. |

## Requirement 24–46: findings, reports, collaboration, API, dan integrations

| No. | Requirement | Status | Bukti/gap utama |
|---:|---|---|---|
| 24 | Finding engine | **Implemented** | Finding lifecycle, severity/confidence/impact, human review, duplicate fingerprint, workspace isolation tersedia. |
| 25 | Finding quality gate | **Implemented** | Completeness, evidence, scope, duplicate, validation, review gate tersedia; UI quality checklist dapat diperdalam. |
| 26 | Duplicate intelligence | **Partial** | Fingerprint duplicate prevention tersedia; similarity search dan candidate historical matches belum. |
| 27 | Report builder | **Implemented** | Compose, validate, save versions, preview/export Markdown/JSON, evidence references tersedia. |
| 28 | Report version control | **Implemented** | `reportVersions` menyimpan versi, creator, content, validation state, dan timestamps. |
| 29 | Submission tracking | **Deferred** | External submission tidak diaktifkan; status preparation/internal review tersedia secara terbatas. |
| 30 | Retest | **Partial** | `findingRetests`, retest evidence/result, relation linking, status synchronization, and Findings UI request/result workflow are implemented; richer OPEN → VERIFIED_FIXED/STILL_PRESENT state semantics and evidence upload integration remain incomplete. |
| 31 | Knowledge graph | **Partial** | Workspace-scoped relationship/evidence/finding records, search documents, and intelligence feed persistence exist; generic graph nodes/edges/traversal/temporal provenance engine remains incomplete. |
| 32 | Intelligence center | **Partial** | Coverage dan analytics tersedia; correlation, historical intelligence, recommendation center belum. |
| 33 | Change detection | **Implemented** | Workspace policy/configuration change detection tersedia; asset/technology change belum. |
| 34 | Global search | **Implemented (repository)** | `searchDocuments`, rebuild/index persistence, permission-aware ranked API/UI, deterministic vector-style semantic retrieval, unified cross-domain UI, saved views, workspace notes/AI memory coverage, mutation indexing, delete/reindex consistency, facets, filters, and cursor pagination are implemented. |
| 35 | Command palette | **Implemented** | Ctrl/Cmd+K authenticated navigation tersedia. |
| 36 | Saved views | **Implemented** | Workspace/user-scoped saved query and JSON filter persistence, authorization, audit event, migration, API, and authenticated UI tersedia. |
| 37 | Tagging | **Partial** | Workspace-scoped tag schema, create/update, assignment, unassignment, authorization, audit boundary, API, UI, and entity assignment are implemented; richer domain taxonomy and full cross-domain tag filtering remain open. |
| 38 | Notes | **Partial** | Workspace notes schema, workspace/entity assignment, visibility, create/edit/delete lifecycle, authorization, search indexing, API, UI, and tests are implemented; richer personal/research/program/asset/evidence note taxonomy remains open. |
| 39 | Collaboration | **Partial** | Membership, workspace roles, assignment dasar, comments/mentions, threaded finding comments, review room UI, organization invitation schema/token lifecycle/API/UI foundation are implemented; invitation email wiring, activity feed, and full organization/team hierarchy remain open. |
| 40 | Review system | **Partial** | Human approval dan finding review tersedia; peer-review/security-review sequence umum belum. |
| 41 | Notification | **Partial** | In-app notifications/preferences, cursor polling, mention delivery, safe webhook boundary, and notification audit are implemented; generic notification queue, email delivery integration, retry/failure status, and unsubscribe lifecycle remain open. |
| 42 | Reputation | **Planned** | Metrics internal ada; reputation, specialization, achievement belum menjadi domain. |
| 43 | API platform | **Partial** | tRPC dan public `/api/v1` read endpoints with versioned response envelopes are available; developer SDK, CLI, and docs platform remain open. |
| 44 | API security | **Implemented (repository)** | Authz, validation, audit, body limits, API-key hashing, explicit REST scopes, rotation, bounded API rate limiting, trusted-proxy-aware client keys, and abuse cooldowns are implemented; distributed quota coordination remains environment-dependent. |
| 45 | Webhook engine | **Partial** | Draft, HTTPS confirmation, signing reference, activation approval tersedia; dispatcher/delivery/retry/backoff belum aktif. |
| 46 | Integrations | **Planned** | GitHub/GitLab/Slack/Discord/custom integration lifecycle belum menjadi fitur production. |

## Requirement 47–65: AI, jobs, events, dan reliability

| No. | Requirement | Status | Bukti/gap utama |
|---:|---|---|---|
| 47 | AI center | **Partial** | 9Router primary, OmniRoute fallback, model registry/run trace/cost/evaluation foundations are implemented; complete multi-provider capability routing remains incomplete. |
| 48 | Model registry | **Partial** | Persisted model registry, health, capability/cost metadata, and evaluation foundations exist; full provider inventory and routing policy remain incomplete. |
| 49 | AI orchestrator | **Partial** | Planner/decomposer/task graph, dependency-aware task persistence, durable orchestration job enqueue, worker execution contract, and bounded aggregation primitives are implemented; full parallel provider execution and synthesis pipeline remain incomplete. |
| 50 | AI failure isolation | **Partial** | Provider fallback, provider-specific fallback model, bounded transient retry statuses, and bounded error handling are implemented; partial result/context overflow/contradiction handling remains incomplete. |
| 51 | AI run trace | **Implemented (repository)** | AI run entity, gateway/model references, usage, cost ceiling, outputs, retention, persisted trace correlation, and evaluation linkage are implemented; provider-level distributed propagation remains adapter/environment dependent. |
| 52 | AI provenance | **Partial** | AI output disimpan sebagai finding/report draft; lineage task–run–model–input–output belum. |
| 53 | AI context | **Partial** | Workspace context dikirim ke evidence flow; hierarchical context isolation lengkap belum. |
| 54 | AI memory | **Implemented (repository)** | User-private, workspace, research-session, and workspace-linked program memory are persisted with strict scope validation, owner/workspace authorization, revision-safe updates, archive lifecycle, retention purge, worker integration, and workspace search indexing. Provider-level context injection remains an extension. |
| 55 | AI result pipeline | **Partial** | Structured JSON output dan validation tersedia; normalize/deduplicate/correlate/synthesis pipeline belum. |
| 56 | AI evaluation | **Implemented (repository)** | Persisted reviewer evaluations support rubric, bounded score, verdict, notes, reviewer identity, idempotent upsert, workspace access checks, and an operations dashboard with evaluated-run coverage, average score, verdict distribution, and recorded cost. Latency/regression baselines and provider-specific quality feeds remain optional extensions. |
| 57 | Prompt management | **Planned** | Prompt masih berada pada source code; versioned prompt registry belum. |
| 58 | AI cost governance | **Partial** | Budget/workspace/session controls ada; provider usage, per-user/task budget, runaway detection belum. |
| 59 | Job system | **Partial** | Durable job/outbox foundations, centralized enqueue contract, scheduled maintenance, rehearsal records, orchestration task queueing, and worker contracts exist; remaining domain-wide coverage is limited to intentional ledger writes and provider-specific integrations. |
| 60 | Job reliability | **Partial** | Retry, lease, failed/dead-letter status, and worker safety contracts exist; production multi-process reliability and operational alerting remain incomplete. |
| 61 | Scheduler | **Partial** | Administrative scheduled check tersedia; general scheduler belum. |
| 62 | Real-time | **Planned** | UI memakai request refresh; event-driven real-time updates belum. |
| 63 | Event architecture | **Partial** | Audit/notification events domain ada; versioned event schemas/publishers/consumers belum. |
| 64 | Outbox pattern | **Partial** | Versioned outbox schema, event records, leases, consumer receipts, retry/backoff, and bounded dispatcher exist; complete production publisher/consumer coverage and operational delivery monitoring remain incomplete. |
| 65 | Idempotency | **Partial** | Centralized jobs/outbox enforce bounded keys, unique persistence, duplicate replay, and payload-collision rejection; domain-wide mutation coverage remains incomplete. |

## Requirement 66–89: data, security, admin, billing

| No. | Requirement | Status | Bukti/gap utama |
|---:|---|---|---|
| 66 | Database | **Implemented** | MySQL/Drizzle schema dan forward migrations tersedia. |
| 67 | Database integrity | **Partial** | Research session/asset/observation/hypothesis/task, finding relation/retest, evidence link, multi-event provenance foreign keys, and finding remediation metadata are enforced through forward migrations `0024` and `0056`; complete data preflight/load verification remains deployment work. |
| 68 | Concurrency | **Partial** | Optimistic revision checks now cover research, findings, remediation, and retest requests; generic middleware-wide conflict handling and distributed multi-process locks remain incomplete. |
| 69 | Pagination | **Partial** | Workspace-scoped list queries and cursor pagination for global search are implemented with deterministic timestamp/ID continuation; remaining domain-wide adoption is incomplete. |
| 70 | Cache | **Deferred** | Belum ada cache layer; tidak ditambahkan tanpa workload requirement dan invalidation design. |
| 71 | Data consistency | **Partial** | MySQL source of truth dan derived analytics ada; explicit consistency classification belum. |
| 72 | File storage | **Implemented** | Supabase Storage backend upload/signed URL, metadata MySQL, hash, audit tersedia. |
| 73 | Search index | **Partial** | Workspace-scoped `searchDocuments` index, rebuild/reindex, permission checks, query scoring, entity-type/freshness filters, REST read-only search, saved views, workspace notes/knowledge/report-draft/finding/evidence/AI-memory mutation indexing, stale-entity delete cleanup, and cursor pagination are implemented; semantic retrieval and unified cross-domain search UI remain open. |
| 74 | Data lifecycle | **Partial** | Workspace retention/status metadata, AI memory retention purge, and account export/delete worker lifecycle are implemented, including private JSON artifact storage and transactional account-scoped deletion; full entity-wide retention purge and collaborative-resource transfer/archive workflows remain incomplete. |
| 75 | Privacy | **Partial** | Retention, workspace isolation, legal surfaces, privacy request state machine, privacy center UI, durable export/delete processing, owner guard, private export artifact, owner-only signed download, and request audit events are implemented; integration drills and complete data-access/deletion coverage remain open. |
| 76 | Abuse protection | **Partial** | Body limits, safe boundaries, allowlists, route-specific API rate limiting, credential-safe client keys, repeated-violation cooldowns, and no target execution are implemented; upload malware provider and behavioral/account-abuse detection remain open. |
| 77 | Security architecture | **Partial** | Auth, authz, scope, audit, CSP, secure cookies, safe execution boundary ada; complete threat model/response system belum. |
| 78 | Secret management | **Implemented** | Secret hanya lewat runtime env; service-role/API keys tidak dibundel frontend; rotation workflow belum. |
| 79 | Encryption | **Partial** | TLS/security headers dan managed at-rest providers; sensitive-field/key management design belum. |
| 80 | Audit log | **Implemented** | Append-oriented audit records, hash references, signed archive/verification planning tersedia. |
| 81 | Security headers | **Implemented** | HSTS production, CSP, frame/content/referrer/permissions policies, secure cookies tersedia. |
| 82 | Threat modeling | **Implemented (repository)** | `docs/threat-model-register.md` memetakan aset, trust boundary, threat scenario, severity, kontrol repository, evidence, residual risk, owner, status, dan review triggers; live deployment evidence tetap dipisahkan. |
| 83 | Break-glass access | **Planned** | Belum ada temporary emergency privilege dengan expiry/audit. |
| 84 | Admin console | **Partial** | Operations admin/assurance tersedia; admin users/orgs/abuse/AI/billing/flags/infrastructure penuh belum. |
| 85 | Admin privilege separation | **Partial** | Owner/reviewer/operator/auditor tersedia; granular admin privilege families belum. |
| 86 | Feature flags | **Implemented (repository)** | Fail-closed `FEATURE_FLAGS` parsing mendukung environment, organization, user, entitlement, deterministic rollout, dan kill-switch evaluation dengan unit tests. |
| 87 | Configuration management | **Implemented (repository)** | Typed runtime environment groups, validation, bounded defaults, audit-state encryption key validation, required-binary readiness configuration, dan feature-flag separation tersedia; secret provisioning/rotation tetap environment-dependent. |
| 88 | Billing | **Deferred** | Pricing bersifat informational; payment/invoice/credit flow sengaja belum aktif. |
| 89 | Entitlement engine | **Deferred** | Belum ada plan entitlement karena billing belum diaktifkan. |

## Requirement 90–115: operations, frontend, testing, dan definition of done

| No. | Requirement | Status | Bukti/gap utama |
|---:|---|---|---|
| 90 | Observability | **Partial** | Health, readiness, Prometheus process/purge/HTTP counters, latency/error/slow-request signals, logs, and audit are implemented; distributed traces, alert delivery, and SLO dashboards remain open. |
| 91 | Traceability | **Partial** | tRPC context now propagates bounded `x-request-id` and `x-trace-id` response headers with generated UUID fallback; resource/job/AI/database correlation fields remain to be threaded through every workflow. |
| 92 | Incident management | **Implemented (repository)** | Incident create/acknowledge/resolve, escalation, evidence links, audit, and structured post-incident review with summary, root cause, action items, owner/due date, closure evidence, and open/closed lifecycle are implemented; production incident integration remains deployment dependent. |
| 93 | Status page | **Partial** | Public posture/status disclosure ada; live component telemetry belum. |
| 94 | Disaster recovery | **Partial** | Signed archive, verify, restore plan ada; tested restore execution/recovery environment belum. |
| 95 | Migration | **Implemented** | Drizzle forward migrations, deploy/runbook, validation tersedia. |
| 96 | CI/CD | **Partial** | CI check/test/build/security workflows ada; staging/smoke/production promotion belum lengkap. |
| 97 | Supply-chain security | **Partial** | Lockfile, dependency review/security workflow, container hardening ada; SBOM/signing/DAST penuh belum. |
| 98 | Testing | **Partial** | Unit/integration/property/E2E/Python tests dan public accessibility axe smoke suite ada; authenticated security/accessibility/performance/DR suites lengkap belum. |
| 99 | Critical E2E | **Partial** | Login/dashboard/workspace/policy/rehearsal/finding/evidence/report core ada; finding notification/remediation/retest/resolution persistence is now covered at the state-machine contract level, while browser-level full program–research–retest coverage remains open. |
| 100 | Frontend architecture | **Partial** | React/Vite route shells, pages, components, contexts, locales ada; target feature-folder split belum. |
| 101 | Design system | **Partial** | Shared Radix/Tailwind components, semantic states, responsive shell ada; full token/a11y system belum. |
| 102 | UI state | **Implemented** | Loading/error/empty/offline/protected states tersedia pada core surfaces. |
| 103 | Responsive | **Implemented** | Desktop/mobile layouts dan PWA shell tersedia; route-specific data-card optimization dapat diperluas. |
| 104 | Accessibility | **Partial** | Keyboard navigation, labels, focus-aware components, serta automated axe smoke tests untuk public routes pada desktop/mobile tersedia; authenticated WCAG coverage dan full remediation register masih terbuka. |
| 105 | Internationalization | **Implemented** | 20 locale, timezone, RTL, locale fallback dan tests tersedia. |
| 106 | SEO | **Partial** | Title/manifest/public content ada; complete metadata/robots/sitemap/structured data belum. |
| 107 | Performance | **Partial** | Lazy routes/PWA/cache ada; bundle masih memberi warning chunk besar dan performance budget belum. |
| 108 | Database performance | **Partial** | Index dasar dan bounded queries ada; query profiling/load benchmark belum. |
| 109 | Email system | **Partial** | Generic SMTP adapter, typed environment configuration, invitation/reset/verification templates, Indonesian/English locale fallback, durable `emailDeliveries` ledger, idempotent enqueueing, retry-compatible worker status, and organization invitation queue wiring are implemented; password/reset/verification flow wiring, unsubscribe, and provider-level verification remain open. |
| 110 | Documentation | **Partial** | README, architecture, governance, runbook, alignment, roadmap tersedia; API/domain/operator docs lengkap belum. |
| 111 | Repository final | **Partial** | Runtime provider-neutral sudah dipakai: Firebase Auth, Supabase Storage, Railway-ready API, serta CI GitHub; remaining domain gaps tercatat di matrix ini. |
| 112 | Aturan tim | **Implemented** | Safety boundary dan definition of done terdokumentasi; automation enforcement dapat diperluas. |
| 113 | Definition of done | **Partial** | Checklist terdokumentasi; belum semua future domain memenuhi seluruh checklist. |
| 114 | Scope/authorization principle | **Implemented** | Scope → authorization → rehearsal → evidence → finding → report dijaga; target execution tetap diblokir. |
| 115 | Definisi AngelMind | **Partial** | Sudah menjadi governed AI security-research control plane; belum menjadi platform end-to-end penuh seperti seluruh target blueprint. |

## Urutan implementasi yang wajib

Pekerjaan lanjutan harus dilakukan sebagai vertical slice, dengan urutan **identity/account security → organization/authorization → program/scope/research session → assets/tasks/observations → evidence provenance/finding/retest/report → search/knowledge graph/collaboration → AI orchestration/jobs/events → privacy/abuse/observability/DR → frontend/accessibility/CI/E2E**.

Tidak boleh menutup item hanya dengan menambah route atau folder. Setiap item yang dinyatakan selesai harus mempunyai schema/migration bila menyimpan data, server-side authorization, validation, audit event, error/loading/empty state, test, documentation, dan deployment verification. Target-facing scanning, exploitation, credential replay, serta autonomous external submission tetap **Deferred** dan memerlukan design/security/legal review terpisah.

## Incremental implementation update — 2026-09-01

The repository now includes fail-closed runtime feature flags (`FEATURE_FLAGS`) with environment, organization, user, entitlement, rollout, and kill-switch evaluation; reusable bounded cursor pagination and request fingerprints; revision counters and expected-revision checks for research session/task transitions via migration `0042_research_revision_counters`; cursor-paginated `research.sessionsPage` and `research.tasksPage` procedures; race-safe idempotency reconciliation for jobs/outbox inserts; and a passive-only playbook task-type validator. These additions reduce the gaps in requirements 68, 69, 73, 86, 90–91, and 96–98, but live deployment and full domain adoption remain required before marking those requirements fully implemented.

The email delivery gap is now partially closed with migration `0043_email_delivery_ledger`, a durable `emailDeliveries` ledger, idempotent enqueueing, provider message tracking, retry-compatible failure state, and a registered `email.deliver` worker handler. Full invitation/password/auth flow wiring and provider-level delivery verification remain deployment and integration work.
