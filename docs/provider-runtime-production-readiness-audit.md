# Audit Production Readiness: External Providers dan Runtime Tools

**Repository:** `AngelMind7/AngelMind`  
**Tanggal audit:** 5 September 2026  
**Commit dasar:** `c36a73e`  
**Ruang lingkup:** konfigurasi provider eksternal, readiness endpoint, runtime tool packs, provisioning binary, CI, deployment contract, dan batas aman eksekusi target-facing.

## Kesimpulan Eksekutif

Repository memiliki fondasi governance yang kuat, tetapi **belum dapat dinyatakan production-ready penuh untuk workload yang bergantung pada provider eksternal dan runtime tools**. Production URL yang diuji merespons sehat pada lapisan HTTP dan database, namun readiness payload melaporkan `runtime.configured=false` dan `providers.configured=false`. Endpoint tetap mengembalikan HTTP 200 karena implementasi readiness menganggap provider yang tidak dikonfigurasi sebagai kondisi siap selama tidak ada probe yang gagal.

Temuan paling penting adalah perbedaan antara **service hidup** dan **kapabilitas bisnis siap digunakan**. `/healthz`, `/readyz`, dan `/api/v1/health` lulus. Sebaliknya, provider LLM belum terkonfigurasi, runtime binary belum terpasang pada image production default, dan authenticated incident lifecycle belum dapat diuji terhadap deployment karena token staging serta database staging tidak tersedia di session ini.

Tidak ada target eksternal yang dipindai dan tidak ada data production yang dibuat atau diubah selama audit. Smoke request terhadap endpoint authenticated hanya memverifikasi bahwa authorization menolak request tanpa credential.

## Bukti Pemeriksaan

| Area | Hasil |
|---|---|
| Production `/healthz` | HTTP 200, `{"status":"ok"}` |
| Production `/readyz` | HTTP 200; database reachable, runtime configured false, providers configured false |
| Production `/api/v1/health` | HTTP 200, API v1 aktif |
| Production `/api/v1/tools` tanpa auth | HTTP 400, token/API key diwajibkan |
| Production `/api/v1/workspaces` tanpa auth | HTTP 400, token/API key diwajibkan |
| Production `/api/v1/incidents` tanpa auth | HTTP 403, authorization boundary aktif |
| API surface static contract | 349 executable endpoints; 267 named REST contract entries |
| Route contract | 133 registered routes |
| UTF catalog | 72 governed manifests |
| Runtime/simulation tests | 20 passed |
| Governance/lifecycle tests | 34 passed |
| Migration journal/safety/rollback | Passed |
| Authenticated staging E2E | Tidak dijalankan; credential dan database staging tidak tersedia |

## Model Readiness Saat Ini

Repository secara efektif memiliki empat lapisan readiness yang berbeda.

| Lapisan | Status | Penjelasan |
|---|---|---|
| HTTP process liveness | **Lulus** | `/healthz` hidup dan dapat menerima request. |
| Database readiness | **Lulus pada probe saat audit** | `/readyz` berhasil menjalankan `SELECT 1`. |
| Application capability readiness | **Belum penuh** | Provider LLM dan runtime tools dilaporkan tidak dikonfigurasi. |
| Authenticated business E2E | **Belum terbukti di deployment** | Belum ada token staging dan database staging disposable untuk membuat fixture lifecycle. |

Implementasi `/readyz` menghitung readiness production dengan kondisi database, runtime, dan providers. Namun `checkProviderProbes()` mengembalikan keadaan siap ketika tidak ada provider yang dikonfigurasi. Akibatnya, status HTTP 200 tidak berarti fitur AI atau provider eksternal benar-benar tersedia. Ini aman untuk mode degraded, tetapi tidak cukup sebagai gate “full production”.

## Temuan Provider Eksternal

### LLM primary dan fallback

Provider LLM dibaca melalui pasangan variable primary dan fallback. Provider yang tidak memiliki URL atau API key difilter dari daftar aktif. Jika daftar kosong, pemanggilan LLM gagal dengan pesan `No LLM provider is configured`.

| Variable | Peran | Status yang dibuktikan |
|---|---|---|
| `LLM_PRIMARY_API_BASE_URL` | Endpoint provider utama | Tidak tersedia di session audit |
| `LLM_PRIMARY_API_KEY` | Credential provider utama | Tidak tersedia di session audit |
| `LLM_PRIMARY_MODEL` | Model provider utama | Tidak tersedia di session audit |
| `LLM_FALLBACK_API_BASE_URL` | Endpoint fallback | Tidak tersedia di session audit |
| `LLM_FALLBACK_API_KEY` | Credential fallback | Tidak tersedia di session audit |
| `LLM_FALLBACK_MODEL` | Model fallback | Tidak tersedia di session audit |

**Risiko:** fitur yang memanggil `invokeLLM` atau daftar model dapat gagal setelah request melewati authentication. `/readyz` tidak menjadikan ketiadaan LLM sebagai failure sehingga deployment dapat terlihat sehat padahal kapabilitas AI tidak operasional.

**Kriteria penutupan:** setidaknya satu provider harus memiliki URL HTTPS, key, dan model yang valid. Untuk production penuh, provider primary dan fallback sebaiknya diuji dengan probe model listing atau request minimal yang tidak menghasilkan side effect. Probe harus memiliki timeout, redaction, rate limit, dan metrik per provider.

### Supabase Storage

Production validator mewajibkan `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, dan `SUPABASE_STORAGE_BUCKET`. Validator juga membatasi URL ke HTTPS dan host `.supabase.co`. Ini adalah gate yang baik untuk penyimpanan artifact, tetapi belum membuktikan bucket dapat dibaca dan ditulis oleh service account.

**Kriteria penutupan:** jalankan probe staging yang membuat object disposable, baca kembali object tersebut, verifikasi metadata, lalu hapus object. Probe production sebaiknya hanya melakukan operasi non-destruktif atau menggunakan bucket health-check khusus dengan lifecycle expiration.

### Firebase Admin authentication

Production validator mewajibkan `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, dan `FIREBASE_PRIVATE_KEY`. Smoke request production membuktikan endpoint menolak request tanpa token, tetapi belum membuktikan token valid dapat diverifikasi atau claims workspace dapat dipetakan.

**Kriteria penutupan:** gunakan akun E2E staging berumur pendek. Uji token valid, token expired, project mismatch, user tanpa membership, dan role yang tidak cukup. Jangan memakai credential admin production dalam local sandbox.

### Email/SMTP

SMTP tersedia sebagai konfigurasi opsional. `getSmtpConfig()` memvalidasi host, port, timeout, dan sender, tetapi production validator tidak mewajibkannya. Jika incident notification, password reset, atau invitation merupakan requirement production, SMTP harus dinaikkan menjadi deployment gate atau fitur harus dinyatakan explicitly disabled.

**Kriteria penutupan:** uji koneksi TLS/STARTTLS ke sandbox mailbox, verifikasi sender domain dan SPF/DKIM/DMARC, lalu uji retry serta redaction. Jangan mengirim email uji ke penerima nyata tanpa fixture mailbox.

### Malware scanner

`MALWARE_SCANNER_URL` bersifat opt-in. Pada production, URL harus HTTPS dan request memiliki timeout. `MALWARE_SCANNER_API_KEY` dapat dikirim sebagai Bearer token. Tidak ada bukti dalam audit bahwa provider scanner aktif di production.

**Risiko:** artifact scanning dapat berjalan dalam mode fallback atau tidak aktif, tergantung caller. Untuk workload yang menerima upload tidak tepercaya, keadaan ini harus terlihat pada readiness dan UI/API response.

**Kriteria penutupan:** konfigurasi provider scanner staging, uji fixture bersih dan EICAR-like test fixture pada environment terisolasi, validasi timeout/error behavior, dan pastikan artifact berbahaya tidak dipublikasikan sebelum scan selesai.

### Notification webhook dan observability

Webhook notification dan observability probe juga optional. Secret webhook, timeout, dan URL harus dipasang melalui secret manager. Belum ada bukti deployment-level bahwa event incident, worker failure, queue backlog, provider latency, dan provider error rate dikirim ke sistem observability.

**Kriteria penutupan:** pasang alert untuk readiness 503, provider failure, worker dead-letter, outbox retry saturation, dan incident escalation failure. `/metrics` harus diproteksi atau dibatasi jaringan; audit belum melakukan authenticated metrics check.

## Temuan Runtime Tools

### Catalog versus executable runtime

Catalog memiliki **72 governed manifests**, sedangkan runtime adapter image mendefinisikan paket eksekusi yang jauh lebih kecil. `Dockerfile.tools` dan smoke runner menyediakan 15 command probe utama: `ffuf`, `dalfox`, `interactsh-client`, `cloudfox`, `nuclei`, `subfinder`, `httpx`, `gitleaks`, `trivy`, `sqlmap`, `jwt_tool.py`, `ssrfmap`, `graphql-cop`, `naabu`, dan `katana`, ditambah `custom_script_runner`.

Burp Suite tetap ditandai sebagai `external_artifact` dan tidak diunduh otomatis. Ini benar secara lisensi dan supply-chain, tetapi berarti kemampuan tersebut belum tersedia kecuali artifact vendor dan checksum disuplai secara resmi.

| Komponen | Status | Dampak |
|---|---|---|
| Default production image | Passive/offline by design | Tidak boleh dianggap menyediakan tool target-facing |
| `Dockerfile.tools` | Terpisah dari default image | Harus dibangun dan dideploy ke service runtime khusus |
| Binary smoke test | Ada di GitHub Actions | Membuktikan binary start/help/version, bukan target authorization |
| Burp artifact | Tidak tersedia default | Membutuhkan artifact berlisensi dan verifikasi checksum |
| SSRFmap/GraphQL-Cop | Source/commit pinned | Tetap membutuhkan review adapter dan policy capability |
| Generated manifest modules | Tercatat, disabled-by-default | Belum membuktikan executable adapter tersedia |
| `RUNTIME_REQUIRED_BINARIES` | Optional | Runtime readiness dapat tetap ready ketika daftar kosong |

**Risiko utama:** deployment web dapat sehat sementara worker runtime yang dibutuhkan untuk tool execution belum terpasang, belum memiliki network policy, atau belum terhubung ke `RUNTIME_PACK_ID`. Readiness saat ini hanya memeriksa binary yang diminta melalui environment, bukan menjamin semua capability yang dipromosikan oleh catalog tersedia.

### Supply-chain dan reproducibility

Version binary Go dipin ke release tag. SQLMap dan JWT tool memakai tag. SSRFmap dan GraphQL-Cop diverifikasi terhadap commit tertentu setelah clone. Praktik ini baik, tetapi image build belum menunjukkan SBOM, signature/provenance attestation, vulnerability scan image, atau retention evidence yang menghubungkan digest image dengan deploy production.

**Kriteria penutupan:** publish image berdasarkan immutable digest, hasilkan SBOM, scan image dan dependencies, sign artifact, simpan smoke log, lalu deploy digest yang sama ke worker. Jangan memakai latest tag untuk runtime pack.

### Isolation dan network policy

`config/tool-runtime-packs.yaml` memisahkan analysis-pack offline, passive-pack dengan restricted network, dan review-required-pack tanpa eksekusi default. Dokumen juga menyatakan target-facing execution memerlukan authorization, scope, exclusion, approval, rate limit, isolated worker, normalized evidence, dan audit record.

Gap yang belum terbukti adalah konfigurasi enforcement di deployment: network egress restriction, resource quotas, filesystem isolation, timeout, output byte limit, worker identity, dan pemisahan service account. Kontrak kode tidak sama dengan bukti bahwa Railway service runtime telah diberi policy tersebut.

## Environment Contract Gap

Production validator saat ini mewajibkan database, archive signing, audit-state encryption, Firebase Admin, Supabase, dan cron secret. Manifest Railway di runtime pack hanya mendokumentasikan subset `NODE_ENV`, `DATABASE_URL`, dan `APP_ENCRYPTION_KEY` sebagai required runtime environment.

| Gap | Severity | Dampak |
|---|---|---|
| Railway manifest tidak mencerminkan seluruh validator production | **P0** | Deploy dapat lolos konfigurasi service lalu gagal saat startup atau fitur tertentu dipakai |
| Provider LLM tidak masuk production required gate | **P0 untuk AI workload** | Service ready tetapi AI request gagal runtime |
| Runtime binary list optional dan kosong | **P0 untuk tool workload** | Worker terlihat ready tanpa adapter executable |
| Storage write/read probe belum dibuktikan | **P1** | Artifact dapat gagal setelah upload diterima |
| Firebase token/membership E2E deployment belum dibuktikan | **P1** | Authenticated lifecycle belum terverifikasi |
| SMTP, malware scanner, webhook optional tanpa capability declaration terpusat | **P1** | Fitur dependent dapat degraded tanpa status yang jelas |
| Image digest/SBOM/signature evidence belum menjadi release gate | **P1** | Supply-chain provenance deployment belum lengkap |
| Runtime service network/resource policy belum dibuktikan | **P1** | Risiko egress, runaway process, atau output amplification |
| Production metrics/alerts belum dibuktikan | **P1** | Kegagalan provider dan worker dapat terlambat diketahui |

## Rencana Penutupan yang Disarankan

### Tahap 1 — Kontrak deployment dan capability declaration

Selaraskan `tool-runtime-packs.yaml`, `.env.example`, Railway variables, dan `validateRuntimeConfig()` agar memiliki satu daftar source-of-truth. Bedakan tiga mode dengan jelas: `web-only`, `full-control-plane`, dan `authorized-runtime-worker`. Setiap mode harus mempunyai required provider set sendiri.

Tambahkan capability readiness yang mengembalikan status per capability, bukan hanya boolean global. Contoh status yang dibutuhkan adalah `llm_primary`, `llm_fallback`, `storage`, `firebase_admin`, `smtp`, `malware_scanner`, `runtime_pack`, dan `observability`. Provider optional harus tetap muncul sebagai `disabled` atau `not_configured`, bukan disamarkan sebagai fully ready.

### Tahap 2 — Provider probes di staging

Siapkan environment staging terpisah dengan database disposable dan short-lived E2E token. Jalankan probe LLM primary/fallback, Firebase token verification, Supabase object round-trip, malware scanner fixture, SMTP sandbox, webhook signature verification, dan metrics scrape. Simpan hasil tanpa secret atau payload sensitif.

### Tahap 3 — Runtime worker evidence

Bangun `Dockerfile.tools` dari commit yang sama. Simpan image digest, SBOM, vulnerability scan, smoke log, dan runtime pack ID. Deploy worker terpisah dengan least-privilege service account. Set `RUNTIME_REQUIRED_BINARIES` hanya untuk command yang benar-benar diprovisioning pada pack tersebut.

Lakukan E2E harmless terhadap fixture lokal, bukan target eksternal. Uji timeout, cancellation, maximum output bytes, non-zero exit, missing binary, network-denied behavior, evidence normalization, audit record, dan human approval gate.

### Tahap 4 — Production promotion gate

Promosikan hanya digest image yang sama-sama lulus staging. `/readyz` web harus gagal atau berstatus degraded secara eksplisit bila capability wajib mode deployment belum siap. Healthcheck load balancer dan alert harus membedakan liveness, database readiness, provider readiness, dan runtime-worker readiness.

### Tahap 5 — Authenticated incident lifecycle

Dengan staging token, jalankan lifecycle lengkap: workspace authorization, research session, asset, observation, finding, incident create, acknowledge, escalate, resolve, close, evidence link, audit verification, dan idempotent replay. Setelah staging lulus, lakukan production canary hanya untuk read-only atau fixture tenant yang disetujui pemilik sistem.

## Keputusan Go/No-Go

**Status saat ini: NO-GO untuk klaim “production penuh”.** Deployment layak untuk web/API degraded mode dan health monitoring, tetapi belum layak diklaim sebagai full provider-backed control plane atau runtime-tool execution platform.

**Syarat minimum GO:**

1. Provider wajib untuk mode deployment telah dikonfigurasi dan berhasil diprobe.
2. Runtime worker image telah dipublish dengan digest, SBOM, smoke evidence, serta pack ID yang sesuai.
3. Authenticated staging E2E incident lifecycle lulus menggunakan database disposable.
4. Readiness endpoint menampilkan capability state yang tidak ambigu.
5. Network, resource, timeout, output, audit, dan approval controls terbukti pada worker deployment.
6. Alerting provider, database, worker, outbox, dan incident escalation telah diuji.

## References

[1]: https://github.com/AngelMind7/AngelMind/blob/c36a73e/server/_core/env.ts "AngelMind typed environment and production validator"
[2]: https://github.com/AngelMind7/AngelMind/blob/c36a73e/server/security.ts "AngelMind health and readiness routes"
[3]: https://github.com/AngelMind7/AngelMind/blob/c36a73e/server/_core/llm.ts "AngelMind LLM provider registry and fallback behavior"
[4]: https://github.com/AngelMind7/AngelMind/blob/c36a73e/Dockerfile.tools "AngelMind runtime tools image"
[5]: https://github.com/AngelMind7/AngelMind/blob/c36a73e/scripts/runtime-tool-smoke-test.sh "AngelMind harmless runtime adapter smoke test"
[6]: https://github.com/AngelMind7/AngelMind/blob/c36a73e/config/tool-runtime-packs.yaml "AngelMind runtime pack policy"
[7]: https://github.com/AngelMind7/AngelMind/blob/c36a73e/docs/adapter-binary-e2e.md "AngelMind binary adapter E2E verification contract"
[8]: https://github.com/AngelMind7/AngelMind/blob/c36a73e/docs/staging-verification.md "AngelMind staging and authenticated lifecycle verification guide"
[9]: https://github.com/AngelMind7/AngelMind/blob/c36a73e/scripts/check-utf-module-contract.mjs "AngelMind UTF module contract checker"
[10]: https://github.com/AngelMind7/AngelMind/blob/c36a73e/.github/workflows/container.yml "AngelMind container build and tools smoke workflow"
