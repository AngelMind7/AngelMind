# Deployment AngelMind

AngelMind adalah aplikasi Node.js/React yang dideploy sebagai satu service container. **GitHub** menjadi sumber kode dan pipeline CI, **Firebase Authentication** menjadi sumber identitas, **Railway** menjalankan API dan worker HTTP terjadwal, sedangkan **Supabase Storage** menyimpan binary evidence dan audit archive. Database aplikasi tetap menggunakan MySQL/TiDB yang kompatibel dengan Drizzle dan dapat dijalankan sebagai service database Railway.

## Runtime flow

Setiap request terproteksi mengikuti alur berikut:

> Browser Firebase session → Firebase ID token → `Authorization: Bearer` → Firebase Admin verification → user upsert → workspace authorization → domain service → database/Supabase Storage → audit event.

Aplikasi tidak membuat session cookie custom. Logout menghapus sesi Firebase di browser, sementara endpoint API tetap stateless dan memvalidasi token pada setiap request.

## Environment variables

Salin `.env.example` ke secret manager atau environment variables Railway. Jangan commit file `.env` atau service-role key.

| Kelompok | Variabel | Keterangan |
| --- | --- | --- |
| Database | `DATABASE_URL` | Connection string MySQL/TiDB Railway. |
| Audit | `APP_ENCRYPTION_KEY` | Secret server-only untuk menandatangani audit archive. |
| Identity | `VITE_FIREBASE_*` | Konfigurasi Firebase browser yang aman diekspos ke bundle. |
| Identity | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Kredensial Firebase Admin untuk verifikasi token di server. |
| Authorization | `ADMIN_FIREBASE_UIDS` | Daftar UID Firebase admin, dipisahkan koma. Role tidak ditentukan dari frontend. |
| Storage | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` | Supabase Storage server-only untuk evidence dan archive. |
| Scheduler | `RAILWAY_CRON_SECRET` | Secret header untuk callback cron internal. |
| AI | `LLM_PRIMARY_*`, `LLM_FALLBACK_*` | Endpoint OpenAI-compatible yang dipanggil hanya dari server. |
| Notification | `NOTIFICATION_WEBHOOK_URL`, `NOTIFICATION_WEBHOOK_SECRET` | Opsional; in-app notification tetap menjadi source of truth. |

## Railway

Repository sudah menyediakan `Dockerfile` multi-stage dan `railway.toml`. Hubungkan service Railway ke repository GitHub, pilih deploy dari `main`, lalu set environment variables di Railway. **Isi seluruh `VITE_FIREBASE_*` sebelum deploy ulang** karena nilainya dimasukkan ke bundle browser pada tahap Docker build; kredensial `FIREBASE_*` tanpa prefix `VITE_` tetap dibaca saat runtime oleh Firebase Admin. Pastikan domain Railway publik juga terdaftar di Firebase Authentication → Settings → Authorized domains, dan Google diaktifkan sebagai provider. Health check menggunakan `/healthz`; readiness menggunakan `/readyz`. Railway memberikan nilai `PORT`, dan server membacanya secara dinamis.

Untuk maintenance terjadwal, konfigurasi Railway Cron pada `railway.toml` menjalankan batch setiap 15 menit. Scheduler eksternal juga dapat memanggil endpoint yang sama. Tanpa body, endpoint memproses semua workspace aktif yang memiliki task reference; untuk retry terarah, kirim body berikut:

```text
POST /api/scheduled/workspace-maintenance
x-railway-cron-secret: $RAILWAY_CRON_SECRET
content-type: application/json

{"taskUid":"railway:workspace:<workspace-id>"}
```

Task reference disimpan pada kolom `workspaces.scheduleCronTaskUid`. Endpoint menolak request tanpa secret yang cocok atau task UID yang tidak valid. Pemeriksaan ini bersifat metadata-only dan tidak melakukan interaksi aktif terhadap target.

## Local development

Gunakan `docker compose up --build` setelah mengisi `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`, dan `APP_ENCRYPTION_KEY`. Untuk frontend login lokal, daftarkan domain `localhost` pada Firebase Authentication dan isi `VITE_FIREBASE_*`. Supabase Storage tetap dipanggil server-side.

## Release gate

Sebelum merge atau deploy, jalankan `pnpm check`, `pnpm test -- --run`, `pnpm build`, dan `git diff --check`. Pipeline GitHub Actions menjalankan type-check, test, production build, PWA manifest validation, Python safety tests, container build, dependency audit, dan smoke test sesuai workflow yang tersedia.

## Safe passive runtime binaries

The Node runtime image includes only low-risk offline/passive utilities from Debian packages: `binutils`, `ca-certificates`, `dnsutils`, `file`, `jq`, `ripgrep`, `yara`, and `whois`. They are installed during the runtime Docker stage and are available to future isolated adapters through explicit allowlisting. Active scanners, exploit frameworks, credential tooling, phishing tooling, remote execution, lateral movement, persistence, and C2 binaries are intentionally excluded from the Railway image.

Python-based passive tooling is deliberately separated into `Dockerfile.research`, based on Python 3.12. The image installs the pinned `checkdmarc==5.17.5` and `dnspython==2.8.0` dependencies from `research-service/`. This avoids pretending that a Node image can provide the correct Python runtime and keeps Python dependencies out of the web process. Deploy it as a separate Railway worker/service only after adding a scoped worker command and service-level network policy.

Installing a binary does not grant execution permission. The catalog and tool API remain metadata-only until a tool has a canonical source, pinned version, dependency review, adapter contract, scope policy, and passing health test.

## Operational boundaries

No target-facing integration is shipped or activated by this dashboard. Any future authorized research worker must obtain only policy-approved, workspace-scoped work from the control plane and must treat a missing, blocked, or expired approval as a hard stop.

## Production deployment pipeline

The repository includes a manual `.github/workflows/deploy-production.yml` workflow. It runs inside the protected GitHub `production` environment and requires `DEPLOY-PRODUCTION` confirmation, a verified GHCR `release-*` image, an expected commit, and a production HTTPS URL. Before the provider deployment hook is called, the workflow verifies the keyless Cosign signature. After the hook returns, it polls `/healthz`, validates the deployed commit, and checks `/readyz` and `/metrics` before retaining deployment evidence.

Configure `PRODUCTION_DEPLOY_HOOK_URL` and `PRODUCTION_DEPLOY_HOOK_TOKEN` as secrets on the protected `production` environment. The hook is provider-neutral so Railway, a container platform, or an organization-owned deployment controller can consume the immutable release image without exposing provider credentials to the repository. The workflow is manual by design and does not deploy merely because code is pushed to `main`.

## Monitoring and alerting

Prometheus alert rules are versioned in `config/monitoring/angelmind-alerts.yml` and cover readiness/provider failure, runtime/database readiness, HTTP error and slow-request budgets, and purge worker health. `config/monitoring/alertmanager.yml` routes warning and critical events separately, sends resolved notifications, and inhibits lower-severity alerts when a critical service alert is active. Configure `ALERTMANAGER_WEBHOOK_URL` and `ALERTMANAGER_CRITICAL_WEBHOOK_URL` only in the monitoring environment; no webhook URL or credential belongs in the repository. Run `pnpm check:monitoring-contract` before deploying a monitoring configuration change.

## Database management and automatic migrations

`.github/workflows/migrate-database.yml` is the only supported automatic migration path for protected staging or production environments. It requires the GitHub environment approval, `BACKUP-COMPLETED`, and `APPLY-MIGRATIONS` confirmations; serializes migrations per target environment; installs the locked dependency tree; runs database schema, journal, safety, and rollback contracts; requests a provider backup checkpoint; applies forward-only Drizzle migrations; and uploads migration evidence.

Configure `DATABASE_URL`, `DATABASE_BACKUP_HOOK_URL`, and `DATABASE_BACKUP_HOOK_TOKEN` as secrets on each protected environment. The backup hook must return a successful checkpoint response before `drizzle-kit migrate` is invoked. Rollback remains an owner-approved restore/forward-fix operation; the workflow intentionally never runs destructive rollback SQL automatically.
