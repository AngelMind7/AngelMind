# AngelMind

## Governed security research operations

AngelMind adalah **control plane internal** untuk mengelola program security research yang telah memiliki otorisasi. Aplikasi ini membantu tim menetapkan scope, merekam policy, merencanakan rehearsal offline, mengelola finding dan evidence, serta menjaga approval manusia tetap terlihat di setiap boundary penting.

> AngelMind bukan active scanner. Sistem ini tidak memberikan izin untuk menguji target, mengakses data, mengeksploitasi sistem, atau mengirim laporan eksternal tanpa otorisasi tertulis dan approval yang sesuai.

[![Status](https://img.shields.io/badge/status-production--shaped-22d3ee)](docs/blueprint-delivery-status.md)
[![Safety](https://img.shields.io/badge/execution-zero--network-fuchsia)](docs/governance.md)
[![License](https://img.shields.io/badge/license-private-lightgrey)](#)

## Apa yang sudah tersedia

| Area | Implementasi |
|---|---|
| Workspace governance | Workspace owner, role, safe harbor, code of conduct, allowlist, exclusion, budget, session limit, cooldown, retention, dan lifecycle state |
| Rehearsal workflow | Rencana deterministik berbasis observasi, estimasi biaya/waktu, dan jaminan zero network call serta zero tool execution |
| Policy and approvals | Klasifikasi Tier 1/2/3, approval record, owner notification, delegated review, dan human gate untuk tindakan sensitif |
| Findings and evidence | Intake deduplicated, lifecycle, confidence/impact, report draft, workspace isolation, SHA-256 evidence reference, dan audit trail |
| Operations | Run ledger, checkpoints, signed audit archive, readiness endpoint, maintenance callback, dan operational analytics |
| Public surface | Product, features, docs, Trust Center, pricing, changelog, roadmap, status, academy, contact, serta halaman legal |
| Localization and UX | 20 locale, timezone-aware date, RTL support, responsive mobile layout, dark control-plane theme, dan public PWA shell |
| Research foundation | Python contracts, deterministic guardrails, safe planner, property-oriented invariant tests, tanpa active capability integration |
| Deployment | Railway-compatible Node service, Docker multi-stage image, Docker Compose + MySQL, health checks, Prometheus metrics, dan CI validation |
| Firebase identity | Firebase Auth, Firebase Admin token verification, App Check reCAPTCHA Enterprise, dan emulator config; file storage production menggunakan Supabase Storage |

## Arsitektur singkat

```text
Browser / PWA
    │
    ├── React + TypeScript + Vite
    ├── Firebase Web SDK (Auth, App Check)
    │
    ▼
Express control plane
    ├── tRPC routers + authorization guards
    ├── MySQL/TiDB via Drizzle — source of truth
    ├── Firebase Admin (opsional: token verification, Storage)
    ├── Managed storage reference + SHA-256 evidence digest
    └── /healthz · /readyz · /metrics
```

**MySQL/Drizzle tetap menjadi source of truth** untuk user, workspace, finding, policy, audit, dan metadata evidence. Firebase dipakai sebagai layanan pendukung, bukan sebagai pengganti database utama.

## Menjalankan secara lokal

Persyaratan minimum adalah Node.js 22 atau lebih baru, pnpm, Python 3.12 atau lebih baru untuk research foundation, serta database MySQL/TiDB jika ingin menjalankan workflow yang memakai persistence.

```bash
git clone https://github.com/AngelMind7/AngelMind.git
cd AngelMind
pnpm install
cp .env.example .env
# Isi DATABASE_URL dan JWT_SECRET untuk mode lokal yang terhubung database.
pnpm dev
```

Perintah verifikasi yang tersedia:

```bash
pnpm check
pnpm test
pnpm build
pnpm test:e2e
pnpm test:python
pnpm lint:python
```

Frontend development berjalan pada mode Vite, sedangkan server production menggunakan bundle `dist/index.js`. Jangan gunakan `pnpm dev` sebagai start command production.

## Konfigurasi environment

Gunakan `.env.example` sebagai template. Jangan commit `.env`, service-account JSON, private key, access token, atau credential provider apa pun.

| Kelompok | Variable utama | Keterangan |
|---|---|---|
| Database and runtime | `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV` | Database dan session/security configuration |
| Firebase Auth | `VITE_FIREBASE_*`, `FIREBASE_*` | Google Sign-In di browser dan token verification di server |
| Firebase Web | `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` | Public browser configuration; dibaca saat frontend build |
| Firebase App Check | `VITE_FIREBASE_APPCHECK_SITE_KEY` | Site key reCAPTCHA Enterprise; aktif production-only jika konfigurasi lengkap |
| Firebase Admin | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Server-side token verification; jangan pernah diletakkan di frontend |

Firebase client tetap disabled jika konfigurasi public belum lengkap. Firebase Admin mengembalikan error terkontrol jika credential server belum tersedia. Supabase Storage membutuhkan `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, dan `SUPABASE_STORAGE_BUCKET`. AI menggunakan 9Router primary dan OmniRoute fallback melalui `LLM_*` variables.

## Deploy ke Railway

Buat satu service Node dari repository ini, hubungkan MySQL, lalu gunakan pengaturan berikut:

| Railway setting | Nilai |
|---|---|
| Builder | Railpack |
| Custom Build Command | `pnpm build` |
| Custom Start Command | `pnpm start` |
| Healthcheck Path | `/healthz` |
| Serverless | Off |
| Teardown | Off |
| Restart Policy | On Failure |
| Cron Schedule | Kosongkan kecuali maintenance callback memang sudah dikonfigurasi |

Setelah menambahkan variable `VITE_*`, lakukan **redeploy** karena nilainya dimasukkan ke bundle frontend saat build. Setelah deployment, periksa:

```bash
curl https://YOUR-RAILWAY-DOMAIN/healthz
curl https://YOUR-RAILWAY-DOMAIN/readyz
curl https://YOUR-RAILWAY-DOMAIN/metrics
```

`/healthz` memeriksa proses, `/readyz` memeriksa readiness konfigurasi runtime, sedangkan `/metrics` menyediakan metrik proses dalam format Prometheus-compatible. Nilai credential tidak perlu dan tidak boleh dikirim ke chat atau dimasukkan ke repository.

## Firebase Auth, Supabase Storage, dan App Check

Firebase Auth adalah jalur autentikasi utama deployment ini. Untuk mengaktifkan sisi browser, isi seluruh `VITE_FIREBASE_*` dan site key App Check bila App Check digunakan. Untuk sisi server, isi Firebase Admin variables melalui Railway secret variables atau secret manager.

Firebase Auth dan App Check dipakai untuk identitas serta proteksi browser. File evidence production disimpan melalui Supabase Storage dari backend; service-role key tidak boleh diekspos ke frontend.

`firebase.json` tetap menyediakan konfigurasi emulator untuk local development. Cloud Functions tidak diperlukan di Railway kecuali fungsi tersebut memang dideploy sebagai service terpisah di Firebase.

## Container deployment

Profil container lokal tersedia melalui Docker Compose:

```bash
export MYSQL_PASSWORD='use-a-secret-manager-value'
export MYSQL_ROOT_PASSWORD='use-a-different-secret-manager-value'
export JWT_SECRET='use-a-long-random-secret'
docker compose up --build -d
```

Image production menggunakan multi-stage build, non-root user, read-only filesystem dengan `/tmp` sementara, serta healthcheck. `infrastructure/prometheus.yml` berisi konfigurasi scrape untuk endpoint metrics. Container workflow di GitHub hanya memvalidasi image dan tidak mempublikasikan image atau menangani secret.

## Safety boundaries

| Boundary | Default behavior |
|---|---|
| Target interaction | Tidak ada active scan, exploit, credential attack, atau target-facing request |
| External submission | Tidak ada autonomous submission; webhook memerlukan draft, HTTPS, secret reference, owner request, dan reviewer decision |
| Research planning | Plan-only, deterministic, zero network call, zero tool execution |
| Evidence | Workspace-scoped, hashed, time-aware, dan dapat diaudit |
| Privileged action | Tier 3 diblokir sampai human approval tersedia |
| Data access | Authorization check dan workspace isolation dilakukan di server |

Fitur target-facing hanya boleh dipertimbangkan sebagai capability terpisah setelah ada scope tertulis, legal review, threat model, rate/budget guard, approval flow, audit evidence, dan independent security review.

## Dokumentasi

| Dokumen | Fokus |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | Service boundary dan domain flow |
| [`docs/governance.md`](docs/governance.md) | Policy, approval, dan safety gate |
| [`docs/policy-governance.md`](docs/policy-governance.md) | Tier decision dan authorization matrix |
| [`docs/operations.md`](docs/operations.md) | Deployment, scheduling, dan maintenance |
| [`docs/production-runbook.md`](docs/production-runbook.md) | Checklist operasi production |
| [`docs/legal-compliance.md`](docs/legal-compliance.md) | Retention, audit, dan compliance posture |
| [`docs/team-access.md`](docs/team-access.md) | Workspace roles dan access model |
| [`docs/audit-archives.md`](docs/audit-archives.md) | Signed archive dan restore planning |
| [`docs/webhook-drafts.md`](docs/webhook-drafts.md) | Outbound delivery boundary |
| [`docs/readiness-roadmap.md`](docs/readiness-roadmap.md) | Gap production-readiness yang masih tersisa |
| [`docs/master-blueprint-alignment.md`](docs/master-blueprint-alignment.md) | Mapping blueprint ke implementasi |
| [`docs/repository-structure.md`](docs/repository-structure.md) | Folder aktif, boundary runtime, dan aturan struktur |

## Status validasi

Validasi repository mencakup **TypeScript type-check, unit test, production build, Python research foundation tests, Python Ruff lint, PWA manifest validation, dan `git diff --check`**. Browser E2E tetap dijalankan terhadap deployment melalui workflow manual karena membutuhkan `E2E_BASE_URL`. CI menjalankan type-check, test, build, manifest validation, Python tests, dan Python lint pada push serta pull request.

README ini menjelaskan kondisi kode yang benar-benar ada. Integrasi production tetap memerlukan konfigurasi provider, secret manager, domain, database, retention policy, dan approval organisasi dari operator deployment.
