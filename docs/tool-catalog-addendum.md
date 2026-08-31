# Tool Catalog Addendum

Dokumen ini mencatat integrasi addendum katalog tool ke dalam registry AngelMind. Sumber metadata adalah `docs/angelmind_tool_manifests_addendum.yaml`, yang berasal dari addendum pengguna dan berisi **45 tool dalam tujuh kategori baru**.

## Status integrasi

| Atribut                  | Nilai                                                                                                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Total katalog            | 556 tool                                                                                                                                                               |
| Basis katalog            | 511 tool existing + 45 tool addendum                                                                                                                                   |
| Status metadata addendum | `provisional_from_user_pdf`                                                                                                                                            |
| Default activation       | Disabled                                                                                                                                                               |
| Execution policy         | Tool belum boleh dieksekusi sebelum verifikasi selesai                                                                                                                 |
| Definition of done       | Belum operational; source, version, runtime, adapter, parser, normalizer, health check, policy, test, cleanup, audit, dan monitoring masih harus diverifikasi per tool |

> Status `provisional_from_user_pdf` adalah metadata discovery, bukan bukti bahwa tool sudah terpasang, sehat, atau operational.

## Kategori addendum

| Kategori                   | Jumlah | Boundary awal                                                                      |
| -------------------------- | -----: | ---------------------------------------------------------------------------------- |
| Social Engineering         |      7 | Human approval; high/critical-risk tools tetap disabled                            |
| Adversary Simulation       |      7 | Scope check untuk medium/low; human approval untuk high                            |
| AI/LLM Security            |      9 | Candidate offline/artifact; tidak memiliki target execution atau credential access |
| Email/DNS Security         |      5 | Candidate passive review                                                           |
| Post-Exploitation          |      6 | Human approval; disabled high-risk                                                 |
| Blockchain Security        |      6 | Disabled sampai review runtime dan scope selesai                                   |
| Physical/Hardware Security |      5 | Human approval atau review scope; disabled by default                              |

## Enforcement

`server/tool-catalog.ts` tetap menjadi boundary tunggal untuk pencarian, filtering, ringkasan, dan keputusan execution. `getToolCatalogSummary()` menyediakan agregasi aktual berdasarkan **risk**, **disposition**, dan **category**, sehingga dashboard atau service tidak perlu menggunakan angka hardcoded.

Semua entry addendum memenuhi guard berikut sebelum dapat dipertimbangkan untuk execution:

1. Entry harus ditemukan melalui `toolKey` yang terdaftar.
2. Status verifikasi harus berubah menjadi `verified` melalui proses review yang sah.
3. Scope harus tervalidasi.
4. High dan critical risk harus memiliki human approval; privileged/destructive mode hanya diperbolehkan untuk critical risk dengan approval eksplisit.
5. Mode offline atau passive hanya dapat digunakan oleh disposition yang sesuai.

## Verification checklist

Perubahan ini dilindungi oleh `server/tool-catalog.test.ts`, yang memeriksa total katalog, risk totals, jumlah kategori addendum, keberadaan semua 45 nama tool, status provisional, status disabled-by-default, filtering disposition, serta penolakan execution sebelum verifikasi.

Entry tidak boleh dipindahkan ke status operational hanya karena tercantum di manifest. Setiap perubahan status harus disertai source, version pin, runtime analysis, dependency mapping, adapter/parser/normalizer, health check, scope/policy integration, execution test yang authorized, cleanup verification, audit logging, dan monitoring sebagaimana ditetapkan Master Build Specification.
