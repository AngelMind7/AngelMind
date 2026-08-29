# Repository structure

AngelMind saat ini adalah satu control-plane repository dengan dua runtime utama: web/control plane TypeScript dan research foundation Python. Folder berikut adalah source of truth yang aktif.

| Path | Peran | Status |
|---|---|---|
| `client/` | React/Vite frontend, authenticated pages, marketing pages, localization, PWA | Aktif |
| `server/` | Express/tRPC control plane, auth, authorization, domain services, persistence adapters | Aktif |
| `shared/` | Shared constants, types, dan error contracts | Aktif |
| `drizzle/` | Database schema, relations, migrations, metadata | Aktif |
| `research-service/` | Python safety-first contracts, planner, guardrails, dan network-free rehearsal | Aktif; belum menjadi active target-facing worker |
| `scripts/` | Tooling maintenance dan one-off content migration | Campuran; script yang sudah dipakai perlu diarsipkan |
| `docs/` | Architecture, governance, deployment, readiness, dan blueprint mapping | Aktif |
| `.github/workflows/` | CI, container validation, E2E smoke, dependency/security checks | Aktif |
| `infrastructure/` | Prometheus scrape configuration dan infrastructure notes | Aktif |
| `ai-core/`, `api/`, `web/` | Placeholder/scaffold documentation dari rencana struktur awal | Belum menjadi package source of truth |

## Boundary yang wajib dipertahankan

`client/` tidak boleh menyimpan secret atau melakukan authorization sebagai source of truth. Semua authorization, tenant/workspace isolation, validation, audit, dan persistence harus ditegakkan di `server/` atau database layer.

`research-service/` saat ini bersifat network-free. Ia boleh membuat plan, mengevaluasi guardrail, dan melakukan rehearsal deterministik, tetapi tidak boleh berubah menjadi target-facing capability tanpa scope tertulis, approval, egress policy, independent audit, dan deployment boundary terpisah.

`ai-core/`, `api/`, dan `web/` tidak boleh menerima implementasi baru secara ad hoc. Jika nantinya monorepo package split benar-benar dilakukan, migration plan harus memindahkan source dan tests secara atomik. Sampai saat itu, contributor harus menaruh perubahan pada folder aktif yang tercantum di tabel.

## Aturan pemeliharaan

File service baru harus dikelompokkan berdasarkan domain. Router besar sebaiknya dipecah berdasarkan domain sebelum melewati ukuran yang menyulitkan review. Script migrasi sekali pakai harus diberi penanda lifecycle atau dipindahkan ke arsip setelah migrasinya committed. Dokumentasi root harus menunjuk ke dokumen canonical di `docs/`, bukan menyalin isi yang sama di banyak README.
