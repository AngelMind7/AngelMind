# Runtime Batch 01

Batch pertama memprioritaskan tool yang dapat berjalan pada image Railway tanpa akses target, tanpa credential, dan tanpa command arbitrary. Paket Debian yang tersedia untuk image Ubuntu Noble mencakup `binutils` versi `2.42-4ubuntu2.10`, `yara` versi `4.5.0-1build2`, `foremost` versi `1.5.7-11`, `sleuthkit` versi `4.12.1+dfsg-1.1ubuntu2`, `gitleaks` versi `8.16.0-1ubuntu0.24.04.3`, `jq` versi `1.7.1-3ubuntu0.24.04.2`, `ripgrep` versi `14.1.1-1`, `file` versi `1:5.45-3build1`, `dnsutils` versi `1:9.18.39-0ubuntu0.24.04.6`, dan `whois` versi `5.5.22`.

| Prioritas | Tool catalog                                     | Runtime command                         | Mode             | Status                                           |
| --------: | ------------------------------------------------ | --------------------------------------- | ---------------- | ------------------------------------------------ |
|         1 | `binary_artifact_analysis.24` — YARA             | `yara`                                  | Offline artifact | Adapter terdaftar; verification gate masih aktif |
|         2 | `binary_artifact_analysis.30` — objdump/binutils | `objdump`                               | Offline artifact | Adapter terdaftar; verification gate masih aktif |
|         3 | `validation.6` — Foremost                        | `foremost`                              | Offline artifact | Package candidate; adapter berikutnya            |
|         4 | `validation.13` — The Sleuth Kit                 | `fls`/`mmls`                            | Offline artifact | Package candidate; adapter berikutnya            |
|         5 | `secrets_detection.1` — Gitleaks                 | `gitleaks`                              | Offline artifact | Package candidate; adapter berikutnya            |
|         6 | `binary_artifact_analysis.5` — Detect It Easy    | Package availability perlu diverifikasi | Offline artifact | Belum dipasang                                   |

Tool akan dipindahkan ke `verified` hanya setelah source/license/version/runtime binary, adapter contract, health probe, parser/normalizer, cleanup, audit event, dan test terverifikasi. Tool yang melakukan active scanning, exploitation, credential access, phishing, persistence, C2, remote privileged execution, atau hardware access tidak termasuk Batch 01.
