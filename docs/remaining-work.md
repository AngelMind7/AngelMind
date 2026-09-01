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
| P1 | Intelligence ingestion. | **Sebagian tersedia**: normalization, persistence, deterministic dedupe, audit, dan batch ingestion API tersedia; provider adapters dan scheduling fetch masih terbuka. |
| P1 | Playbook execution. | **Sebagian tersedia**: versioned playbook, matching, task generation, dependency persistence, trace lineage, validation, dan audit tersedia; executor task nyata dan feedback dari adapter tool masih memerlukan implementasi/provider sesuai policy. |
| P2 | Auth dan UI quality contracts. | **Sebagian tersedia**: Firebase foundation, localization, responsive UI, lazy routes, dan test contracts tersedia; MFA/passkey/recovery E2E, WCAG automation, load/performance, dan full critical-path E2E masih terbuka. |
| P2 | API/domain/operator documentation. | **Sebagian tersedia**: architecture, runbook, migration, worker, quarantine-scan, dan remaining-work notes sudah diperbarui; dokumentasi deployment production dan provider-specific procedures tetap membutuhkan konfigurasi environment yang dipilih owner. |

## C — Pekerjaan live environment

Pekerjaan berikut tidak dapat diselesaikan hanya dari repository lokal karena membutuhkan akses atau tindakan pada akun/environment nyata: membuat dan mengisi secrets, memilih dialect database, menjalankan backup/preflight dan menerapkan migration pada database live, deploy web/API/worker, mengonfigurasi Firebase domains/providers, mengonfigurasi Supabase Storage, menghubungkan key 9Router/OmniRoute/provider intelligence, mengaktifkan branch protection GitHub, serta menjalankan smoke test staging/production.

## D — Keputusan pemilik produk, security, legal, dan operasi

Keputusan berikut tetap menjadi tanggung jawab owner: kebijakan model AI/cost/retention, role dan MFA policy, data retention/residency, terms dan safe harbor, pemilihan provider email/payment/scanning/intelligence, severity incident, SLO/RTO/RPO, release ownership, serta aturan approval Tier 3.

## Perubahan yang sudah dipublish

Implementasi yang sudah masuk ke `main` mencakup registry-based AI fallback, generic workspace-scoped knowledge graph beserta migration/API/UI/traversal, search ranking graph-aware, playbook task/dependency generation, intelligence feed deduplication dan batch ingestion, route permissions, serta test contract updates. Semua perubahan tersebut sudah melalui typecheck, test suite, build, dan `git diff --check` pada sandbox.
