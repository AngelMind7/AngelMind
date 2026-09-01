# AngelMind — Panduan Production: Database Migration dan Secret Configuration

**Terakhir diperbarui:** 2026-09-01  
**Target branch:** `main`  
**Repository:** [AngelMind7/AngelMind](https://github.com/AngelMind7/AngelMind)

Panduan ini menjelaskan deployment production untuk AngelMind yang menggunakan **Railway** sebagai hosting, **MySQL/TiDB** sebagai database, **Firebase Authentication** sebagai identity provider, dan **Supabase Storage** untuk evidence serta audit archive. Ikuti urutan secara berurutan. Jangan menjalankan migration production sebelum backup dan preflight selesai.

> **Aturan penting:** jangan menaruh secret di Git, `.env` yang ter-commit, log, screenshot, issue, atau chat. Secret server-only tidak boleh memakai prefix `VITE_` karena variabel tersebut masuk ke bundle browser.

## 1. Prasyarat dan prinsip deployment

Pastikan commit yang akan dideploy sudah berada di `main`, seluruh CI hijau, dan kamu memiliki akses owner/admin ke Railway project, database production, Firebase project, serta Supabase project. Railway memisahkan konfigurasi berdasarkan environment; gunakan environment **staging** untuk rehearsal dan **production** untuk live deployment. Perubahan variable Railway menjadi staged changes yang harus direview dan dideploy sebelum berlaku.[^1] [^2]

Clone repository pada mesin admin yang dipercaya, lalu pastikan branch dan working tree bersih:

```bash
gh repo clone AngelMind7/AngelMind
cd AngelMind
git checkout main
git pull --ff-only origin main
git status --short
git log -1 --oneline
```

Commit terakhir yang telah dipublish saat panduan ini ditulis adalah `4d62405`. Jika repository sudah memiliki commit yang lebih baru, gunakan commit terbaru yang telah melewati CI.

## 2. Siapkan environment staging terlebih dahulu

Di Railway, buat atau pilih environment `staging`. Jangan menyalin secret production secara sembarangan ke staging. Railway memang mendukung environment terisolasi untuk konfigurasi dan service yang berbeda.[^2]

Hubungkan service aplikasi ke repository GitHub dan pastikan deployment staging menggunakan commit yang sama dengan rencana production. Untuk tahap awal, deploy **API/web** dan **worker** sebagai service terpisah atau sebagai dua deployment yang menjalankan image yang sama:

| Service | Command | Variabel khusus |
|---|---|---|
| Web/API | `node dist/index.js` atau command start dari `railway.toml` | `RUN_WORKER` tidak perlu aktif |
| Worker | `node dist/worker.js` | `RUN_WORKER=true` |
| Database | MySQL/TiDB provider | `DATABASE_URL` direferensikan ke service aplikasi dan worker |

Worker harus memakai database, storage, dan provider server-side yang sama dengan API. Tanpa worker, job evidence scan, intelligence fetch, AI durable run, dan outbox tidak akan diproses.

## 3. Buat dan simpan secret dengan aman

Masukkan variable melalui **Railway → Service → Variables → New Variable** atau Raw Editor. Jangan menulis nilai secret di command shell yang dapat tersimpan dalam history. Railway juga mendukung sealed variables; gunakan fitur tersebut untuk key yang sangat sensitif. Sealed variable tidak dapat dibaca kembali melalui UI/API, sehingga simpan salinannya di password manager atau secret manager terpisah sebelum menyegel.[^1]

### 3.1 Database dan aplikasi

Set variable berikut pada **API/web service** dan worker jika ditandai sebagai shared:

| Variable | API/web | Worker | Keterangan |
|---|---:|---:|---|
| `DATABASE_URL` | Ya | Ya | Connection string MySQL/TiDB production. Gunakan TLS/SSL bila provider menyediakannya. |
| `APP_ENCRYPTION_KEY` | Ya | Ya | Key server-only untuk operasi enkripsi/penandatanganan aplikasi. Gunakan nilai acak minimal 32 byte. |
| `NODE_ENV` | Ya | Ya | Set `production`. |
| `WORKER_ID` | Opsional | Disarankan | ID stabil dan unik, misalnya `angelmind-worker-prod-1`. |
| `PORT` | Jangan hardcode | Jangan hardcode | Railway menyediakan `PORT`; aplikasi membacanya secara dinamis. |

Buat nilai acak di mesin lokal yang dipercaya, bukan di source code:

```bash
openssl rand -hex 32
```

Salin hasilnya langsung ke secret manager. Jangan menaruh hasilnya di file yang akan di-commit.

### 3.2 Firebase Authentication

**Variabel browser-safe** berikut diperlukan saat build API/web. Nilai ini bukan pengganti Firebase Admin credential, tetapi tetap harus disesuaikan dengan project production:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

**Variabel server-only** berikut diperlukan untuk verifikasi Firebase ID token:

```text
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
ADMIN_FIREBASE_UIDS
```

`FIREBASE_PRIVATE_KEY` harus dimasukkan sebagai multiline PEM yang utuh. Jangan mengubahnya menjadi output log atau menaruhnya pada variable `VITE_`. `ADMIN_FIREBASE_UIDS` berisi UID Firebase admin yang dipisahkan koma; role admin tidak boleh ditentukan dari frontend.

Pada Firebase Console production:

1. Buka **Authentication → Sign-in method** dan aktifkan provider yang memang akan digunakan, misalnya Google.
2. Buka **Authentication → Settings → Authorized domains** dan tambahkan domain Railway production serta custom domain bila ada.
3. Pastikan `VITE_FIREBASE_AUTH_DOMAIN` dan redirect configuration konsisten dengan domain production. Untuk browser yang memblokir third-party storage, Firebase menyediakan beberapa pola deployment seperti popup sign-in atau konfigurasi auth domain yang tepat.[^3]
4. Uji login dan logout hanya setelah deployment staging aktif.

### 3.3 Supabase Storage

Masukkan variable ini pada **API/web** dan **worker**:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET
```

`SUPABASE_SERVICE_ROLE_KEY` adalah server-only. Jangan pernah menaruhnya pada `VITE_*`, frontend, browser local storage, atau response API. Buat bucket private, pastikan policy bucket sesuai kebutuhan server-side, dan gunakan bucket khusus production, misalnya `angelmind-files-prod`. Upload evidence AngelMind masuk quarantine sebelum scan; worker memerlukan akses read server-side untuk menjalankan scan.

### 3.4 AI provider

Jika durable AI run diaktifkan, masukkan variable ini pada API/web dan worker:

```text
LLM_PRIMARY_API_BASE_URL
LLM_PRIMARY_API_KEY
LLM_PRIMARY_MODEL
LLM_FALLBACK_API_BASE_URL
LLM_FALLBACK_API_KEY
LLM_FALLBACK_MODEL
```

Key provider AI wajib server-only. Daftarkan model aktif pada registry sesuai capability, context window, status health, dan budget policy. Jangan menganggap provider configured berarti provider healthy; lakukan smoke test terbatas pada staging.

### 3.5 Scheduler, notification, dan intelligence provider

Variable berikut digunakan sesuai kebutuhan:

```text
RAILWAY_CRON_SECRET
NOTIFICATION_WEBHOOK_URL
NOTIFICATION_WEBHOOK_SECRET
INTELLIGENCE_PROVIDER_HOSTS
```

`RAILWAY_CRON_SECRET` harus berupa secret acak yang sama dengan header scheduler internal. `NOTIFICATION_*` opsional. `INTELLIGENCE_PROVIDER_HOSTS` opsional, tetapi jika diisi harus berupa hostname HTTPS yang dipisahkan koma; worker akan menolak provider di luar allowlist.

## 4. Build dan verifikasi staging

Pada checkout lokal, jalankan pemeriksaan yang sama dengan release gate:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test -- --run
pnpm build
pnpm check:budget
pnpm lint:python
pnpm test:python
git diff --check
```

Di Railway, review build log. Pastikan tidak ada secret yang tercetak. Setelah deployment staging selesai, uji endpoint berikut:

```bash
curl -fsS https://<staging-domain>/healthz
curl -fsS https://<staging-domain>/readyz
```

`/healthz` menunjukkan proses hidup. `/readyz` digunakan sebagai readiness check dan dapat gagal bila dependency wajib belum siap. Lanjutkan ke migration staging hanya setelah deployment staging dapat diakses.

## 5. Backup database production

Sebelum migration, buka fitur backup pada provider database dan buat backup bertanda waktu, misalnya `angelmind-prod-before-0035-0036-2026-09-01`. Tunggu sampai status backup **successful**, lalu catat:

| Informasi | Catatan |
|---|---|
| Nama/ID backup | Simpan di change record internal |
| Timestamp | Gunakan UTC |
| Database dan environment | Pastikan benar-benar production |
| Retention backup | Pastikan mencukupi masa rollback |
| Restore destination | Jangan restore ke production sebagai eksperimen |

Jika provider tidak memiliki backup terkelola, lakukan dump dengan client MySQL yang TLS-enabled dan simpan ke storage terenkripsi. Jangan mengirim dump ke repository atau chat.

Contoh pola command; isi nilai melalui secret manager atau prompt interaktif, bukan hardcode:

```bash
MYSQL_PWD="$DB_PASSWORD" mysqldump \
  --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER" \
  --single-transaction --routines --triggers \
  --databases "$DB_NAME" > angelmind-prod-before-migration.sql
```

Verifikasi bahwa file dump ada, ukurannya masuk akal, dan dapat dibaca oleh operator yang ditunjuk. Jangan menganggap dump valid hanya karena command selesai tanpa error.

## 6. Preflight database sebelum migration

Jalankan preflight terhadap database yang benar-benar dituju. Pastikan `DATABASE_URL` tidak menunjuk staging, local, atau database project lain. Minimal verifikasi:

```sql
SELECT DATABASE() AS database_name, NOW() AS server_time;
SHOW TABLES LIKE 'drizzle_%';
SHOW TABLES LIKE 'researchSessions';
SHOW TABLES LIKE 'outboxEvents';
SHOW TABLES LIKE 'evidenceArtifacts';
```

Periksa apakah migration target sudah pernah diterapkan. Drizzle menyimpan jurnal migration dalam tabel internal; nama tabel dapat berbeda menurut konfigurasi versi. Jangan menjalankan SQL `0035` atau `0036` secara manual jika jurnal menunjukkan migration tersebut sudah diterapkan.

Periksa konsistensi data sebelum foreign key atau index tambahan:

```sql
SELECT COUNT(*) AS orphan_assets
FROM researchAssets a
LEFT JOIN researchSessions s ON s.id = a.sessionId
WHERE s.id IS NULL;

SELECT COUNT(*) AS orphan_observations
FROM researchObservations o
LEFT JOIN researchSessions s ON s.id = o.sessionId
WHERE s.id IS NULL;

SELECT COUNT(*) AS invalid_outbox_status
FROM outboxEvents
WHERE status NOT IN ('pending', 'retrying', 'published', 'failed');
```

Semua hasil orphan dan status invalid harus **0**. Jika tidak, hentikan proses dan perbaiki data melalui prosedur review, bukan dengan mengabaikan error migration.

## 7. Jalankan migration production dengan aman

Repository memakai Drizzle dengan dialect MySQL. Commit saat ini menambahkan:

| Migration | Isi |
|---|---|
| `0035_trace_lineage.sql` | Menambahkan `traceId` pada research session, asset, observation, hypothesis, task, finding, dan evidence artifact, serta index terkait. |
| `0036_outbox_retry_leases.sql` | Menambahkan status retry, availability scheduling, lease, worker ID, last error, dan index outbox. |

Jurnal Drizzle sudah diperbarui agar kedua migration tersebut dikenali. Gunakan perintah **migrate-only** pada production agar tidak menghasilkan SQL baru secara tidak terduga:

```bash
pnpm install --frozen-lockfile
DATABASE_URL="$PRODUCTION_DATABASE_URL" pnpm exec drizzle-kit migrate
```

Pada Railway, cara yang disarankan adalah membuka shell/command deployment yang memiliki `DATABASE_URL` production atau menjalankan one-off command dengan secret manager Railway. Jangan menempelkan connection string lengkap ke chat, issue, atau log.

> **Jangan gunakan `pnpm db:push` sebagai langkah pertama production tanpa review.** Script tersebut menjalankan `drizzle-kit generate` lalu `drizzle-kit migrate`; tahap generate dapat membuat migration tambahan berdasarkan perbedaan schema. Untuk release ini, SQL migration sudah committed dan sebaiknya diaplikasikan dengan `drizzle-kit migrate` setelah preflight.

Jika migration gagal:

1. Catat error lengkap yang tidak mengandung credential.
2. Jangan mengulangi command berkali-kali tanpa membaca status jurnal dan schema.
3. Periksa apakah sebagian statement sudah berhasil diterapkan.
4. Bandingkan schema aktual dengan `drizzle/schema.ts` dan file SQL target.
5. Gunakan backup atau forward-fix yang direview; jangan menghapus tabel atau menjalankan `DROP` secara spontan.

Setelah migration berhasil, verifikasi schema:

```sql
SHOW COLUMNS FROM researchSessions LIKE 'traceId';
SHOW COLUMNS FROM researchAssets LIKE 'traceId';
SHOW COLUMNS FROM evidenceArtifacts LIKE 'traceId';
SHOW COLUMNS FROM outboxEvents;
SHOW INDEX FROM outboxEvents;
```

## 8. Deploy API/web dan worker production

Setelah schema production sesuai, deploy commit yang sama ke environment production. Review staged changes Railway, lalu deploy. Railway variables tersedia pada build dan runtime; perubahan variable perlu dideploy agar berlaku.[^1]

Pastikan API/web memiliki seluruh variable API, Firebase Admin, Supabase, dan scheduler. Pastikan worker memiliki `RUN_WORKER=true`, `DATABASE_URL`, Supabase server credentials, serta AI credentials jika AI durable run digunakan. Worker tidak boleh diberikan credential browser-only sebagai pengganti credential server.

Validasi deployment:

```bash
curl -fsS https://<production-domain>/healthz
curl -fsS https://<production-domain>/readyz
```

Cek log worker dan pastikan terlihat worker start tanpa error konfigurasi. Jangan menganggap worker sehat hanya karena proses container hidup; verifikasi bahwa job dapat diklaim dan heartbeat berjalan.

## 9. Smoke test production yang aman

Gunakan akun reviewer/admin yang memang ditunjuk. Lakukan test dengan data non-sensitif dan target pasif/non-target-facing:

1. Login melalui Firebase.
2. Buat workspace test dengan allowlist dummy atau asset internal yang memang diizinkan.
3. Buat research session.
4. Upload file evidence kecil yang tidak sensitif.
5. Pastikan artifact berstatus `quarantined`, lalu job `evidence.scan` diproses worker dan status berubah menjadi `scanned` atau `rejected` sesuai isi file.
6. Masukkan satu intelligence feed dari provider HTTPS yang sudah allowlisted, jika provider sudah dikonfigurasi.
7. Jalankan search dan pastikan data hanya terlihat dalam workspace yang benar.
8. Buat audit archive, verifikasi signature, dan jalankan restore plan; restore tetap plan-only.
9. Hapus atau arsipkan data test sesuai retention policy setelah hasil smoke test dicatat.

Jangan menjalankan active scanner, exploit, credential replay, target-facing request, atau external report submission sebagai bagian dari smoke test ini. Fitur tersebut berada di luar runtime passive yang saat ini dipublish.

## 10. Rollback dan incident handling

Rollback aplikasi dan rollback database adalah dua hal berbeda. Jika hanya binary aplikasi yang bermasalah, hentikan aktivitas workspace baru, deploy kembali commit aplikasi terakhir yang known-good, lalu jalankan smoke test. **Jangan menurunkan schema database secara manual** hanya karena aplikasi di-rollback.

Jika migration sudah mengubah schema dan ada incompatibility, pilih salah satu tindakan yang direview:

| Situasi | Tindakan |
|---|---|
| Aplikasi baru gagal tetapi schema backward-compatible | Rollback aplikasi atau forward-fix aplikasi. |
| Sebagian migration gagal | Hentikan deploy, baca schema aktual dan jurnal, lalu lanjutkan migration yang idempotent/reviewed. |
| Data korup atau kehilangan data | Pause workspace, preserve audit, gunakan recovery environment dari backup, dan lakukan restore plan. |
| Secret bocor | Revoke/rotate secret segera, audit access log, redeploy, dan buat incident record. |

Jangan menghapus audit/evidence untuk menyembunyikan kegagalan. Pause workspace yang terdampak dan catat siapa yang menyetujui tindakan recovery.

## 11. Checklist sign-off

| Item | Status |
|---|---|
| Commit release sudah di `main` dan CI hijau | [ ] |
| Staging deploy dan smoke test lulus | [ ] |
| Backup production successful dan ID dicatat | [ ] |
| `DATABASE_URL` sudah diverifikasi menunjuk production yang benar | [ ] |
| Preflight orphan check menghasilkan 0 | [ ] |
| Secret server-only tidak memakai prefix `VITE_` | [ ] |
| Firebase authorized domain/provider sudah dikonfigurasi | [ ] |
| Supabase production bucket private dan service key server-only | [ ] |
| `0035` dan `0036` sudah tercatat serta diterapkan oleh Drizzle | [ ] |
| Schema post-migration sudah diverifikasi | [ ] |
| API `/healthz` dan `/readyz` lulus | [ ] |
| Worker berjalan dengan `RUN_WORKER=true` | [ ] |
| Evidence quarantine scan teruji | [ ] |
| Workspace search boundary teruji | [ ] |
| Audit archive verify dan restore plan teruji | [ ] |
| Incident owner dan rollback owner ditunjuk | [ ] |

## Referensi

[^1]: [Railway — Using Variables](https://docs.railway.com/variables), termasuk service/shared/sealed variables, staged changes, multiline values, dan runtime availability.
[^2]: [Railway — Environments](https://docs.railway.com/environments), termasuk pemisahan staging dan production.
[^3]: [Firebase — Best practices for signInWithRedirect](https://firebase.google.com/docs/auth/web/redirect-best-practices), termasuk authorized domains dan production redirect behavior.
[^4]: [AngelMind deployment guide](./deployment.md).
[^5]: [AngelMind production runbook](./production-runbook.md).
