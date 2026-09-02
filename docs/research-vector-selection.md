# Research Vector Selection

AngelMind sekarang memiliki selector deterministik untuk mengubah metadata asset pasif menjadi rekomendasi research vector. Selector ini hanya membaca metadata yang sudah tersimpan; selector tidak melakukan DNS lookup, HTTP request, scanning, exploit, credential replay, atau submission.

## Alur

`asset metadata → fingerprint matching → deduplicated vector → capability + adapter recommendation → persisted research task`

Setiap task yang dibuat melalui `research.createTask` dapat menyertakan `assetId`. Jika asset ditemukan pada session yang sama, metadata asset diproses oleh `selectVectorsForAsset`. Task yang dibuat dari vector terpilih menyimpan `vectorKey`, `riskClass`, `requiredCapabilities`, dan `suggestedAdapters`.

| Risk class | Default task state | Approval state | Execution boundary |
|---|---|---|---|
| `low` / `medium` | `queued` | `approved` | Tetap mengikuti guardrail dan mode pasif |
| `high` / `critical` | `blocked` | `pending` | Tidak dapat berpindah ke `running` sebelum approval manusia |

Selector mengurutkan vector berdasarkan risiko secara menurun dan menggunakan nama vector sebagai tie-breaker. Hasilnya stabil untuk asset dan vector yang sama sehingga dapat diaudit dan diuji ulang. Metadata malformed diperlakukan sebagai raw metadata dan tidak menyebabkan selector melempar exception.

## Adapter policy

`suggestedAdapters` adalah rekomendasi capability mapping, bukan izin eksekusi. Runtime adapter tetap harus melewati verifikasi tool, validasi scope, mode yang diizinkan, dan approval yang sesuai. Adapter high/critical dan seluruh target-facing execution tetap disabled-by-default sesuai safety boundary repository.

## Database migration

Migration `0051_dashing_spectrum.sql` menambahkan metadata vector dan approval ke `researchTasks` secara additive. Kolom TEXT diisi bertahap sebelum diubah menjadi `NOT NULL` agar migration dapat berjalan pada tabel yang sudah berisi data. Migration ini belum menerapkan perubahan ke database live; penerapan production tetap membutuhkan owner environment.
