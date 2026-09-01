# Runbook Migrasi Database AngelMind ke Supabase

## Ringkasan penting sebelum menjalankan apa pun

**Jangan jalankan `pnpm db:push` atau `pnpm drizzle-kit migrate` dengan `DATABASE_URL` Supabase pada kondisi repository saat ini.** AngelMind saat ini dikonfigurasi memakai Drizzle dialect `mysql` dan driver `mysql2` di `drizzle.config.ts`, sedangkan setiap project Supabase menyediakan database **Postgres** [1]. Migration yang ada menggunakan DDL MySQL, sehingga tidak kompatibel secara langsung dengan Supabase Postgres.

> **Kesimpulan operasional:** migration `0047_audit_archive_retention.sql` dan `0048_ai_run_retention_index.sql` belum boleh ditempel langsung ke Supabase SQL Editor. Migration tersebut harus dijalankan pada database MySQL-compatible yang sesuai dengan konfigurasi aplikasi, atau seluruh schema/driver/migration harus lebih dahulu dipindahkan secara resmi ke Postgres.

## Pilihan arsitektur

| Pilihan | Kapan digunakan | Langkah utama | Risiko |
|---|---|---|---|
| Pertahankan MySQL-compatible | Paling aman untuk branch saat ini | Gunakan database MySQL/TiDB yang kompatibel dengan `mysql2`; jalankan migration AngelMind apa adanya | Supabase tidak menjadi database utama aplikasi |
| Migrasi resmi ke Supabase Postgres | Jika Supabase wajib menjadi database utama | Port seluruh schema, driver, config, SQL migration, query khusus MySQL, dan test ke Postgres; lakukan rehearsal di project Supabase non-production | Perubahan besar; tidak boleh dicampur dengan migration MySQL |
| Supabase hanya untuk Storage/Auth | Jika database aplikasi tetap MySQL | Pertahankan `DATABASE_URL` MySQL; gunakan variable Supabase khusus untuk Storage/Auth | Memisahkan database dan storage, tetapi paling minim perubahan |

Dokumen ini menjelaskan **gate aman** dan alur migrasi resmi ke Supabase. Alur ini berhenti sebelum perubahan destructive apabila repository belum dipindahkan ke Postgres.

## A. Preflight wajib dan perlindungan secret

Lakukan perintah berikut dari clone bersih atau working tree yang bersih. Jangan menaruh password di command history, issue, log CI, atau file yang di-commit.

```bash
git clone https://github.com/AngelMind7/AngelMind.git
cd AngelMind
git checkout main
git pull --ff-only origin main
git status --short --branch
```

Buat file environment lokal yang tidak dilacak Git, atau masukkan secret melalui secret manager. Jangan memakai prefix `VITE_` untuk service-role key.

```bash
cp .env.example .env.local
chmod 600 .env.local
```

Isi hanya pada mesin lokal atau secret manager:

```dotenv
# Untuk repository saat ini: harus MySQL-compatible, bukan URL Supabase Postgres
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/DATABASE

# Supabase dipakai terpisah untuk Storage/Auth bila diperlukan
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_STORAGE_BUCKET=angelmind-files
```

Verifikasi bahwa `.env.local`, `.env`, dump database, dan file credential tidak akan masuk Git:

```bash
git check-ignore -v .env.local .env
git status --short --ignored | head -50
grep -RInE 'SUPABASE_SERVICE_ROLE_KEY|DATABASE_URL=.*PASSWORD|BEGIN PRIVATE KEY' . --exclude-dir=node_modules --exclude-dir=.git --exclude='*.lock' || true
```

Jika perintah terakhir menemukan secret asli dalam tracked file, **berhenti**, revoke/rotate secret tersebut, hapus dari history Git, dan jangan melanjutkan migration.

## B. Backup sebelum perubahan

Backup dilakukan pada database sumber yang sedang dipakai aplikasi, bukan pada Supabase Storage. Gunakan tool backup yang sesuai dengan engine sumber. Contoh untuk MySQL-compatible:

```bash
mkdir -p .local-backups
umask 077
mysqldump --single-transaction --routines --triggers --events \
  --host="$MYSQL_HOST" --port="${MYSQL_PORT:-3306}" \
  --user="$MYSQL_USER" --password \
  "$MYSQL_DATABASE" > ".local-backups/angelmind-$(date -u +%Y%m%dT%H%M%SZ).sql"
sha256sum .local-backups/*.sql
```

Simpan dump di lokasi terenkripsi di luar repository. Verifikasi ukuran dan checksum, lalu lakukan rehearsal restore ke database sementara sebelum migrasi. Jangan menganggap backup Supabase Storage sebagai backup database; Supabase mendokumentasikan database backup dan Storage object sebagai concern yang berbeda [1].

## C. Gate kompatibilitas repository saat ini

Jalankan pemeriksaan berikut:

```bash
pnpm check
pnpm vitest run server/ai-memory-retention.integration.test.ts --reporter=dot
node -e 'const c=require("./drizzle.config.ts"); console.log(c)' 2>/dev/null || true
sed -n '1,80p' drizzle.config.ts
```

Expected result untuk repository saat ini:

```text
dialect: "mysql"
dbCredentials: { url: process.env.DATABASE_URL }
```

Jika `DATABASE_URL` berisi host Supabase atau URL `postgres://`/`postgresql://`, **jangan menjalankan migration**. `drizzle-kit migrate` menjalankan migration yang dikonfigurasi terhadap dialect/schema yang dipilih; Drizzle mendukung migration terpisah untuk berbagai dialect, tetapi config dan schema harus sesuai dengan database target [2].

## D. Jalur aman yang direkomendasikan untuk branch saat ini

Jika tujuan Anda adalah membuat database AngelMind aktif sekarang tanpa melakukan porting besar, gunakan database MySQL-compatible. Set `DATABASE_URL` ke connection string MySQL-compatible yang dipilih, lalu dari repository:

```bash
set -a
. ./.env.local
set +a

pnpm check
pnpm drizzle-kit check
pnpm drizzle-kit migrate
```

Sesudah migration selesai, periksa migration `0047` dan `0048` pada database MySQL-compatible:

```bash
mysql --host="$MYSQL_HOST" --port="${MYSQL_PORT:-3306}" \
  --user="$MYSQL_USER" --password "$MYSQL_DATABASE" \
  -e 'SHOW INDEX FROM auditArchives; SHOW INDEX FROM aiRuns;'
```

Lalu jalankan integration test dengan environment database tersebut:

```bash
DATABASE_URL="$DATABASE_URL" pnpm vitest run server/ai-memory-retention.integration.test.ts --reporter=verbose
```

Test harus aktif, bukan `skipped`, dan harus memverifikasi bahwa payload expired terhapus sementara metadata/trace run tetap ada.

## E. Jalur resmi bila Supabase Postgres wajib menjadi database utama

Jalur ini **bukan** sekadar mengganti `DATABASE_URL`. Sebelum migration data, buat branch terpisah dan port runtime secara atomik:

```bash
git checkout -b port/postgres-supabase
```

Perubahan minimum yang harus diselesaikan dan direview:

1. Ganti schema Drizzle dari `drizzle-orm/mysql-core` ke `drizzle-orm/pg-core` dan ubah tipe/enum/index/foreign key ke semantics Postgres.
2. Ganti driver runtime `drizzle-orm/mysql2` dan package `mysql2` ke driver Postgres yang dipilih, misalnya `pg`/`node-postgres`, termasuk pool, SSL, timeout, dan shutdown behavior.
3. Buat `drizzle.pg.config.ts` terpisah dengan `dialect: "postgresql"`, schema Postgres, output migration baru, dan `DATABASE_URL` Supabase.
4. Port semua migration menjadi migration Postgres baru; jangan mengedit atau menjalankan file MySQL lama terhadap Postgres.
5. Audit query raw SQL, `onDuplicateKeyUpdate`, MySQL timestamp behavior, auto-increment, JSON/text handling, index syntax, locking, and transaction semantics.
6. Audit setiap foreign key dan cascade behavior, terutama `aiRuns`/`aiRunOutputs`, audit archive, jobs/outbox, evidence, research lifecycle, dan workspace ownership.
7. Tambahkan RLS policy hanya setelah server access model dan service-role boundary direview. Supabase menjelaskan RLS sebagai mekanisme keamanan ketika tabel diakses langsung dari client [1]; server-side service-role access tidak boleh diekspos ke frontend.
8. Jalankan seluruh unit test, integration test database, build, worker test, dan E2E contract terhadap project Supabase staging/non-production.

Setelah port selesai, command pattern-nya mengikuti config Postgres baru:

```bash
pnpm drizzle-kit check --config=drizzle.pg.config.ts
pnpm drizzle-kit generate --config=drizzle.pg.config.ts
pnpm drizzle-kit migrate --config=drizzle.pg.config.ts
```

Drizzle mendokumentasikan bahwa konfigurasi Postgres harus memakai `dialect: "postgresql"`, schema Postgres, serta driver Postgres yang sesuai [3]. Jangan menjalankan command di atas sebelum schema dan runtime AngelMind benar-benar sudah dipindahkan dan direview.

## F. Migrasi data setelah schema Postgres sudah lulus rehearsal

Lakukan hanya terhadap project Supabase staging terlebih dahulu. Urutannya adalah:

1. Buat backup sumber dan checksum.
2. Terapkan schema/migration Postgres pada staging.
3. Migrasikan tabel referensi lebih dahulu: users, organizations, workspaces, memberships.
4. Migrasikan tabel domain dengan urutan foreign key: research, findings, evidence/provenance, approvals/governance, jobs/outbox, AI runs/outputs/evaluations, notification ledgers, dan audit/archive metadata.
5. Pertahankan ID, timestamp UTC, enum state, `traceId`, hash, idempotency key, dan retention deadlines.
6. Untuk setiap tabel, hitung row count sumber dan target.
7. Jalankan checksum atau aggregate verification pada kolom non-secret yang relevan.
8. Jalankan integration test purge dan verifikasi bahwa expired output terhapus set-based serta active output tidak ikut terhapus.
9. Verifikasi authorization lintas workspace dan RLS bila akses database langsung memang diaktifkan.
10. Baru setelah owner menyetujui hasil staging, jadwalkan cutover production dengan maintenance window, rollback plan, dan observability.

Contoh pemeriksaan read-only di Supabase SQL Editor setelah schema Postgres tersedia:

```sql
select count(*) from public."aiRuns";
select count(*) from public."aiRunOutputs";
select count(*) from public."auditEvents";
select count(*) from public."workspaces";

select indexname
from pg_indexes
where schemaname = 'public'
  and tablename = 'aiRuns';
```

Jangan menganggap query contoh tersebut valid sebelum nama tabel/schema hasil porting dikonfirmasi; casing dan quoting Postgres dapat berbeda dari MySQL.

## G. Cutover dan rollback

Sebelum cutover, hentikan worker lama atau cegah enqueue baru agar tidak terjadi dual-write. Catat migration version, source checksum, target row counts, dan waktu cutover. Setelah aplikasi diarahkan ke Supabase Postgres:

```bash
pnpm check
pnpm build
pnpm vitest run --reporter=dot
DATABASE_URL="$SUPABASE_POSTGRES_URL" pnpm vitest run server/ai-memory-retention.integration.test.ts --reporter=verbose
```

Monitor `/healthz`, `/readyz`, `/metrics`, error rate, query latency, worker failures, purge duration, outbox backlog, dan authorization failures. Jika ada mismatch data, kegagalan constraint, atau purge yang tidak sesuai, lakukan rollback ke deployment/database source yang tervalidasi; jangan melakukan delete atau ad-hoc SQL corrective action tanpa backup dan approval.

## H. Checklist selesai

| Pemeriksaan | Harus benar sebelum production |
|---|---|
| Dialect | `drizzle.config.ts` dan runtime driver sama dengan target database |
| Secret | Tidak ada secret dalam Git, frontend bundle, log, atau command history |
| Backup | Dump sumber tersimpan aman dan restore rehearsal berhasil |
| Migration | Semua migration target sudah diterapkan dan tercatat |
| Data | Row count/checksum/foreign key verification lulus |
| Retention | Purge integration test aktif dan lulus pada database target |
| Authorization | Role matrix, workspace isolation, dan RLS/server boundary direview |
| Worker | Worker Railway memakai build terbaru dan purge scheduler aktif |
| Monitoring | `/metrics` dikumpulkan; rule alert durasi purge >30 detik dikonfigurasi |
| Rollback | Deployment, database, dan cutover rollback plan diuji |

## Rekomendasi untuk kondisi AngelMind sekarang

Dengan kondisi repository saat ini, **jangan migrasikan `drizzle/*.sql` langsung ke Supabase**. Pilihan paling aman adalah mempertahankan database MySQL-compatible untuk aplikasi dan memakai Supabase untuk Storage/Auth, atau membuat proyek porting Postgres terpisah sebelum cutover. Supabase menyediakan SQL Editor dan jalur migration, tetapi targetnya tetap Postgres sehingga file migration AngelMind yang masih ber-dialect MySQL tidak dapat dianggap kompatibel otomatis [1] [2] [3].

## Referensi

[1]: https://supabase.com/docs/guides/database/overview "Supabase Database Overview"
[2]: https://orm.drizzle.team/docs/kit-overview "Drizzle Kit Overview and Migration Commands"
[3]: https://orm.drizzle.team/docs/get-started/postgresql-new "Drizzle: Get Started with PostgreSQL"
