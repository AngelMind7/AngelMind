# AngelMind Blueprint Implementation Status

Dokumen ini memetakan 115 area pada `Angelmindstrukturjelas.pdf` terhadap implementasi repository. Setiap capability yang dicatat sebagai selesai memiliki jalur schema/contract, server-side authorization dan validation, persistence, serta route atau surface yang relevan.

## Status saat ini

| Layer | Status | Implementasi utama |
| --- | --- | --- |
| Public website | Sebagian besar tersedia | Route publik, legal pages, trust, security, documentation, pricing, status, contact, dan marketing copy tersedia. |
| Authentication dan identity | Vertical slice selesai | Firebase ID token verification, Firebase login/logout, device registry, login/security event ledger, onboarding profile, API key lifecycle dengan hash, serta profile/privacy visibility. |
| Organization dan authorization | Vertical slice selesai | Organization tenant, member roles, program catalog, scope manifest, entitlements, workspace organization/program references, dan admin membership checks. Workspace authorization lama tetap dipakai sebagai boundary utama. |
| Research workflow | Vertical slice selesai | Research session state machine, scope digest, asset intelligence, observation, hypothesis, task dependency graph, task transitions, audit metadata, serta Research Workspace UI. |
| Evidence dan findings | Diperluas | Existing evidence upload, finding lifecycle, report version, validation, archive, dan analytics dipertahankan; provenance, duplicate/related/supersedes relation, retest lifecycle, dan quality gate ditambahkan. |
| AI Center | Vertical slice selesai | Model registry, AI run trace, trace ID, model/gateway references, cost ceiling, usage accounting, prompt version table, durable jobs, idempotency key, dan outbox event table/API. AI tidak memiliki target execution atau credential access. |
| Platform dan integrations | Sebagian besar tersedia | tRPC API, Firebase, Supabase Storage, Railway deployment/Cron, GitHub CI, webhook policy, audit archive, provider-neutral guard, API key authentication fallback, dan privacy request lifecycle. Versioned REST gateway, search index, tagging, dan collaboration lanjutan masih perlu iterasi. |
| Operations dan governance | Sebagian besar tersedia | Health, metrics, Docker, Railway health check, scheduled maintenance, backup/archive signing, incident workflow, approval workflow, notification, secret references, dan CI guard tersedia. Billing eksternal belum diaktifkan karena provider payment belum ditentukan. |
| Frontend quality | Sebagian besar tersedia | React lazy routes, responsive UI, i18n inventory, PWA, loading/error/empty states, accessibility primitives, Security Center, Organization Hub, Research Workspace, AI Center, dan Profile page. E2E critical path dan bundle optimization masih perlu iterasi. |

## Surface baru

| Surface | Route | Fungsi |
| --- | --- | --- |
| Security Center | `/security` | Device registry, security events, onboarding state, API key create/revoke, dan account identity. |
| Profile | `/profile` | Username, bio, specialization, skills, experience, visibility, serta research statistics/history. |
| Organization Hub | `/organizations` | Organization selector, member roles, program scope, status program, dan entitlement boundary. |
| Research Workspace | `/research` | Session lifecycle, assets, observations, hypotheses, dan tasks dengan server-backed state. |
| AI Center | `/ai-center` | Model registry, run trace, cost guard, dan durable jobs. |

## Migration

Schema terbaru berada pada rangkaian migration sampai `drizzle/0018_ai_run_retention.sql`, termasuk identity, tenant, research, evidence, reports, collaboration, outbox versioning, AI evaluations, dan AI run retention. Jalankan migration pada environment yang memiliki `DATABASE_URL` setelah meninjau SQL tersebut; sandbox tidak mengeksekusi migration ke database produksi.

## Validasi

Validasi terakhir yang dijalankan pada branch main mencakup `pnpm check`, seluruh test suite Vitest dengan 38 test files dan 81 tests, `pnpm build`, `pnpm check:budget`, Python tests, Ruff lint, `git diff --check`, dan public safety E2E desktop/mobile. Build dapat memberikan warning tooling yang tidak menggagalkan proses.

## Batas yang disengaja

Blueprint tetap lebih besar daripada satu batch implementasi. Fitur yang belum diklaim selesai antara lain payment billing provider, passkey/MFA native end-to-end, search index dedicated, full collaboration/review UI, complete REST versioning, production worker process terpisah, disaster recovery drill terotomasi, dan seluruh critical-path E2E. Rehearsal tetap offline dan aplikasi tidak melakukan target-facing execution otonom.
