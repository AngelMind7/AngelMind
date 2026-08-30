# AngelMind Blueprint Coverage Matrix

**Sumber acuan:** `Angelmindstrukturjelas.pdf` yang diberikan pengguna. Dokumen ini membedakan implementasi nyata dari desain target. Requirement hanya boleh disebut **Implemented** bila mempunyai jalur UI/API/domain/persistence atau boundary yang sesuai; folder, komentar, dan tombol tanpa backend tidak dihitung.

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
| 13 | Research workspace | **Partial** | Workspace, inventory, findings, evidence, runs, audit, coverage tersedia; asset graph, hypothesis, observation, memory belum lengkap. |
| 14 | Research session | **Partial** | Run/rehearsal tersedia; entity `ResearchSession` dengan lifecycle PDF belum menjadi domain terpisah. |
| 15 | State machine | **Implemented** | Transition rules dan approval/validation gates tersedia untuk workspace, runs, findings, policy, incidents, webhook. |
| 16 | Asset intelligence | **Partial** | Passive assets/import dan scope filtering tersedia; relationship graph domains/technologies/services belum. |
| 17 | Attack-surface model | **Deferred** | Tidak ada active discovery; model relasional offline belum lengkap. |
| 18 | Task engine | **Partial** | Rehearsal planning dan scheduled metadata checks ada; task persistence/status worker penuh belum. |
| 19 | Task dependency graph | **Partial** | Dependency validation, deterministic cycle-safe graph/readiness layout, task status transitions, and Research Workspace visualization are implemented; durable parallel worker orchestration remains incomplete. |
| 20 | Hypothesis engine | **Partial** | AI evidence analyst mengeluarkan hypotheses; lifecycle persisted PROPOSED–VALIDATED belum. |
| 21 | Observation engine | **Partial** | Passive inventory dan evidence intake ada; entity Observation terpisah sebelum hypothesis/evidence/finding belum. |
| 22 | Evidence vault | **Implemented** | Upload validation, workspace authorization, SHA-256 reference, Supabase storage, metadata, audit tersedia; quarantine/security scan penuh belum. |
| 23 | Evidence provenance | **Partial** | Storage reference/hash/audit ada; source–acquisition–transformation lineage penuh belum. |

## Requirement 24–46: findings, reports, collaboration, API, dan integrations

| No. | Requirement | Status | Bukti/gap utama |
|---:|---|---|---|
| 24 | Finding engine | **Implemented** | Finding lifecycle, severity/confidence/impact, human review, duplicate fingerprint, workspace isolation tersedia. |
| 25 | Finding quality gate | **Implemented** | Completeness, evidence, scope, duplicate, validation, review gate tersedia; UI quality checklist dapat diperdalam. |
| 26 | Duplicate intelligence | **Partial** | Fingerprint duplicate prevention tersedia; similarity search dan candidate historical matches belum. |
| 27 | Report builder | **Implemented** | Compose, validate, save versions, preview/export Markdown/JSON, evidence references tersedia. |
| 28 | Report version control | **Implemented** | `reportVersions` menyimpan versi, creator, content, validation state, dan timestamps. |
| 29 | Submission tracking | **Deferred** | External submission tidak diaktifkan; status preparation/internal review tersedia secara terbatas. |
| 30 | Retest | **Partial** | `findingRetests`, retest evidence/result, relation linking, and status synchronization are implemented; full retest UI and end-to-end OPEN → VERIFIED_FIXED/STILL_PRESENT flow remain incomplete. |
| 31 | Knowledge graph | **Partial** | Workspace-scoped relationship/evidence/finding records, search documents, and intelligence feed persistence exist; generic graph nodes/edges/traversal/temporal provenance engine remains incomplete. |
| 32 | Intelligence center | **Partial** | Coverage dan analytics tersedia; correlation, historical intelligence, recommendation center belum. |
| 33 | Change detection | **Implemented** | Workspace policy/configuration change detection tersedia; asset/technology change belum. |
| 34 | Global search | **Partial** | `searchDocuments` and rebuild/index persistence exist; permission-aware search UI and complete cross-domain query coverage remain incomplete. |
| 35 | Command palette | **Implemented** | Ctrl/Cmd+K authenticated navigation tersedia. |
| 36 | Saved views | **Planned** | Belum ada saved query/view persistence. |
| 37 | Tagging | **Planned** | Belum ada tag domain untuk technology, area, class, severity, program, custom. |
| 38 | Notes | **Partial** | Finding comments tersedia; personal/research/program/asset/evidence notes belum. |
| 39 | Collaboration | **Partial** | Membership, assignment dasar, finding comments tersedia; invitation, mentions, review/activity penuh belum. |
| 40 | Review system | **Partial** | Human approval dan finding review tersedia; peer-review/security-review sequence umum belum. |
| 41 | Notification | **Partial** | In-app notifications/preferences dan safe webhook draft tersedia; queue/retry/email delivery belum. |
| 42 | Reputation | **Planned** | Metrics internal ada; reputation, specialization, achievement belum menjadi domain. |
| 43 | API platform | **Partial** | tRPC API nyata tersedia; public `/api/v1`, developer keys, SDK, CLI, docs platform belum. |
| 44 | API security | **Partial** | Authz, validation, audit, body limits tersedia; API-key hashing/scopes/quota/rotation belum. |
| 45 | Webhook engine | **Partial** | Draft, HTTPS confirmation, signing reference, activation approval tersedia; dispatcher/delivery/retry/backoff belum aktif. |
| 46 | Integrations | **Planned** | GitHub/GitLab/Slack/Discord/custom integration lifecycle belum menjadi fitur production. |

## Requirement 47–65: AI, jobs, events, dan reliability

| No. | Requirement | Status | Bukti/gap utama |
|---:|---|---|---|
| 47 | AI center | **Partial** | 9Router primary, OmniRoute fallback, model registry/run trace/cost/evaluation foundations are implemented; complete multi-provider capability routing remains incomplete. |
| 48 | Model registry | **Partial** | Persisted model registry, health, capability/cost metadata, and evaluation foundations exist; full provider inventory and routing policy remain incomplete. |
| 49 | AI orchestrator | **Partial** | Evidence analysis terstruktur tersedia; planner/decomposer/task graph/parallel aggregation belum. |
| 50 | AI failure isolation | **Partial** | Provider fallback dan bounded error handling tersedia; partial result/context overflow/contradiction handling belum penuh. |
| 51 | AI run trace | **Partial** | AI run entity, gateway/model references, usage, cost ceiling, outputs, retention, and evaluation foundations exist; distributed request correlation remains incomplete. |
| 52 | AI provenance | **Partial** | AI output disimpan sebagai finding/report draft; lineage task–run–model–input–output belum. |
| 53 | AI context | **Partial** | Workspace context dikirim ke evidence flow; hierarchical context isolation lengkap belum. |
| 54 | AI memory | **Planned** | Belum ada session/research/user/program memory dengan permission boundary. |
| 55 | AI result pipeline | **Partial** | Structured JSON output dan validation tersedia; normalize/deduplicate/correlate/synthesis pipeline belum. |
| 56 | AI evaluation | **Planned** | Belum ada quality/latency/failure/regression evaluation store. |
| 57 | Prompt management | **Planned** | Prompt masih berada pada source code; versioned prompt registry belum. |
| 58 | AI cost governance | **Partial** | Budget/workspace/session controls ada; provider usage, per-user/task budget, runaway detection belum. |
| 59 | Job system | **Partial** | Durable job/outbox foundations, scheduled maintenance, rehearsal records, and worker contracts exist; full domain-wide queue coverage remains incomplete. |
| 60 | Job reliability | **Partial** | Retry, lease, failed/dead-letter status, and worker safety contracts exist; production multi-process reliability and operational alerting remain incomplete. |
| 61 | Scheduler | **Partial** | Administrative scheduled check tersedia; general scheduler belum. |
| 62 | Real-time | **Planned** | UI memakai request refresh; event-driven real-time updates belum. |
| 63 | Event architecture | **Partial** | Audit/notification events domain ada; versioned event schemas/publishers/consumers belum. |
| 64 | Outbox pattern | **Partial** | Versioned outbox schema and event records exist; production publisher/consumer delivery loop remains incomplete. |
| 65 | Idempotency | **Partial** | Beberapa workflow memiliki duplicate guards/idempotent escalation; generic idempotency key belum. |

## Requirement 66–89: data, security, admin, billing

| No. | Requirement | Status | Bukti/gap utama |
|---:|---|---|---|
| 66 | Database | **Implemented** | MySQL/Drizzle schema dan forward migrations tersedia. |
| 67 | Database integrity | **Partial** | Unique indexes, validations, transaction-oriented service checks ada; FK/check/index review menyeluruh belum. |
| 68 | Concurrency | **Planned** | Belum ada optimistic locking/version conflict workflow umum. |
| 69 | Pagination | **Partial** | List queries terbatas dan workspace-scoped; cursor pagination global belum. |
| 70 | Cache | **Deferred** | Belum ada cache layer; tidak ditambahkan tanpa workload requirement dan invalidation design. |
| 71 | Data consistency | **Partial** | MySQL source of truth dan derived analytics ada; explicit consistency classification belum. |
| 72 | File storage | **Implemented** | Supabase Storage backend upload/signed URL, metadata MySQL, hash, audit tersedia. |
| 73 | Search index | **Planned** | Belum ada index/reindex/delete/permission-aware search layer. |
| 74 | Data lifecycle | **Partial** | Active/paused/archived workspace dan retention metadata ada; export/delete lifecycle semua entity belum. |
| 75 | Privacy | **Partial** | Retention, workspace isolation, legal surfaces, archive planning ada; export/delete account/data access center belum. |
| 76 | Abuse protection | **Partial** | Body limits, safe boundaries, allowlists, no target execution ada; rate limit/upload malware scan/account abuse belum penuh. |
| 77 | Security architecture | **Partial** | Auth, authz, scope, audit, CSP, secure cookies, safe execution boundary ada; complete threat model/response system belum. |
| 78 | Secret management | **Implemented** | Secret hanya lewat runtime env; service-role/API keys tidak dibundel frontend; rotation workflow belum. |
| 79 | Encryption | **Partial** | TLS/security headers dan managed at-rest providers; sensitive-field/key management design belum. |
| 80 | Audit log | **Implemented** | Append-oriented audit records, hash references, signed archive/verification planning tersedia. |
| 81 | Security headers | **Implemented** | HSTS production, CSP, frame/content/referrer/permissions policies, secure cookies tersedia. |
| 82 | Threat modeling | **Partial** | Safety/governance boundaries terdokumentasi; per-domain threat model register belum. |
| 83 | Break-glass access | **Planned** | Belum ada temporary emergency privilege dengan expiry/audit. |
| 84 | Admin console | **Partial** | Operations admin/assurance tersedia; admin users/orgs/abuse/AI/billing/flags/infrastructure penuh belum. |
| 85 | Admin privilege separation | **Partial** | Owner/reviewer/operator/auditor tersedia; granular admin privilege families belum. |
| 86 | Feature flags | **Planned** | Belum ada environment/tenant/user rollout atau kill switch service. |
| 87 | Configuration management | **Partial** | `.env.example` dan runtime env groups tersedia; typed config/feature flag separation belum penuh. |
| 88 | Billing | **Deferred** | Pricing bersifat informational; payment/invoice/credit flow sengaja belum aktif. |
| 89 | Entitlement engine | **Deferred** | Belum ada plan entitlement karena billing belum diaktifkan. |

## Requirement 90–115: operations, frontend, testing, dan definition of done

| No. | Requirement | Status | Bukti/gap utama |
|---:|---|---|---|
| 90 | Observability | **Partial** | Health, readiness, metrics, logs, audit tersedia; traces/alerts/SLO dashboards belum. |
| 91 | Traceability | **Planned** | Request/trace correlation lintas browser–API–worker–AI–DB belum. |
| 92 | Incident management | **Implemented** | Incident create/acknowledge/resolve, escalation, evidence links, audit tersedia; post-incident review belum. |
| 93 | Status page | **Partial** | Public posture/status disclosure ada; live component telemetry belum. |
| 94 | Disaster recovery | **Partial** | Signed archive, verify, restore plan ada; tested restore execution/recovery environment belum. |
| 95 | Migration | **Implemented** | Drizzle forward migrations, deploy/runbook, validation tersedia. |
| 96 | CI/CD | **Partial** | CI check/test/build/security workflows ada; staging/smoke/production promotion belum lengkap. |
| 97 | Supply-chain security | **Partial** | Lockfile, dependency review/security workflow, container hardening ada; SBOM/signing/DAST penuh belum. |
| 98 | Testing | **Partial** | Unit/integration/property/E2E/Python tests ada; security/accessibility/performance/DR suites lengkap belum. |
| 99 | Critical E2E | **Partial** | Login/dashboard/workspace/policy/rehearsal/finding/evidence/report core ada; full program–research–submission–retest lifecycle belum. |
| 100 | Frontend architecture | **Partial** | React/Vite route shells, pages, components, contexts, locales ada; target feature-folder split belum. |
| 101 | Design system | **Partial** | Shared Radix/Tailwind components, semantic states, responsive shell ada; full token/a11y system belum. |
| 102 | UI state | **Implemented** | Loading/error/empty/offline/protected states tersedia pada core surfaces. |
| 103 | Responsive | **Implemented** | Desktop/mobile layouts dan PWA shell tersedia; route-specific data-card optimization dapat diperluas. |
| 104 | Accessibility | **Partial** | Keyboard navigation, labels, focus-aware components ada; automated WCAG audit penuh belum. |
| 105 | Internationalization | **Implemented** | 20 locale, timezone, RTL, locale fallback dan tests tersedia. |
| 106 | SEO | **Partial** | Title/manifest/public content ada; complete metadata/robots/sitemap/structured data belum. |
| 107 | Performance | **Partial** | Lazy routes/PWA/cache ada; bundle masih memberi warning chunk besar dan performance budget belum. |
| 108 | Database performance | **Partial** | Index dasar dan bounded queries ada; query profiling/load benchmark belum. |
| 109 | Email system | **Planned** | Belum ada email provider, templates, queue, unsubscribe, delivery log. |
| 110 | Documentation | **Partial** | README, architecture, governance, runbook, alignment, roadmap tersedia; API/domain/operator docs lengkap belum. |
| 111 | Repository final | **Partial** | Runtime provider-neutral sudah dipakai: Firebase Auth, Supabase Storage, Railway-ready API, serta CI GitHub; remaining domain gaps tercatat di matrix ini. |
| 112 | Aturan tim | **Implemented** | Safety boundary dan definition of done terdokumentasi; automation enforcement dapat diperluas. |
| 113 | Definition of done | **Partial** | Checklist terdokumentasi; belum semua future domain memenuhi seluruh checklist. |
| 114 | Scope/authorization principle | **Implemented** | Scope → authorization → rehearsal → evidence → finding → report dijaga; target execution tetap diblokir. |
| 115 | Definisi AngelMind | **Partial** | Sudah menjadi governed AI security-research control plane; belum menjadi platform end-to-end penuh seperti seluruh target blueprint. |

## Urutan implementasi yang wajib

Pekerjaan lanjutan harus dilakukan sebagai vertical slice, dengan urutan **identity/account security → organization/authorization → program/scope/research session → assets/tasks/observations → evidence provenance/finding/retest/report → search/knowledge graph/collaboration → AI orchestration/jobs/events → privacy/abuse/observability/DR → frontend/accessibility/CI/E2E**.

Tidak boleh menutup item hanya dengan menambah route atau folder. Setiap item yang dinyatakan selesai harus mempunyai schema/migration bila menyimpan data, server-side authorization, validation, audit event, error/loading/empty state, test, documentation, dan deployment verification. Target-facing scanning, exploitation, credential replay, serta autonomous external submission tetap **Deferred** dan memerlukan design/security/legal review terpisah.
