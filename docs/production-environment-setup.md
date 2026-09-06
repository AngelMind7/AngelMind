# Panduan Setup Environment Production AngelMind

## Tujuan dan urutan kerja

Dokumen ini menjelaskan setup production AngelMind dengan **Firebase sebagai authentication boundary**, **Supabase sebagai private evidence/object storage**, dan **Railway sebagai runtime API, worker, cron callback, serta MySQL/TiDB database**. Urutan yang disarankan adalah:

1. Siapkan repository, domain, dan environment production yang terpisah dari staging.
2. Buat Firebase project dan aktifkan Authentication.
3. Buat Supabase project, private bucket, dan kebijakan storage.
4. Buat Railway project, MySQL service, API service, dan worker/cron arrangement.
5. Isi secrets Railway.
6. Jalankan migration dari checkout yang sudah diverifikasi.
7. Deploy API dan worker.
8. Jalankan readiness, authentication, storage, migration, queue, dan backup smoke test.
9. Catat commit SHA, hasil test, konfigurasi provider, dan bukti rollback.

> **Peringatan:** Jangan memasukkan service-role key, Firebase private key, database password, atau LLM key ke GitHub, browser bundle, `VITE_*`, issue, log, atau chat. Supabase service keys melewati RLS dan harus dipakai hanya dari trusted server.[2]

## 1. Prasyarat

Siapkan akun dengan akses owner/admin pada Firebase, Supabase, dan Railway. Siapkan domain production, alamat email pengirim, domain callback/auth yang sah, serta kebijakan resmi workspace. Gunakan project dan credentials terpisah untuk `staging` dan `production`.

Di workstation operator, checkout commit yang akan dirilis dan jalankan:

```bash
git clone https://github.com/AngelMind7/AngelMind.git
cd AngelMind
git checkout main
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
pnpm check:master-contract
pnpm check:api-v1-contract
pnpm check:provider-neutral
git status --short --branch
```

Working tree harus bersih sebelum migration atau deployment. Catat commit SHA:

```bash
git rev-parse HEAD
```

## Cloudflare edge layer (direkomendasikan)

Cloudflare bukan dependency runtime wajib aplikasi, tetapi sangat direkomendasikan di depan Railway untuk DNS, TLS, WAF, rate limiting, dan perlindungan origin. Gunakan Cloudflare sebagai edge layer sebelum membuka URL production ke publik.

### Buat zone dan DNS

1. Buat akun atau buka [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Tambahkan domain production sebagai zone.
3. Ganti nameserver domain pada registrar sesuai nameserver Cloudflare.
4. Buat custom hostname aplikasi, misalnya `app.example.com`.
5. Buat DNS record `CNAME` dari `app` ke domain public Railway yang diberikan untuk API service.
6. Aktifkan **Proxied** atau orange-cloud untuk hostname aplikasi.
7. Jangan expose `MYSQL_PUBLIC_URL` atau database hostname melalui DNS Cloudflare.

Contoh:

| Type | Name | Target | Proxy |
| --- | --- | --- | --- |
| `CNAME` | `app` | Railway public domain API | Proxied |

Jika Railway memerlukan custom-domain verification, ikuti record verification yang diberikan Railway terlebih dahulu. Setelah certificate aktif, gunakan hostname Cloudflare sebagai `APP_BASE_URL`, Firebase authorized domain, callback origin, dan URL smoke test.

### TLS dan origin

1. Buka **SSL/TLS → Overview**.
2. Set encryption mode ke **Full (strict)**.
3. Pastikan origin Railway menerima HTTPS dan certificate origin valid.
4. Aktifkan **Always Use HTTPS** dan **Automatic HTTPS Rewrites** bila tidak bertentangan dengan asset legacy.
5. Jangan menggunakan `Flexible` karena koneksi Cloudflare-to-origin dapat menjadi HTTP.
6. Pastikan cookie authentication menggunakan HTTPS dan konfigurasi CORS/origin hanya mengizinkan domain aplikasi yang benar.

Cloudflare merekomendasikan Full atau Full (strict); Full (strict) memvalidasi certificate origin lebih ketat.[7]

### WAF dan rate limiting

Buat rule bertahap, mulai dari **Managed WAF rules** dengan action `Log` di staging, lalu `Block` setelah false-positive review. Tambahkan rate limit khusus untuk endpoint sensitif seperti login, `/api/trpc/*`, `/api/scheduled/*`, dan upload/evidence. Jangan membuat rule global yang memblokir WebSocket, signed URL, atau request API valid.

Minimum policy yang disarankan:

| Area | Tindakan |
| --- | --- |
| Login/auth | Rate limit dan challenge untuk burst/brute-force; jangan cache response auth |
| API | Bypass cache; rate-limit berdasarkan path dan client identity |
| Scheduled callback | Allow hanya method/path yang diperlukan dan tetap wajib secret aplikasi |
| Evidence upload | Batasi method, body size, dan abuse rate; jangan cache upload |
| Admin routes | Challenge/block negara atau ASN hanya jika policy organisasi mengizinkan |
| Origin | Railway menerima traffic dari Cloudflare dan health monitor yang disetujui |

Cloudflare Rate Limiting Rules memang ditujukan untuk membatasi abuse pada website dan API.[9] Rate limiting Cloudflare tidak menggantikan rate limit server-side AngelMind; keduanya harus tetap aktif.

### WebSocket dan cache

AngelMind mendaftarkan realtime WebSocket. Cloudflare mendukung proxied WebSocket tanpa konfigurasi tambahan, tetapi lakukan smoke test koneksi setelah proxy diaktifkan.[8] Buat cache rule yang **tidak melakukan cache** untuk `/api/*`, `/healthz`, `/readyz`, `/api/trpc/*`, dan WebSocket upgrade path. Cache hanya asset static yang hash-nya immutable.

### Origin protection dan verification

Setelah Cloudflare aktif:

1. Uji `curl -I https://app.example.com/healthz` dan pastikan status serta certificate benar.
2. Uji `/readyz` melalui hostname Cloudflare.
3. Uji login Firebase dan API bearer request.
4. Uji WebSocket/realtime.
5. Uji signed URL Supabase secara langsung; Cloudflare tidak boleh mem-proxy atau mengekspos service key.
6. Tinjau Security Events dan false positives.
7. Simpan Cloudflare zone ID, DNS record, TLS mode, WAF ruleset version, rate-limit rule IDs, dan rollback owner.

Jika origin Railway masih dapat diakses langsung, anggap itu sebagai bypass edge yang harus ditangani melalui Railway networking/access policy atau origin verification. Jangan mengandalkan Cloudflare sebagai satu-satunya authorization layer.

## 2. Buat dan konfigurasi Firebase

### 2.1 Buat project

1. Buka [Firebase Console](https://console.firebase.google.com/).
2. Pilih **Create a project**.
3. Tentukan nama project dan project ID production yang permanen.
4. Aktifkan Google Analytics hanya jika memang dibutuhkan oleh kebijakan privasi.
5. Catat **Project ID**. Project ID tidak dapat diganti setelah project dibuat.[1]

### 2.2 Aktifkan Authentication

1. Masuk ke **Build → Authentication**.
2. Pilih **Get started**.
3. Aktifkan provider yang memang akan dipakai, misalnya Email/Password dan Google.
4. Tambahkan domain production ke **Authentication → Settings → Authorized domains**.
5. Jangan mengaktifkan provider yang belum memiliki owner, policy, dan recovery procedure.
6. Buat satu akun owner/admin yang dapat diuji, lalu gunakan UID-nya untuk `ADMIN_FIREBASE_UIDS`.

### 2.3 Ambil web application configuration

1. Masuk ke **Project settings → General**.
2. Pada **Your apps**, tambahkan **Web app** jika belum ada.
3. Salin konfigurasi web app ke variable build berikut:

| Variable | Sumber Firebase |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` |
| `VITE_FIREBASE_APPCHECK_SITE_KEY` | App Check site key, jika App Check diaktifkan |

Konfigurasi web Firebase bukan pengganti secret server. Tetap batasi domain, provider, rules, dan API usage.

### 2.4 Buat Firebase Admin credential untuk API

1. Buka **Project settings → Service accounts**.
2. Pilih **Generate new private key** dan konfirmasi.
3. Simpan JSON hanya di password manager atau secret manager operator.
4. Jangan commit file JSON.
5. Masukkan field berikut ke Railway:

| Variable | Nilai |
| --- | --- |
| `FIREBASE_PROJECT_ID` | `project_id` dari JSON |
| `FIREBASE_CLIENT_EMAIL` | `client_email` dari JSON |
| `FIREBASE_PRIVATE_KEY` | `private_key` dari JSON, dengan newline dipertahankan atau di-escape sebagai `\\n` |

AngelMind mengubah `\\n` menjadi newline saat inisialisasi Firebase Admin. Firebase merekomendasikan perlindungan sangat ketat terhadap service-account key; gunakan secret manager, rotasi, dan least privilege.[1]

## 3. Buat dan konfigurasi Supabase

### 3.1 Buat project

1. Buka [Supabase Dashboard](https://supabase.com/dashboard).
2. Pilih **New project**.
3. Pilih organization dan region yang sesuai dengan Railway production.
4. Buat database password yang unik dan simpan di password manager.
5. Tunggu provisioning selesai.
6. Buka **Project Settings → API** dan catat:
   - Project URL untuk `SUPABASE_URL`.
   - Server-side `service_role` key untuk `SUPABASE_SERVICE_ROLE_KEY`.

`SUPABASE_SERVICE_ROLE_KEY` hanya masuk ke Railway API/worker. Tidak boleh diprefix `VITE_` dan tidak boleh dikirim ke browser.

### 3.2 Buat private bucket

1. Buka **Storage → New bucket**.
2. Buat bucket bernama `angelmind-files`, atau nama lain yang kemudian dipakai persis pada `SUPABASE_STORAGE_BUCKET`.
3. Set bucket sebagai **private**, bukan public.
4. Jangan mengandalkan public URL untuk evidence.
5. AngelMind menghasilkan signed URL untuk akses file dan membatasi TTL di server.

Supabase Storage default-nya memerlukan policy RLS untuk operasi upload. Jika storage hanya dipanggil oleh trusted server, service key dapat melewati RLS, tetapi konsekuensinya adalah akses penuh sehingga key harus server-only.[2]

### 3.3 Storage policy dan retention

Jika hanya backend AngelMind yang boleh mengakses bucket, pertahankan bucket private dan batasi akses aplikasi melalui workspace authorization di API. Jika policy Supabase juga dipakai, buat policy yang membatasi bucket dan prefix workspace. Uji operasi berikut dengan object non-sensitif:

- upload object;
- generate signed URL;
- download melalui signed URL;
- delete object;
- penolakan akses tanpa authorization.

Jangan mengunggah evidence production sebelum smoke test selesai.

## 4. Buat project dan database Railway

### 4.1 Buat project production

1. Buka [Railway Dashboard](https://railway.com/dashboard).
2. Buat project baru bernama misalnya `angelmind-production`.
3. Pilih environment production. Jangan mencampur variable staging dan production.
4. Atur project members dengan least privilege dan aktifkan environment approval untuk deployment production.

### 4.2 Provision MySQL

1. Pada project canvas pilih **+ New → Database → MySQL**.
2. Tunggu service MySQL menjadi healthy.
3. Railway menyediakan variable seperti `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`, dan `MYSQL_URL`.[4]
4. Gunakan `MYSQL_URL` sebagai `DATABASE_URL` pada API dan worker melalui reference variable:

```text
DATABASE_URL=${{ MySQL.MYSQL_URL }}
```

Sesuaikan `MySQL` dengan nama service aktual. Railway menyediakan MySQL private secara default. Jangan mengaktifkan public TCP proxy kecuali migration operator memang membutuhkannya; jika diaktifkan, batasi akses dan pahami biaya egress.[4]

5. Aktifkan database backups dan tetapkan retention sesuai RPO/RTO.
6. Catat region, service name, backup policy, dan database version.

### 4.3 Tambahkan API service dari GitHub

1. Pilih **+ New → GitHub Repo**.
2. Hubungkan repository `AngelMind7/AngelMind`.
3. Pilih branch `main` atau gunakan deployment workflow yang mempromosikan commit tertentu.
4. Pastikan Dockerfile repository terdeteksi.
5. Set healthcheck ke:

```text
/healthz
```

6. Set public domain production setelah variable dan build command siap.
7. Pastikan service listen pada Railway-provided `PORT`.

Docker image AngelMind menjalankan `node dist/_core/index.js`. API juga dapat menjalankan worker in-process bila `RUN_WORKER=true`. Untuk isolasi operasional yang lebih baik, gunakan service worker terpisah dari image yang sama dengan command worker yang disepakati pada release runbook, atau gunakan API service dengan `RUN_WORKER=true` setelah kapasitas diuji.

### 4.4 Scheduled maintenance callback

Aplikasi mendaftarkan endpoint:

```text
POST /api/scheduled/workspace-maintenance
```

Buat Railway cron/job yang memanggil endpoint tersebut dengan secret header sesuai implementasi callback. Nilai secret harus sama dengan `RAILWAY_CRON_SECRET`. Jangan menaruh secret di URL, log, atau command yang dapat tampil di dashboard.

## 5. Isi Railway variables

Railway membuat perubahan variable sebagai staged changes yang harus direview dan dideploy sebelum berlaku.[3] Tambahkan variable pada environment production API. Share hanya variable non-secret yang memang dibutuhkan; seal secret setelah diverifikasi.

### 5.1 Variable wajib runtime

| Variable | Nilai / aturan |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | Biarkan Railway mengisi atau gunakan port yang dipetakan Railway |
| `APP_BASE_URL` | URL HTTPS production, misalnya `https://app.example.com` |
| `DATABASE_URL` | Reference ke `MYSQL_URL` service MySQL |
| `AUDIT_ARCHIVE_SIGNING_KEY` | Random secret minimal 32 karakter |
| `AUDIT_STATE_ENCRYPTION_KEY` | Random secret kuat untuk state audit |
| `FIREBASE_PROJECT_ID` | Firebase production project ID |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin service-account email |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin private key |
| `ADMIN_FIREBASE_UIDS` | UID admin yang dipisahkan koma |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase server-only service role key |
| `SUPABASE_STORAGE_BUCKET` | `angelmind-files` atau bucket private aktual |
| `RAILWAY_CRON_SECRET` | Random secret minimal 32 karakter |
| `RUN_WORKER` | `true` jika memakai in-process worker; `false` jika worker dipisah |

Generate random secret di workstation tanpa menyimpan output ke shell history:

```bash
openssl rand -base64 48
```

### 5.2 Variable Firebase browser build

Tambahkan seluruh `VITE_FIREBASE_*` yang tercantum pada bagian Firebase. Nilai ini akan masuk browser bundle, sehingga hanya gunakan Firebase web configuration, bukan Admin private key atau Supabase service key.

### 5.3 Variable AI dan email

Jika fitur AI dan email akan diaktifkan, tambahkan hanya credential provider yang sudah disetujui:

| Variable | Fungsi |
| --- | --- |
| `LLM_PRIMARY_API_BASE_URL` | URL provider AI utama |
| `LLM_PRIMARY_API_KEY` | Key provider AI utama |
| `LLM_PRIMARY_MODEL` | Model utama |
| `LLM_FALLBACK_API_BASE_URL` | URL fallback |
| `LLM_FALLBACK_API_KEY` | Key fallback |
| `LLM_FALLBACK_MODEL` | Model fallback |
| `SMTP_HOST` | SMTP host |
| `SMTP_PORT` | Umumnya `587` atau port provider |
| `SMTP_USER` | SMTP username jika diwajibkan |
| `SMTP_PASSWORD` | SMTP password jika diwajibkan |
| `SMTP_FROM` | Alamat sender yang diverifikasi |
| `SMTP_SECURE` | `true` hanya jika provider meminta TLS-on-connect |
| `SMTP_TIMEOUT_MS` | Minimal `1000`, default `10000` |

Jangan mengaktifkan provider AI atau SMTP sebelum budget, rate limit, sender identity, dan incident owner ditetapkan.

## 6. Migration database

Migration harus dijalankan dalam controlled deployment window, setelah database backup berhasil dan sebelum menerima durable jobs.

### 6.1 Preflight

Dari checkout release yang sama:

```bash
export DATABASE_URL='[isi hanya di secret manager atau shell sementara]'
pnpm install --frozen-lockfile
pnpm check:migration-journal
pnpm check:migration-safety
pnpm check:migration-rollback
```

Review SQL baru dan pastikan tidak ada migration yang tidak tercatat:

```bash
find drizzle -maxdepth 1 -name '*.sql' -print | sort
git diff -- drizzle drizzle/meta
```

Jangan menjalankan migration terhadap database yang salah. Verifikasi hostname, database name, region, dan backup timestamp sebelum apply.

### 6.2 Apply

Gunakan migration command yang disetujui repository pada checkout release:

```bash
pnpm db:push
```

`db:push` menjalankan generate lalu migrate. Karena generate dapat membuat file baru jika schema berubah, hentikan proses bila muncul diff yang tidak diharapkan. Untuk release yang hanya menerapkan SQL yang sudah direview, operator dapat memakai migration command Drizzle yang disetujui tim dan menyimpan bukti output.

Setelah migration:

```bash
pnpm check:migration-journal
pnpm check:migration-safety
```

Verifikasi foreign-key/orphan checks, workspace IDs, dan index yang diwajibkan. Rebuild workspace search index melalui protected `agent.rebuildSearchIndex` setelah bulk import atau migration yang mengubah searchable data.

## 7. Deploy API dan worker

1. Review staged Railway variables.
2. Deploy API service dari commit SHA yang sudah lulus CI.
3. Tunggu image build selesai.
4. Pastikan deployment menjadi healthy.
5. Pastikan log tidak mencetak private key, service key, database URL, atau Authorization header.
6. Jika worker dipisah, deploy service kedua dari commit SHA yang sama dan set `RUN_WORKER=true` hanya pada service worker sesuai entrypoint yang disepakati. Jangan menjalankan dua worker tanpa memahami duplicate-consumer dan lease behavior.
7. Jalankan cron hanya setelah API readiness lulus.

Railway variables berlaku pada build dan running deployment, tetapi perubahan variable perlu direview dan dideploy untuk diterapkan.[3]

## 8. Smoke test production

### 8.1 Health dan readiness

```bash
export APP_URL='https://app.example.com'
curl --fail --silent --show-error "$APP_URL/healthz"
curl --fail --silent --show-error "$APP_URL/readyz"
curl --fail --silent --show-error "$APP_URL/api/v1/health"
```

`/healthz` hanya menunjukkan proses hidup. `/readyz` harus dipakai untuk memastikan dependency runtime production siap.

### 8.2 Authentication

Dengan akun Firebase test yang sah:

1. Login melalui browser.
2. Pastikan bearer token diterima API.
3. Pastikan logout/revoked token ditolak.
4. Pastikan user tidak dapat membaca workspace yang tidak dimilikinya.
5. Pastikan UID admin saja yang dapat membuka endpoint admin.

### 8.3 Storage

Gunakan file non-sensitif:

1. Upload evidence kecil.
2. Pastikan record evidence tersimpan di database.
3. Pastikan object berada di bucket private.
4. Buka signed URL dari browser.
5. Pastikan URL memiliki expiry.
6. Hapus file test sesuai retention policy dan simpan bukti audit.

### 8.4 Research dan finding lifecycle

Buat workspace test dengan allowlist `example.test`, exclusion yang tidak berbahaya, safe harbor, code of conduct, budget, cooldown, dan retention. Jalankan alur:

```text
workspace → research session → asset → observation → finding → evidence → retest
```

Pastikan retest menghasilkan state eksplisit `verified_fixed` atau `still_present`, human review tetap required sebelum reporting, dan audit event tercatat.

### 8.5 Queue dan cron

1. Buat hanya job staging/non-sensitive.
2. Pastikan job memiliki lease, heartbeat, retry, dan idempotency key.
3. Pastikan outbox consumer receipt mencegah side effect ganda.
4. Panggil scheduled maintenance dengan secret yang benar.
5. Pastikan callback tanpa secret atau secret salah ditolak.
6. Pastikan dead-letter event terlihat di operations view.

### 8.6 Backup dan DR rehearsal

1. Buat signed audit archive.
2. Verifikasi archive signature dan manifest.
3. Jalankan `operations.runDrDrill` menuju destination workspace terpisah.
4. Pastikan output menyatakan `mutationPerformed=false`.
5. Jangan menjalankan restore write operation dari smoke test production.

## 9. Monitoring dan alerting minimum

Pantau HTTP 5xx, `/readyz`, restart count, memory/CPU, database connection errors, migration failures, queue depth, retry/dead-letter count, outbox lag, SMTP failures, provider circuit state, dan signed URL/storage failures. Buat alert untuk admin owner dan incident channel. Jangan mengirim secret atau evidence body ke observability provider.

Tetapkan target minimal sebelum go-live:

| Area | Bukti yang harus disimpan |
| --- | --- |
| Release | Commit SHA, build log, CI URL |
| Firebase | Project ID, enabled providers, authorized domains, admin UID review |
| Supabase | Project ref, bucket privacy, policy review, storage smoke output |
| Railway | Environment, service names, deployment ID, health output |
| Database | Backup ID/timestamp, migration output, journal/safety output |
| Security | Threat-model review, secret scan, access review |
| E2E | Test workspace ID, reviewer, browser/version, result |
| Rollback | Last known-good SHA dan rollback owner |

## 10. Rollback

Jika release bermasalah:

1. Hentikan pembuatan workspace/job baru atau pause affected workspace.
2. Simpan audit event dan deployment logs.
3. Roll back aplikasi ke last known-good commit melalui Railway deployment history.
4. Jangan melakukan rollback database secara membabi buta. Schema migration harus memakai forward-compatible fix atau prosedur restore yang direview.
5. Jalankan kembali `/healthz`, `/readyz`, authentication, storage, dan research smoke test.
6. Revoke secret jika terdapat indikasi exposure.
7. Catat failure mode, detection evidence, containment, owner, dan corrective action.

## 11. Checklist go-live

- [ ] Firebase production project dan authorized domains benar.
- [ ] Firebase providers hanya yang disetujui.
- [ ] Firebase Admin credential tersimpan sebagai Railway secrets.
- [ ] Supabase bucket private dan storage policy direview.
- [ ] Supabase service-role key tidak muncul pada frontend bundle.
- [ ] Railway MySQL backup aktif dan `DATABASE_URL` memakai reference yang benar.
- [ ] Semua required runtime variables lulus `validateRuntimeConfig()`.
- [ ] CI, test, build, contract, migration journal, dan migration safety lulus.
- [ ] Migration diterapkan ke database yang benar dan backup dibuat sebelumnya.
- [ ] API deployment healthy dan worker tidak menggandakan consumer secara tidak sengaja.
- [ ] `/healthz`, `/readyz`, dan `/api/v1/health` lulus.
- [ ] Authenticated workspace isolation lulus.
- [ ] Private evidence upload dan signed URL lulus.
- [ ] Retest/evidence/audit smoke test lulus.
- [ ] Queue, outbox, cron, retry, dan dead-letter smoke test lulus.
- [ ] DR drill plan-only lulus.
- [ ] Monitoring, alerting, owner, dan rollback SHA dicatat.
- [ ] No target-facing scanning, exploitation, credential replay, C2, phishing, atau autonomous submission diaktifkan tanpa review terpisah.

## Referensi

[1]: https://firebase.google.com/docs/admin/setup "Firebase Admin SDK setup and service-account guidance"
[2]: https://supabase.com/docs/guides/storage/security/access-control "Supabase Storage access control and service-key guidance"
[3]: https://docs.railway.com/variables "Railway variables, secrets, references, and sealed variables"
[4]: https://docs.railway.com/databases/mysql "Railway MySQL provisioning, connection variables, and backups"
[5]: https://firebase.google.com/docs/auth "Firebase Authentication documentation"
[6]: https://supabase.com/docs/guides/storage "Supabase Storage documentation"
[7]: https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/ "Cloudflare Full (strict) TLS mode"
[8]: https://developers.cloudflare.com/network/websockets/ "Cloudflare proxied WebSockets"
[9]: https://developers.cloudflare.com/waf/rate-limiting-rules/ "Cloudflare WAF rate limiting rules"
