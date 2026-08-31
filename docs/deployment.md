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

The runtime image includes only low-risk offline/passive utilities from Debian packages: `binutils`, `ca-certificates`, `dnsutils`, `file`, `jq`, `ripgrep`, `yara`, and `whois`. They are installed during the runtime Docker stage and are available to future isolated adapters through explicit allowlisting. Active scanners, exploit frameworks, credential tooling, phishing tooling, remote execution, lateral movement, persistence, and C2 binaries are intentionally excluded from the Railway image.

Installing a binary does not grant execution permission. The catalog and tool API remain metadata-only until a tool has a canonical source, pinned version, dependency review, adapter contract, scope policy, and passing health test.

## Operational boundaries

No target-facing integration is shipped or activated by this dashboard. Any future authorized research worker must obtain only policy-approved, workspace-scoped work from the control plane and must treat a missing, blocked, or expired approval as a hard stop.
