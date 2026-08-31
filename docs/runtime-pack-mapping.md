# Railway Runtime Pack Mapping

## Tujuan

Katalog AngelMind berisi 556 tool, tetapi katalog bukan berarti 556 tool sudah terpasang atau operational. Agar tool dapat benar-benar dipakai, setiap tool harus memiliki runtime yang terisolasi, command contract, parser/normalizer, health check, policy gate, audit event, dan test yang sesuai.

Railway dipetakan sebagai platform deployment dengan satu web/API service, satu worker, dan runtime pack terpisah. Runtime pack tidak mencampurkan tool berisiko tinggi dengan paket offline/passive. Konfigurasi kanonis berada di `config/tool-runtime-packs.yaml`.

## Mapping service

| Runtime pack           | Fokus                                   | Disposition yang diizinkan                       | Network default      | Status                          |
| ---------------------- | --------------------------------------- | ------------------------------------------------ | -------------------- | ------------------------------- |
| `artifact-pack`        | Analisis file/artifact secara offline   | `candidate_offline_or_artifact`                  | Disabled             | Kandidat tahap pertama          |
| `analysis-pack`        | Analisis lokal dan validasi input       | `candidate_offline_or_artifact`                  | Disabled             | Kandidat tahap pertama          |
| `passive-pack`         | Observasi passive yang scope-bound      | `candidate_passive_review`                       | Restricted by policy | Tahap kedua setelah policy siap |
| `review-required-pack` | Metadata/quarantine untuk tool berisiko | `disabled_review_required`, `disabled_high_risk` | Disabled             | Tidak menjalankan tool          |

## Kontrak operasional

Tool hanya dapat dipanggil jika sudah `verified`, scope telah divalidasi, runtime pack cocok dengan disposition, batas waktu dan output tersedia, serta policy mengizinkan mode tersebut. High-risk dan critical-risk memerlukan human approval eksplisit. Tool dengan fungsi phishing, credential theft, persistence, command-and-control, destructive execution, atau remote privileged access tidak dimasukkan ke default deployment.

Setiap execution harus berjalan sebagai job terisolasi melalui worker, menyimpan hanya reference ke secret, menerapkan timeout dan output limit, serta menulis audit event dengan `request_id`, workspace context, tool key, runtime pack, policy decision, dan hasil normalisasi. Backend tidak boleh memperlakukan keberadaan metadata sebagai bukti bahwa binary tersedia.

## Tahapan implementasi

Tahap pertama adalah membangun executor generik yang hanya menerima command contract terdaftar dan mengizinkan `artifact-pack` serta `analysis-pack` untuk input lokal yang diunggah user. Tahap berikutnya menambahkan adapter per tool yang benar-benar tersedia di image, bukan menebak nama binary. Setelah itu passive tools dapat diaktifkan satu per satu dengan scope validator dan network policy. Tool lain tetap berada di quarantine sampai verification checklist lengkap.

## Railway deployment notes

Web/API dan worker sebaiknya dipisahkan sebagai service Railway dengan konfigurasi environment yang sama untuk database dan signing secret, sedangkan setiap runtime pack menggunakan image atau service yang terpisah. `RUNTIME_PACK_ID`, `RUNTIME_MAX_SECONDS`, `RUNTIME_MAX_OUTPUT_BYTES`, dan `RUNTIME_NETWORK_POLICY` harus dikonfigurasi dari environment, bukan di-hardcode dalam source code. Health check tetap menggunakan endpoint `/healthz` dan readiness harus gagal bila runtime pack yang diwajibkan belum tersedia.
