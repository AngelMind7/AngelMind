# AngelMind

## Governed security research control plane

AngelMind adalah **control plane untuk security research yang telah memiliki otorisasi**. Aplikasi ini membantu organisasi mengelola workspace, program, policy, scope, passive inventory, rehearsal offline, observation, hypothesis, evidence, finding, report draft, audit, approval, notification, dan operational readiness dalam satu alur yang dapat ditinjau manusia.

> **Batas penting:** AngelMind bukan active scanner dan bukan autonomous exploitation platform. Release ini tidak menghubungi target, tidak menjalankan tool target-facing, tidak menyimpan credential value, dan tidak mengirim submission eksternal secara otomatis.

[![Status](https://img.shields.io/badge/status-production--shaped-22d3ee)](docs/blueprint-delivery-status.md)
[![Safety](https://img.shields.io/badge/execution-zero--network-fuchsia)](docs/governance.md)
[![Tests](https://img.shields.io/badge/tests-81%20unit%20%2B%2012%20E2E-22c55e)](#validasi)
[![License](https://img.shields.io/badge/license-private-lightgrey)](#)

---

## Daftar isi

- [Tujuan dan posisi produk](#tujuan-dan-posisi-produk)
- [Fitur yang tersedia](#fitur-yang-tersedia)
- [Arsitektur](#arsitektur)
- [Alur domain](#alur-domain)
- [Model governance dan safety](#model-governance-dan-safety)
- [Struktur repository](#struktur-repository)
- [Persyaratan](#persyaratan)
- [Menjalankan secara lokal](#menjalankan-secara-lokal)
- [Environment variables](#environment-variables)
- [Deploy ke Railway](#deploy-ke-railway)
- [Firebase dan Supabase](#firebase-dan-supabase)
- [Database dan migration](#database-dan-migration)
- [Perintah development dan validasi](#perintah-development-dan-validasi)
- [Observability dan health checks](#observability-dan-health-checks)
- [Research foundation Python](#research-foundation-python)
- [Deployment production checklist](#deployment-production-checklist)
- [Batas implementasi dan external blockers](#batas-implementasi-dan-external-blockers)
- [Dokumentasi lanjutan](#dokumentasi-lanjutan)

---

## Tujuan dan posisi produk

AngelMind dirancang untuk tim yang memerlukan **jejak keputusan yang dapat diaudit** sebelum, selama, dan sesudah pekerjaan security research yang sah. Fokus utama release ini adalah pengelolaan kontrol: siapa yang memiliki workspace, program apa yang berlaku, asset mana yang termasuk scope, policy apa yang disetujui, evidence apa yang mendukung finding, dan keputusan manusia apa yang mengizinkan perpindahan state.

Aplikasi ini tidak memberikan izin hukum atau teknis untuk menguji sistem. Pengguna tetap harus memiliki otorisasi tertulis, scope yang jelas, safe harbor yang sesuai, aturan engagement, dan proses responsible disclosure dari organisasi atau program terkait.

### Prinsip desain

| Prinsip | Penerapan di AngelMind |
|---|---|
| **Human accountability** | Approval, review, report readiness, dan tindakan sensitif tetap membutuhkan keputusan manusia. |
| **Workspace isolation** | Data sensitif dibatasi oleh workspace dan authorization guard server-side. |
| **Evidence first** | Finding harus berhubungan dengan evidence atau record yang dapat ditinjau, bukan sekadar output AI. |
| **Deterministic safety** | Scope, exclusion, budget, state transition, dan rehearsal guardrail dievaluasi secara deterministik. |
| **No hidden execution** | Public surface, API playground, rehearsal, dan approval tidak menyediakan jalur eksekusi target-facing tersembunyi. |
| **Honest readiness** | Provider, billing, backup, webhook, dan live operations tidak dianggap aktif sebelum environment benar-benar dikonfigurasi. |

---

## Fitur yang tersedia

### Workspace dan governance

Workspace menyimpan program name, safe harbor, code of conduct, allowlist, exclusions, budget ceiling, session limit, cooldown, retention policy, owner, member role, dan lifecycle status. Semua operasi sensitif menggunakan authorization guard untuk memeriksa akses user, workspace, ownership, dan role.

### Research workflow

Research workflow mendukung program scope normalization, overlap dan exclusion guard, asset inventory pasif, research session state, task dependency, observation, hypothesis, evidence link, finding lifecycle, duplicate candidate, retest record, report draft, report version, dan comparison antarversi.

### Findings dan reporting

Finding memiliki fingerprint untuk deduplication, confidence, impact summary, report draft, evidence reference, status transition, human review status, comment, mention, dan notification. Report dapat disimpan sebagai draft, dibuatkan version, dibandingkan, divalidasi, dipreview, dan diekspor melalui contract yang tersedia.

Submission tracking tersedia sebagai **tracking dan readiness workflow**, bukan autonomous submission. External submission tetap memerlukan konfigurasi provider, review, dan keputusan organisasi.

### AI platform

AI platform menyediakan registry model, gateway metadata, health status, latency dan error metadata, budget ceiling per workspace, AI run trace, input/output reference, terminal billing idempotency, evaluation rubric, retention policy, job queue, retry, lease recovery, dead-letter state, serta deterministic multi-agent orchestration contract.

Orchestration multi-agent saat ini meliputi planner, role assignment, dependency gating, cross-check, confidence filtering, synthesis, dan human-review signal. Provider execution dan persistent agent-run graph tetap bergantung pada environment serta deployment worker yang sesuai.

### Operations dan observability

Repository menyediakan health endpoint, readiness endpoint, Prometheus-compatible metrics, trace ID, incident workflow, audit archive contract, restore planning, maintenance callback, outbox event, idempotency key, notification cursor, dan scheduler boundary.

### Public product surface

Public surface mencakup halaman product, features, docs, how it works, programs, researchers, Trust Center, API playground read-only, pricing informational, demo synthetic read-only, changelog, roadmap, status, academy, contact, privacy, terms, cookies, acceptable use, responsible disclosure, dan data processing.

---

## Arsitektur

```text
Browser / PWA
    │
    ├── React + TypeScript + Vite
    ├── Firebase Web SDK
    │     ├── Firebase Auth
    │     └── Firebase App Check
    │
    ▼
Express control plane
    │
    ├── tRPC routers
    ├── Server-side authorization guards
    ├── Drizzle ORM
    │     └── MySQL / TiDB sebagai source of truth
    ├── Firebase Admin token verification
    ├── Supabase Storage reference dan evidence digest
    ├── AI model/run/job contracts
    └── /healthz · /readyz · /metrics
```

### Pembagian tanggung jawab

| Plane | Tanggung jawab | Implementasi saat ini |
|---|---|---|
| **Control plane** | Workspace, roles, scope, governance, audit, findings, reports, operations | React, Express, tRPC, Drizzle, MySQL/TiDB |
| **Safety plane** | Scope matching, exclusion, policy tier, budget/session guard, offline rehearsal | TypeScript guardrails dan Python reference package |
| **Identity plane** | Browser authentication dan server-side token verification | Firebase Auth dan Firebase Admin |
| **Storage plane** | Object/evidence storage dengan reference dan digest | Supabase Storage server-side |
| **AI platform plane** | Model metadata, AI run ledger, queue, evaluation, orchestration contract | TypeScript services dan database schema |
| **Future research plane** | Capability yang mungkin target-facing | Sengaja berada di luar scope release ini |

**MySQL/Drizzle tetap menjadi source of truth** untuk user, organization, workspace, policy, research record, finding, report, audit, dan metadata evidence. Firebase bukan pengganti database utama. Credential value tidak disimpan di dashboard; sistem hanya dapat menyimpan secret reference yang dibatasi scope.

---

## Alur domain

Alur domain utama adalah:

```text
Scope
  → Asset
  → Observation
  → Hypothesis
  → Task
  → Evidence
  → Finding
  → Report draft/version
  → Review/Submission tracking
  → Audit/Operations
```

Setiap objek operasional membawa `workspaceId` atau relasi workspace ekuivalen. Query dan mutation sensitif harus melewati authorization guard sebelum data dibaca atau diubah.

---

## Model governance dan safety

| Tier | Contoh | Perlakuan |
|---|---|---|
| **Tier 1** | Scope parsing, policy review, coverage planning, rehearsal | Dapat berjalan dalam workspace policy yang valid. |
| **Tier 2** | Proposal capability non-destruktif di masa depan | Memerlukan owner notification dan policy gate. |
| **Tier 3** | Privileged proof atau proposal destruktif | Diblokir sampai terdapat human approval; approval tidak otomatis mengeksekusi target action. |

Default behavior release ini adalah:

- Tidak ada active scan, exploit, credential attack, atau target-facing request.
- Rehearsal bersifat plan-only, deterministic, zero network call, dan zero tool execution.
- External submission tidak otomatis dilakukan.
- Webhook memerlukan draft HTTPS yang terkonfirmasi, secret reference, owner request, dan reviewer decision.
- Evidence dibatasi workspace, memiliki metadata waktu, dan menggunakan digest/reference yang dapat diaudit.
- AI output tidak boleh langsung menjadi finding tanpa lifecycle, evidence, dan review yang sesuai.
- Approval merupakan record keputusan manusia, bukan execution primitive.

---

## Struktur repository

```text
.
├── client/                 # React frontend, routes, contexts, pages, UI
├── server/                 # Express, tRPC routers, domain services, auth guards
│   ├── _core/              # Runtime, env loader, Firebase, storage, health
│   ├── control-plane/      # Governance, findings, evidence, reports, operations
│   ├── ai-platform.ts      # AI runs, models, jobs, outbox, evaluations
│   └── ai-orchestration.ts # Planner, assignment, cross-check, synthesis
├── drizzle/                # MySQL schema, generated migrations, snapshots
├── research-service/       # Python reference contracts dan deterministic tests
├── e2e/                    # Playwright public safety boundary tests
├── docs/                   # Architecture, deployment, governance, runbooks
├── scripts/                # Build/performance validation utilities
├── Dockerfile              # Multi-stage production container
├── docker-compose.yml      # Local container profile dengan MySQL
├── package.json            # Scripts dan dependencies
└── .env.example            # Template environment variables
```

Folder dan file yang tidak menjadi runtime utama tetap harus diperlakukan sebagai dokumentasi atau reference-only. Lihat [`docs/repository-structure.md`](docs/repository-structure.md) untuk aturan boundary repository.

---

## Persyaratan

Untuk development lokal, gunakan:

| Komponen | Minimum/rekomendasi |
|---|---|
| Node.js | 22 atau lebih baru |
| pnpm | Versi yang kompatibel dengan `packageManager` di `package.json` |
| Python | 3.12 atau lebih baru untuk research foundation |
| MySQL/TiDB | Diperlukan untuk persistence workflow penuh |
| Firebase project | Diperlukan untuk login dan token verification nyata |
| Supabase project | Diperlukan jika object/evidence storage diaktifkan |

---

## Menjalankan secara lokal

```bash
git clone https://github.com/AngelMind7/AngelMind.git
cd AngelMind
pnpm install
cp .env.example .env
```

Isi minimal `DATABASE_URL` jika ingin menjalankan persistence. Untuk Firebase login nyata, isi konfigurasi Firebase Web dan Firebase Admin. Setelah itu jalankan:

```bash
pnpm dev
```

Frontend development berjalan melalui Vite. Untuk mode production-like, gunakan build dan start command:

```bash
pnpm build
pnpm start
```

Jangan gunakan `pnpm dev` sebagai start command production.

---

## Environment variables

Gunakan [`.env.example`](.env.example) sebagai sumber nama variable. Jangan commit `.env`, Firebase service-account JSON, private key, access token, AI key, atau secret provider apa pun.

### Database dan runtime

| Variable | Wajib | Keterangan |
|---|---:|---|
| `DATABASE_URL` | Ya untuk production | Connection string MySQL/TiDB. |
| `APP_ENCRYPTION_KEY` | Ya untuk archive signing | Secret panjang random untuk signing audit archive. |
| `NODE_ENV` | Direkomendasikan | Set `production` pada deployment production. |
| `PORT` | Tidak | Biasanya disediakan otomatis oleh Railway; server membaca port runtime. |

Nilai `APP_ENCRYPTION_KEY` harus dibuat dan disimpan langsung oleh operator melalui secret manager atau Railway Variables. Nilai aktualnya sengaja tidak didokumentasikan di repository, README, issue, log, atau chat.

### Firebase Web

Variable berikut dibaca saat frontend build dan boleh terlihat di browser sebagai konfigurasi public Firebase Web App:

Nama variable Firebase Web yang diperlukan dapat dilihat di [`.env.example`](.env.example). README ini tidak memuat nilai konfigurasi Firebase, project identifier privat, site key, atau credential apa pun.

Setelah mengubah variable `VITE_*` di Railway, lakukan redeploy karena nilainya dibundel pada saat build frontend.

### Firebase Admin

Variable berikut hanya untuk server:

Variable Firebase Admin dan admin allowlist harus diisi melalui secret manager atau Railway Variables. Nilai service account, private key, Firebase UID, dan identifier internal sengaja tidak ditampilkan di README. Jangan masukkan private key ke source code, frontend, issue, log, atau dokumentasi publik.

### Supabase Storage

Jika storage evidence/archive digunakan, isi:

Nama variable Supabase Storage tersedia di [`.env.example`](.env.example). URL project, nama bucket internal, dan service-role value harus diambil langsung oleh operator dari secret manager atau dashboard Supabase. `SUPABASE_SERVICE_ROLE_KEY` wajib server-only dan tidak boleh diubah menjadi variable `VITE_*`.

### Scheduler, AI provider, notification, dan analytics

Nama variable untuk Railway Cron, AI provider, notification webhook, dan analytics tersedia di [`.env.example`](.env.example). Nilai secret, endpoint internal, model identifier, webhook URL, analytics identifier, dan konfigurasi provider harus diisi langsung oleh operator pada secret manager atau Railway Variables. README ini sengaja tidak menyertakan contoh value, placeholder endpoint, token, key, UID, atau identifier internal.

Jika provider atau integrasi belum tersedia, biarkan variable terkait tidak dikonfigurasi. Jangan mengisi endpoint, key, token, atau secret palsu.

In-app notification tetap menjadi source of truth jika outbound webhook belum dikonfigurasi. Analytics juga aman dibiarkan kosong.

---

## Deploy ke Railway

Railway dapat digunakan sebagai Node service untuk control plane AngelMind. Hubungkan repository ini ke satu service aplikasi dan sediakan MySQL/TiDB sebagai service database atau database terkelola yang dapat diakses dari service aplikasi.

### Pengaturan service

| Railway setting | Nilai |
|---|---|
| Builder | Railpack atau builder yang mendukung Node/pnpm |
| Build command | `pnpm build` |
| Start command | `pnpm start` |
| Healthcheck path | `/healthz` |
| Serverless | Off |
| Teardown | Off |
| Restart policy | On Failure |
| Cron schedule | Kosongkan sampai maintenance callback dikonfigurasi |

### Environment variables minimum Railway

Untuk production control plane, isi minimal:

Daftar **nama variable** yang diperlukan dapat dirujuk dari [`.env.example`](.env.example). Nilai aktual untuk database, identity, storage, scheduler, AI, webhook, dan analytics harus diisi langsung di Railway Variables atau secret manager. README tidak menyimpan atau menampilkan value, token, key, UID, domain privat, maupun identifier internal.

### Verifikasi setelah deploy

Akses endpoint health melalui domain deployment yang hanya diketahui operator. Jangan menuliskan domain privat, URL internal, atau response yang mengandung data environment ke README, issue, log publik, atau chat.

`/healthz` menunjukkan bahwa proses HTTP hidup. `/readyz` memeriksa readiness configuration boundary. `/metrics` menyediakan metrik proses yang dapat dikonsumsi oleh sistem observability.

### Catatan database Railway

Pastikan `DATABASE_URL` menunjuk ke database yang benar sebelum menjalankan migration. Jangan menjalankan migration production dengan URL lokal atau database yang salah.

---

## Firebase dan Supabase

Firebase Auth adalah jalur identity utama untuk browser. Firebase Admin digunakan server untuk verifikasi token. App Check dapat diaktifkan ketika konfigurasi site key dan deployment Firebase sudah siap.

`firebase.json` menyediakan konfigurasi emulator untuk development lokal. Cloud Functions tidak diperlukan agar service utama berjalan di Railway; jika organisasi memakai Cloud Functions, deploy sebagai service terpisah dengan lifecycle dan secret management sendiri.

Supabase Storage digunakan dari backend untuk object/evidence storage. Frontend tidak boleh menerima service-role key. Database utama tetap MySQL/TiDB, sedangkan Supabase menyimpan object dan reference metadata sesuai boundary storage.

---

## Database dan migration

Schema berada di [`drizzle/schema.ts`](drizzle/schema.ts), sedangkan migration berada di folder [`drizzle/`](drizzle/). Migration terbaru mencakup domain workspace, governance, research, evidence, reports, submissions, notification, jobs, outbox, AI runs, evaluations, dan retention metadata.

Untuk generate migration dari perubahan schema:

```bash
pnpm exec drizzle-kit generate --name=nama_migration
```

Untuk menjalankan migration pada database yang telah dikonfirmasi:

```bash
pnpm db:push
```

Perintah `pnpm db:push` menjalankan generate dan migrate berdasarkan konfigurasi repository. Gunakan secara hati-hati pada production dan lakukan backup sesuai prosedur deployment sebelum perubahan schema yang berisiko.

---

## Perintah development dan validasi

| Command | Fungsi |
|---|---|
| `pnpm dev` | Menjalankan server development dengan watch mode. |
| `pnpm build` | Build frontend Vite dan server production bundle. |
| `pnpm start` | Menjalankan `dist/index.js` dalam mode production. |
| `pnpm check` | TypeScript type-check tanpa emit. |
| `pnpm test` | Menjalankan unit/integration test Vitest. |
| `pnpm test:e2e` | Menjalankan Playwright safety boundary E2E. |
| `pnpm test:python` | Menjalankan pytest research foundation. |
| `pnpm lint:python` | Menjalankan Ruff pada research foundation. |
| `pnpm check:budget` | Memeriksa raw dan gzip JavaScript bundle budget setelah build. |
| `pnpm format` | Menjalankan Prettier. |
| `pnpm db:push` | Generate dan apply Drizzle migration. |

Validasi CI mencakup type-check, unit test, build, manifest/PWA validation, Python test, Python lint, dan pemeriksaan perubahan whitespace. Browser E2E dapat dijalankan lokal atau melalui workflow dengan `E2E_BASE_URL` deployment yang sesuai.

---

## Observability dan health checks

Endpoint operasional yang tersedia:

| Endpoint | Tujuan |
|---|---|
| `/healthz` | Memastikan process HTTP hidup. |
| `/readyz` | Menunjukkan readiness configuration, terutama database pada production. |
| `/metrics` | Menyediakan metrik proses dalam format Prometheus-compatible. |

Gunakan trace ID dan audit record ketika melakukan investigasi incident. Jangan memasukkan secret, token, private key, atau data sensitif ke log maupun issue publik.

---

## Research foundation Python

Folder [`research-service/`](research-service/) berisi reference package Python untuk deterministic planner, safety guardrail, contract, dan invariant-oriented test. Package ini bukan active scanner dan tidak menyediakan target-facing execution capability.

Jalankan validasinya dengan:

```bash
pnpm test:python
pnpm lint:python
```

Research foundation harus tetap konsisten dengan prinsip zero network call dan zero tool execution pada rehearsal/dry-run boundary.

---

## Deployment production checklist

Sebelum production go-live, operator deployment perlu memastikan hal berikut:

| Pemeriksaan | Status yang diharapkan |
|---|---|
| Database | `DATABASE_URL` menunjuk ke database production yang benar dan migration telah diterapkan. |
| Identity | Firebase Web dan Firebase Admin configuration berasal dari project yang benar. |
| Admin access | `ADMIN_FIREBASE_UIDS` hanya berisi UID yang memang berwenang. |
| Secrets | Secret disimpan di Railway Variables/secret manager dan tidak muncul di source/log. |
| Storage | Supabase bucket, policy, dan service-role access telah diverifikasi. |
| Domain | Railway domain atau custom domain telah diuji melalui HTTPS. |
| Health | `/healthz`, `/readyz`, dan `/metrics` merespons sesuai ekspektasi. |
| Backup | Backup dan restore drill database/object storage telah diuji oleh operator. |
| Cron | Cron hanya diaktifkan setelah `RAILWAY_CRON_SECRET` dan callback diverifikasi. |
| AI | Provider, budget, retention, rate limit, dan fallback telah direview. |
| Webhook | Endpoint HTTPS, secret reference, owner request, dan reviewer gate telah diuji. |
| Legal | Terms, privacy, data processing, retention, dan responsible disclosure telah direview organisasi. |
| E2E | Public safety boundary dan authenticated critical flows telah diuji terhadap deployment. |

---

## Batas implementasi dan external blockers

Repository ini sengaja membedakan antara **implementasi teknis** dan **aktivasi environment**. Kontrak, schema, route, authorization, UI path, tests, dan disabled-by-default boundary telah dibangun di repository. Beberapa kemampuan belum dapat dianggap aktif sebelum operator menyediakan environment eksternal.

| Area | Mengapa belum aktif otomatis |
|---|---|
| AI provider live execution | Membutuhkan provider account, API key, model selection, budget, dan operational monitoring. |
| Webhook/outbound notification | Membutuhkan endpoint HTTPS nyata, secret, owner authorization, dan review. |
| Billing/payment | Membutuhkan payment provider account, pricing decision, webhook, dan reconciliation process. |
| Backup/restore production | Membutuhkan storage/database deployment serta drill operasional nyata. |
| Persistent workers | Membutuhkan worker service, queue runtime, scheduling, alerting, dan retry policy production. |
| Live AI memory retrieval/purge | Membutuhkan storage design, retention worker, indexing, dan privacy review. |
| DNS dan custom domain | Membutuhkan akses domain operator dan konfigurasi DNS production. |
| Legal/compliance | Membutuhkan approval organisasi dan review yurisdiksi yang tidak dapat dipalsukan oleh kode. |

External blocker tidak berarti contract atau boundary-nya hilang. Artinya, repository menyediakan jalur aman dan eksplisit, tetapi aktivasi production harus dilakukan oleh pemilik environment.

---

## Dokumentasi lanjutan

| Dokumen | Fokus |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | Service boundary, domain flow, dan governance model. |
| [`docs/deployment.md`](docs/deployment.md) | Deployment environment, Railway, Firebase, Supabase, dan runtime configuration. |
| [`docs/production-runbook.md`](docs/production-runbook.md) | Checklist dan prosedur production. |
| [`docs/governance.md`](docs/governance.md) | Policy, human review, dan safety boundary. |
| [`docs/policy-governance.md`](docs/policy-governance.md) | Tier decision dan authorization matrix. |
| [`docs/operations.md`](docs/operations.md) | Scheduling, maintenance, incident, dan operational controls. |
| [`docs/team-access.md`](docs/team-access.md) | Workspace roles dan access model. |
| [`docs/audit-archives.md`](docs/audit-archives.md) | Signed archive, verification, dan restore planning. |
| [`docs/webhook-drafts.md`](docs/webhook-drafts.md) | Outbound delivery boundary. |
| [`docs/readiness-roadmap.md`](docs/readiness-roadmap.md) | Gap production-readiness yang masih tersisa. |
| [`docs/master-blueprint-alignment.md`](docs/master-blueprint-alignment.md) | Mapping blueprint terhadap implementasi. |
| [`docs/blueprint-delivery-backlog.md`](docs/blueprint-delivery-backlog.md) | Status delivery per area blueprint. |
| [`docs/repository-structure.md`](docs/repository-structure.md) | Folder aktif dan repository boundary. |
| [`docs/legal-compliance.md`](docs/legal-compliance.md) | Retention, audit, privacy, dan compliance posture. |

---

## Status validasi

README ini mengikuti kondisi kode yang benar-benar ada di branch `main`. Validasi terakhir mencakup TypeScript type-check, unit/integration tests, production build, Python pytest, Python Ruff, PWA validation, JavaScript bundle budget, `git diff --check`, dan public safety E2E desktop/mobile.

Perubahan dokumentasi atau konfigurasi tidak boleh digunakan untuk mengklaim certification, uptime, customer adoption, provider activation, atau legal approval yang belum diverifikasi oleh deployment operator.

## License dan penggunaan

Repository ini bersifat private sesuai konfigurasi organisasi. Gunakan hanya untuk tujuan yang sah, terotorisasi, dan sesuai kebijakan organisasi. Untuk pertanyaan deployment, gunakan issue atau channel internal yang telah ditetapkan; jangan mengirim credential atau secret ke issue, chat, commit, atau pull request.
