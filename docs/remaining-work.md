# AngelMind Remaining Work

Dokumen ini adalah antrean pekerjaan aktif. Status requirement otoritatif tetap berada di `docs/blueprint-coverage.md`; dokumen ini hanya mencatat gap yang benar-benar masih terbuka atau membutuhkan environment/keputusan pemilik.

## A/B — Pekerjaan repository yang masih terbuka

| Priority | Work item | Status terbaru |
|---|---|---|
| P0 | Composite workspace consistency di database boundary. | **Selesai untuk research lifecycle**: composite indexes dan foreign keys session/asset/observation/hypothesis/task sudah ada pada schema dan migration `0032`; relasi domain lain dapat diperluas bila diperlukan. |
| P1 | End-to-end trace graph correlation. | **Selesai untuk record inti**: `traceId` dipersist pada session, asset, observation, hypothesis, task, finding, evidence artifact, dan playbook task; propagasi ke provider eksternal tetap bergantung pada adapter/provider. |
| P1 | Worker dan outbox operational semantics. | **Selesai untuk core dispatcher**: job lease/heartbeat, stale recovery, retry/dead-letter, outbox lease, backoff, consumer receipt setelah sukses, serta automatic evidence-scan handler sudah tersedia. Integration test dengan database live dan deployment replay drill masih memerlukan environment. |
| P1 | Evidence security scanning. | **Selesai untuk built-in safety scan**: upload masuk quarantine dan diproses worker melalui MIME, extension, magic-byte, ukuran, ZIP, dan control-character checks. Antivirus/malware provider eksternal masih opsional dan membutuhkan provider/credential. |
| P1 | Permission-aware ranked search. | **Selesai untuk deterministic search**: workspace permission boundary, cross-domain index, token ranking, dan freshness scoring tersedia. Semantic/vector retrieval tetap merupakan enhancement opsional. |
| P1 | Intelligence ingestion. | **Selesai untuk provider-neutral fetch**: normalization, persistence, deterministic dedupe, audit, batch ingestion API, HTTPS/host allowlisting, bounded JSON fetch, durable job enqueue, dan worker handler tersedia. Provider-specific authentication, credentials, dan scheduling policy tetap membutuhkan environment/keputusan owner. |
| P1 | Playbook execution. | **Sebagian tersedia**: versioned playbook, matching, task generation, dependency persistence, trace lineage, validation, dan audit tersedia; executor task nyata dan feedback dari adapter tool masih memerlukan implementasi/provider sesuai policy. |
| P2 | Auth dan UI quality contracts. | **Sebagian tersedia**: Firebase foundation, localization, responsive UI, lazy routes, dan test contracts tersedia; MFA/passkey/recovery E2E, WCAG automation, load/performance, dan full critical-path E2E masih terbuka. |
| P2 | API/domain/operator documentation. | **Sebagian tersedia**: architecture, runbook, migration, worker, quarantine-scan, dan remaining-work notes sudah diperbarui; dokumentasi deployment production dan provider-specific procedures tetap membutuhkan konfigurasi environment yang dipilih owner. |

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
