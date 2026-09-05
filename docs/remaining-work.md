# AngelMind Remaining Work

Dokumen ini adalah antrean pekerjaan aktif. Status requirement otoritatif tetap berada di `docs/blueprint-coverage.md`; dokumen ini hanya mencatat gap yang benar-benar masih terbuka atau membutuhkan environment/keputusan pemilik.

## A/B — Pekerjaan repository yang masih terbuka

| Priority | Work item | Status terbaru |
|---|---|---|
| P0 | Composite workspace consistency di database boundary. | **Selesai untuk research lifecycle**: composite indexes dan foreign keys session/asset/observation/hypothesis/task sudah ada pada schema dan migration `0032`; relasi domain lain dapat diperluas bila diperlukan. |
| P1 | End-to-end trace graph correlation. | **Selesai untuk record inti**: `traceId` dipersist pada session, asset, observation, hypothesis, task, finding, evidence artifact, dan playbook task; propagasi ke provider eksternal tetap bergantung pada adapter/provider. |
| P1 | Worker dan outbox operational semantics. | **Selesai untuk core dispatcher**: job lease/heartbeat, stale recovery, retry/dead-letter, outbox lease, backoff, consumer receipt setelah sukses, serta automatic evidence-scan handler sudah tersedia. Integration test dengan database live dan deployment replay drill masih memerlukan environment. |
| P1 | Evidence security scanning. | **Selesai untuk repository boundary**: upload masuk quarantine dan diproses worker melalui MIME, extension, magic-byte, ukuran, ZIP, dan control-character checks. Optional external HTTP malware-provider adapter, HTTPS production enforcement, bounded timeout, provider verdict validation, and retry-safe outage behavior are implemented; provider URL/credential and live verification tetap membutuhkan environment. |
| P1 | Permission-aware ranked search. | **Selesai untuk deterministic search**: workspace permission boundary, cross-domain index, token ranking, dan freshness scoring tersedia. Semantic/vector retrieval tetap merupakan enhancement opsional. |
| P1 | Intelligence ingestion. | **Selesai untuk provider-neutral fetch**: normalization, persistence, deterministic dedupe, audit, batch ingestion API, HTTPS/host allowlisting, bounded JSON fetch, durable job enqueue, dan worker handler tersedia. Provider-specific authentication, credentials, dan scheduling policy tetap membutuhkan environment/keputusan owner. |
| P1 | Playbook execution. | **Sebagian tersedia**: versioned playbook, matching, task generation, dependency persistence, trace lineage, validation, dan audit tersedia; executor task nyata dan feedback dari adapter tool masih memerlukan implementasi/provider sesuai policy. |
| P2 | Auth dan UI quality contracts. | **Sebagian tersedia**: Firebase foundation, localization, responsive UI, lazy routes, authenticated lifecycle contract, manual axe workflow, dan bounded staging load workflow tersedia; MFA/passkey/recovery E2E serta live critical-path verification tetap environment-dependent. |
| P2 | API/domain/operator documentation. | **Sebagian tersedia**: architecture, runbook, migration, worker, quarantine-scan, deployment verification, rollback contract, dan remaining-work notes sudah diperbarui; provider-specific procedures tetap membutuhkan konfigurasi environment yang dipilih owner. |

## R — AI evaluation and audit-control completion (2026-09-02)

Repository kini mempersist reviewer evaluation untuk AI runs melalui rubric, score tervalidasi, verdict, notes, reviewer identity, idempotent upsert, dan workspace authorization. Halaman Operations menampilkan evaluation coverage, average score, verdict distribution, dan recorded cost dari data persisted. Audit state pada control-plane service, research workflow, dan playbook executor menggunakan AES-256-GCM bila `AUDIT_STATE_ENCRYPTION_KEY` berukuran minimal 32 karakter; fallback plaintext hanya dipertahankan untuk development yang belum mengonfigurasi key. Mutation policy decision dan incident review sekarang memiliki keyed async reentrancy guard untuk menolak double-submit paralel dalam satu proses.

Commit terkait: `41b0adc`, `2397bc1`, dan `7989a5f`. Typecheck, targeted Vitest tests (9 assertions), AI orchestration tests, build, dan `git diff --check` lulus. Sisa verifikasi encryption key rotation, multi-process lock semantics, provider-level latency/regression feeds, dan live deployment tetap environment-dependent.

## S — Centralized orchestration queue adoption (2026-09-02)

Executor orchestration tidak lagi melakukan direct insert ke tabel jobs. Setiap task AI kini melewati `enqueueJob`, sehingga workspace authorization, trace context, idempotency reconciliation, bounded retry, dan payload worker memakai kontrak yang sama dengan durable AI runs lainnya. Direct writes yang tersisa hanya merupakan ledger domain yang disengaja atau boundary provider, bukan submission queue.

Commit: `907cae5`. Typecheck dan full Vitest lulus: 67 test files passed, 1 skipped; 181 tests passed, 1 skipped. Integration database test tetap memerlukan `DATABASE_URL` staging.

## T — Feature flag and configuration coverage (2026-09-02)

Blueprint coverage kini disinkronkan dengan implementasi yang sudah ada: parser feature flags fail-closed mendukung environment, organization, user, entitlement, deterministic rollout, dan kill switch; konfigurasi runtime typed memiliki bounded defaults serta validation untuk audit encryption key dan required binaries. Provisioning dan rotasi secret tetap sengaja dipisahkan sebagai pekerjaan environment owner.

## U — Threat-model register and security runbook (2026-09-02)

Repository kini memiliki [`docs/threat-model-register.md`](./threat-model-register.md) sebagai register canonical untuk 12 threat scenarios lintas workspace authorization, passive-only boundary, audit crypto, concurrency, evidence, jobs, identity, secrets, AI retention, notifications, disaster recovery, dan supply chain. Setiap row memiliki severity, controls, verification evidence, residual risk, owner, dan status. `incident-response.md` dan `production-runbook.md` sekarang mewajibkan threat-model review, evidence preservation, containment melalui feature/capability controls, post-incident review, dan rollback evidence.

SSO/SCIM, live provider verification, multi-process lock, WORM/object-lock, DAST, dan production DR exercise tetap sengaja berstatus open/deferred sampai owner menyediakan policy, provider, atau environment evidence. Break-glass access sekarang memiliki repository-backed request, second-admin approval, bounded expiry, revoke, active lookup, dan audit-chain implementation; policy review serta live deployment evidence tetap terbuka.

## C — Pekerjaan live environment

Pekerjaan berikut tidak dapat diselesaikan hanya dari repository lokal karena membutuhkan akses atau tindakan pada akun/environment nyata: membuat dan mengisi secrets, memilih dialect database, menjalankan backup/preflight dan menerapkan migration pada database live, deploy web/API/worker, mengonfigurasi Firebase domains/providers, mengonfigurasi Supabase Storage, menghubungkan key 9Router/OmniRoute/provider intelligence, mengaktifkan branch protection GitHub, serta menjalankan smoke test staging/production.

## D — Keputusan pemilik produk, security, legal, dan operasi

Keputusan berikut tetap menjadi tanggung jawab owner: kebijakan model AI/cost/retention, role dan MFA policy, data retention/residency, terms dan safe harbor, pemilihan provider email/payment/scanning/intelligence, severity incident, SLO/RTO/RPO, release ownership, serta aturan approval Tier 3.

## Perubahan yang sudah dipublish

Implementasi yang sudah masuk ke `main` mencakup registry-based AI fallback, generic workspace-scoped knowledge graph beserta migration/API/UI/traversal, search ranking graph-aware, playbook task/dependency generation, intelligence feed deduplication dan batch ingestion, route permissions, serta test contract updates. Semua perubahan tersebut sudah melalui typecheck, test suite, build, dan `git diff --check` pada sandbox.

## E — Repository audit update (2026-09-01)

The latest repository pass added a canonical evidence normalizer with deterministic redaction, type coercion, timestamp normalization, XSS/control-character sanitization, data classification, confidence clamping, chain-reference deduplication, and tamper-evident hashing. High-risk approval records now persist structured review context and expire automatically after 24 hours; expired records cannot be decided. Migration `0041_approval_review_context` is registered in the migration journal. These changes do not enable target-facing offensive execution and remain compatible with the existing Firebase authentication, Supabase Storage quarantine flow, and Railway web/worker deployment configuration.

The following items still require live owner/environment actions rather than local code changes: applying migration `0041` to the production database, verifying Firebase authorized domains and providers, confirming the Supabase bucket and service-role secret, deploying both Railway services, and running staging smoke tests with real credentials. No production secret was added to the repository.

## F — Incremental implementation update

The repository now includes fail-closed runtime feature flags with environment, organization, user, entitlement, rollout, and kill-switch evaluation, plus reusable bounded cursor pagination and optimistic-concurrency primitives with deterministic request fingerprints. These primitives are covered by tests and are available for adoption by domain list/mutation endpoints in subsequent vertical slices.

## Latest incremental closures

The current `main` branch now includes validated feature-flag parsing, cursor-paginated research sessions/tasks, revision-aware research transitions, race-safe job/outbox idempotency, passive-only playbook task enforcement, automatic research search indexing on create and state transitions, durable email delivery with worker execution, organization invitation email queueing, and privacy export/delete coverage for email deliveries and organization invitations. These remain subject to staging/live environment verification where applicable.

## G — Latest implementation slice (2026-09-01)

Playbook runs now enqueue a durable `playbook.run` job and are processed by the worker through dependency-aware, deterministic task selection. The executor validates passive task types, persists blocked-task output, pauses runs when no approved passive adapter is available, and emits an audit event rather than fabricating a result. Target-facing execution remains intentionally disabled until an owner-approved passive adapter/provider is configured and covered by integration tests.

The local repository remains free of production credentials. Firebase Admin, Supabase Storage, database migration application, Railway deployment, and staging smoke verification still require the owner's live environment actions described in section C.

## H — Runtime readiness hardening (2026-09-02)

The `/readyz` endpoint now checks configured `RUNTIME_REQUIRED_BINARIES` against registered adapters and actual executable availability. Production readiness fails closed when a required binary is missing or unregistered, while development remains usable without a runtime list. Prometheus metrics now report the actual runtime readiness result. The adapter probe treats a successfully spawned executable as available even when that executable does not implement `--version` with exit code zero.

## I — Firebase email auth UI (2026-09-02)

The public authentication entry now includes an email-auth modal with sign-in, account registration followed by verification email, and password-reset request flows using the existing Firebase client helpers. Google Sign-In remains available. Live Firebase authorized-domain/provider configuration and authenticated staging E2E remain environment-level verification tasks.

## J — Workspace role enforcement and durable trace correlation (2026-09-02)

Protected tRPC procedures with a declared workspace role now enforce owner, read-member, and responder access centrally when a workspaceId is present. Distinct-reviewer and admin-or-distinct-reviewer procedures remain delegated to their domain-specific approval checks. Durable jobs and outbox events now persist traceId, worker execution restores request/trace context with deterministic job fallbacks, and migration 0044 adds the required indexes.

## K — Governance completion: incident post-review (2026-09-02)

Incident post-incident review is now repository-backed through `incidentReviews` and migration 0045. The workflow stores summary, root cause, bounded action items, optional action owner and due date, closure evidence reference, and open/closed status. Closing is fail-closed until the incident is resolved and closure evidence is present. The assurance router exposes read and save procedures with strict validation and workspace response access.

## L — Structured policy comparison (2026-09-02)

The assurance API now exposes `comparePolicies`, which validates that both immutable policy versions exist in the same workspace, enforces read access, parses stored allowlists/exclusions, and recomputes a structured field-level diff instead of trusting client-provided data.

## M — Authenticated lifecycle contract and policy diff UI (2026-09-02)

Added a staging-safe Playwright contract covering authenticated workspace creation, research session creation, passive asset registration, observation creation, finding promotion, and session visibility. The contract runs only when `ANGELMIND_E2E_TOKEN` is explicitly provided, so CI and local public E2E remain credential-free. Assurance now offers an interactive two-version policy selector backed by the same-workspace `comparePolicies` API and renders every changed field with previous/next values.

## N — Notification delivery ledger and provider abstraction (2026-09-02)

Notifications now create durable per-channel ledger rows for in-app, email, and webhook delivery with idempotency keys, status, attempt count, retry timestamp, provider reference, redacted payload, and last error. A provider registry and worker handler provide a common execution contract. In-app delivery is enabled; email remains delegated to the existing email delivery ledger, and webhook remains disabled until approved activation and provider configuration exist.

## O — Audit archive retention and restore contract (2026-09-02)

Audit archive rows now persist a deterministic immutable batch key, workspace-derived retention deadline, successful verification timestamp, and last restore-drill timestamp. Archive creation remains append-only at the application boundary; verification rechecks the signed manifest before recording status, and restore drills remain plan-only with explicit human confirmation and no data mutation. Object-lock/WORM enforcement, retention policy application, and an actual disaster-recovery restore must still be configured and exercised in the owner's live storage/database environment.

## P — Discovery → fingerprint → vector selection (2026-09-02)

Research task kini dapat menerima `assetId`, membaca metadata asset pada session yang sama, dan menghasilkan rekomendasi vector deterministik dengan capability, suggested adapters, risk class, serta rationale fingerprint. Metadata tersebut dipersist pada migration `0051_dashing_spectrum`. Task high/critical dibuat `blocked` dengan `approvalStatus=pending` dan transition ke `running` ditolak sampai approval manusia tersedia. Selector dan malformed-metadata behavior dilindungi oleh unit tests. Implementasi ini tetap passive-only; adapter recommendation bukan izin eksekusi dan tidak mengaktifkan target-facing tools.

## Q — Repository completion pass (2026-09-02)

Subsequent commits added direct `sourceObservationId` provenance on findings with migration `0052`, a reviewer-only approval mutation for high/critical research tasks, an explicit administrative scheduler registry, bounded notification retry backoff, constant-time archive signature verification, a manual HTTPS-only staging load probe, and a manual post-deploy health/readiness/metrics verification workflow. These contracts are covered by typecheck and automated tests and remain safe by default.

## R — Finding remediation, retest, and search consistency (2026-09-02)

Finding records now persist severity, client-notified time, remediation deadline/owner/notes, resolved time, and a monotonic revision counter through migrations `0056_finding_remediation_lifecycle` and `0057_finding_revision_concurrency`. The state machine now models notification, remediation, retest, resolution, reopening, and false-positive checkpoints while keeping automated submission impossible. Transition, remediation, and new retest-request writes require the caller's expected revision and fail closed on stale data. Retest requests are idempotent while active; terminal retest results require scanned or promoted evidence and update the parent finding to `resolved`, `remediation`, or `inconclusive`.

Search consistency is extended to finding transitions/remediation, evidence upload/scan/promotion/provenance, report drafts, knowledge-node upserts, and workspace-note create/update/delete. Global search now exposes deterministic relevance-aware cursor pagination and a stable empty-database response shape. The Findings surface exposes severity, remediation planning, and the expanded lifecycle. Firebase, Supabase, Railway, production migration application, and live staging verification remain intentionally outside this repository-only slice.

Verification completed locally: TypeScript check, finding workflow tests, migration journal consistency, and `git diff --check` passed after the changes; full test/build verification remains the next gate before commit.

## S — Governed AI memory scopes (2026-09-02)

AI memory is now repository-backed for `user`, `workspace`, `session`, and workspace-linked `program` scopes. Memory writes validate references against the selected workspace, enforce read/respond authorization, protect updates and archive operations with monotonic revisions, preserve source/retention metadata, and make user-private memory unavailable to workspace search. Active workspace memory is indexed for global search; archive and retention purge remove derived search records. The worker retention interval and `ai.memory.purge` durable job now purge both AI run payloads and expired AI memory content. Migration `0058_ai_memory_scopes` defines the table, foreign keys, normalized unique scope key, indexes, status, retention, and revision columns. AI Center exposes save, update, list, and archive controls.

Local scope contract tests and migration safety/rollback checks pass. Applying migration `0058` to the live database and provider-level context injection remain environment/adapter work.

## V — Rate limiting and abuse protection (2026-09-03)

The API boundary now applies bounded in-memory rate limiting to Firebase token exchange, scheduled callbacks, REST v1, and tRPC routes. Client keys use the socket address by default and only honor `X-Forwarded-For` when `TRUST_PROXY=true`; authorization material is hashed before keying and is never exposed in responses or logs. Repeated limit violations escalate to a bounded exponential abuse cooldown with `Retry-After`, while health and metrics routes remain available for operations. Distributed quota coordination and behavioral/account-abuse detection remain environment/provider work.

Focused rate-limit tests, typecheck, and migration safety validation pass.

## W — Production observability hardening (2026-09-03)

HTTP requests now receive bounded `x-request-id` and `x-trace-id` correlation headers and execute within the existing async trace context. Prometheus output includes response-status counters, current error/slow ratios, SLO budget gauges, runtime readiness, purge metrics, and configured provider probe readiness. Provider probes are bounded by timeout, report status/latency without response-body leakage, and participate in production `/readyz` fail-closed behavior when configured. Hosted alert delivery and dashboard provisioning remain environment-level operations.

Full Vitest suite, production build, and diff validation pass.

## X — Disaster-recovery restore drill (2026-09-03)

Audit archive restore drills now persist a durable `restoreDrillRuns` ledger keyed by archive and idempotency key. A drill retrieves the managed-storage manifest, verifies SHA-256/HMAC integrity, validates workspace identity and record collections, records checked counts, and updates the archive's last-drill timestamp. Duplicate requests replay completed results; concurrent requests are rejected; failed drills remain failed and require a new key. The drill is explicitly plan-only and performs no production data writes or deletes. A real recovery environment and human-confirmed restore execution remain deployment-level work.

Typecheck, archive integrity tests, migration safety, full Vitest suite, production build, and diff validation pass.

## Latest repository closure — 2026-09-03

The repository completion pass added a fail-closed UUID v3/v5/v6 external-buffer guard to the package scripts and CI, standardized REST v1 request correlation with validated `request_id` responses, and routed queued notification deliveries through the durable worker with idempotent job keys. The governed tool execution pipeline now has a durable `tool_execution` worker handler and tests. Local typecheck, contract checks, full Vitest suite, and production build pass. Live staging verification, provider-backed delivery, WebSocket deployment, and production operations remain environment-dependent.


## Latest implementation slice — 2026-09-04

The repository now registers the complete 17-tool catalog required by the master specification, including `naabu` for port discovery and `katana` for endpoint mining. Both tools have canonical capability mappings, passive-readonly runtime adapters, catalog tests, smoke-test requirements, master-contract enforcement, and pinned provisioning in `Dockerfile.tools`. The supported pnpm overrides and patched dependency configuration were moved from the deprecated `package.json.pnpm` field to `pnpm-workspace.yaml`.

This closes the repository contract gap only. Burp/vendor artifacts, tool-image build and runtime verification, owner-approved target execution, staging deployment, and production health evidence remain environment and safety-gated work. The target-facing execution boundary remains fail-closed by design until those controls are explicitly approved and verified.

## Latest implementation slice — 2026-09-05
Governance approval escalation is now implemented instead of returning HTTP 501. A permitted reviewer can escalate only a pending, unexpired approval with a bounded note; the workflow increments an escalation counter, extends the review window by 24 hours, records the actor and timestamp, and appends an audit event. Migration `0066_approval_escalation_metadata` adds the durable escalation fields. No target-facing action is triggered by escalation.

Typecheck, migration journal/safety checks, governance tests, master contract, API v1 contract, and diff validation pass.

## Latest implementation slice — 2026-09-05 (SEO)
Public SEO coverage is now repository-backed: route-aware metadata updates titles, descriptions, canonical URLs, Open Graph, and Twitter cards; the static shell contains JSON-LD; the sitemap covers all concrete public routes; robots excludes authenticated and organization portal paths while allowing public security content; and `check:seo-contract` prevents route/sitemap/robots drift. Search-engine crawl/render verification remains deployment-level work.

Targeted public-route tests, SEO contract, web-page contract, master/API contracts, migration checks, and diff validation pass.

## Latest implementation slice — 2026-09-05 (Supply chain)
The container workflow now generates and uploads a CycloneDX JSON SBOM for every runtime image build using a pinned `anchore/sbom-action` commit. This closes the repository-side SBOM evidence gap while image signing/verification and full DAST remain separate release-gated work.

## Latest implementation slice — 2026-09-05 (Container vulnerability evidence)
Runtime container CI now runs a pinned Trivy scan for HIGH and CRITICAL vulnerabilities, keeps unfixed findings explicit without failing unrelated builds, and uploads the SARIF result alongside the runtime SBOM. The dependency SBOM action in the security workflow is pinned as well. Image signing/verification and full DAST remain open release-gated items.

## Latest implementation slice — 2026-09-05 (Image signing)
Main-branch runtime image publishing now uses GHCR with GitHub OIDC permissions, keyless Cosign signing, certificate identity and issuer verification, and uploaded verification evidence. Pull requests still build and scan locally without publishing or signing. Full DAST and production registry retention policy remain open.

## Latest implementation slice — 2026-09-05 (DAST)
The manual staging DAST workflow now supports both pinned OWASP ZAP baseline and active full scans. Full scans require two explicit confirmations (`STAGING` and `FULL-STAGING`), reject production-looking or non-HTTPS targets, disable issue-writing, and retain scan artifacts. Actual execution still requires an authorized non-production staging URL and operator confirmation.

## Latest implementation slice — 2026-09-05 (Release promotion)
A manual promotion workflow now accepts only an immutable AngelMind GHCR digest, verifies an authorized non-production staging URL and expected deployed commit, verifies the keyless Cosign provenance, and creates a release tag only after explicit `PROMOTE-STAGING-IMAGE` confirmation. Health, readiness, signature, and promotion evidence are retained as artifacts. Provider-specific production deployment remains environment-gated.

## Latest implementation slice — 2026-09-05 (Monitoring and alerting)
Prometheus alert rules now cover readiness/provider failures, runtime and database readiness, HTTP error and latency budgets, and purge worker health. An Alertmanager template adds warning/critical routing, resolved notifications, and critical-alert inhibition. Release readiness runs a monitoring contract checker that prevents metric/rule drift. Webhook credentials and hosted dashboard provisioning remain deployment-level configuration.

## Latest implementation slice — 2026-09-05 (Database management)
Database management now has a protected automatic migration workflow for staging and production. It serializes runs per environment, requires backup and apply confirmations, validates journal/safety/rollback contracts, calls a provider backup checkpoint hook before applying forward migrations, and retains migration evidence. Provider-specific backup/PITR execution and live database verification remain environment-gated.
