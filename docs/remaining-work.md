# AngelMind Remaining Work

Dokumen ini adalah antrean pekerjaan aktif. Status requirement otoritatif tetap berada di `docs/blueprint-coverage.md`; dokumen ini hanya mencatat gap yang benar-benar masih terbuka atau membutuhkan environment/keputusan pemilik.

## A/B — Pekerjaan repository yang masih terbuka

| Priority | Work item | Status terbaru |
|---|---|---|
| P0 | Composite workspace consistency di database boundary. | **Selesai untuk research lifecycle**: composite indexes dan foreign keys session/asset/observation/hypothesis/task sudah ada pada schema dan migration `0032`; relasi domain lain dapat diperluas bila diperlukan. |
| P1 | End-to-end trace graph correlation. | **Terbuka**: request dan AI trace ID tersedia, tetapi correlation ID belum otomatis mengalir ke seluruh record research/evidence/finding/report. |
| P1 | Worker dan outbox operational semantics. | **Sebagian tersedia**: claim lease, stale recovery, consumer receipts, dan heartbeat periodik selama handler berjalan tersedia; dispatcher outbox produksi, replay contract, dan integration test lintas worker masih perlu diselesaikan. |
| P1 | Evidence security scanning. | **Sebagian tersedia**: quarantine, scan state, promote/reject, audit, serta validation tersedia; adapter MIME/content/malware nyata masih membutuhkan service/provider. |
| P1 | Permission-aware ranked search. | **Sebagian tersedia**: workspace search, knowledge graph index, relevance ranking, dan permission boundary tersedia; semantic search, freshness scoring, dan cross-domain index penuh masih terbuka. |
| P1 | Intelligence ingestion. | **Sebagian tersedia**: normalization, persistence, deterministic dedupe, audit, dan batch ingestion API tersedia; provider adapters dan scheduling fetch masih terbuka. |
| P1 | Playbook execution. | **Sebagian tersedia**: versioned playbook, matching, task generation, dependency persistence, validation, dan audit tersedia; durable execution feedback/retry integration masih terbuka. |
| P2 | Auth dan UI quality contracts. | **Sebagian tersedia**: Firebase foundation, localization, responsive UI, lazy routes, dan test contracts tersedia; MFA/passkey/recovery E2E, WCAG automation, load/performance, dan full critical-path E2E masih terbuka. |
| P2 | API/domain/operator documentation. | **Terbuka sebagian**: runbook dan architecture docs tersedia; API reference dan operator procedures lengkap masih perlu ditulis. |

## C — Pekerjaan live environment

Pekerjaan berikut tidak dapat diselesaikan hanya dari repository lokal karena membutuhkan akses atau tindakan pada akun/environment nyata: membuat dan mengisi secrets, memilih dialect database, menjalankan backup/preflight dan menerapkan migration pada database live, deploy web/API/worker, mengonfigurasi Firebase domains/providers, mengonfigurasi Supabase Storage, menghubungkan key 9Router/OmniRoute/provider intelligence, mengaktifkan branch protection GitHub, serta menjalankan smoke test staging/production.

## D — Keputusan pemilik produk, security, legal, dan operasi

Keputusan berikut tetap menjadi tanggung jawab owner: kebijakan model AI/cost/retention, role dan MFA policy, data retention/residency, terms dan safe harbor, pemilihan provider email/payment/scanning/intelligence, severity incident, SLO/RTO/RPO, release ownership, serta aturan approval Tier 3.

## Perubahan yang sudah dipublish

Implementasi yang sudah masuk ke `main` mencakup registry-based AI fallback, generic workspace-scoped knowledge graph beserta migration/API/UI/traversal, search ranking graph-aware, playbook task/dependency generation, intelligence feed deduplication dan batch ingestion, route permissions, serta test contract updates. Semua perubahan tersebut sudah melalui typecheck, test suite, build, dan `git diff --check` pada sandbox.
