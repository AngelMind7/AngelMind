# Runtime Operationalization Roadmap

Roadmap ini mengubah katalog 556 tool menjadi batch implementasi yang dapat dipasang dan diuji. Setiap batch hanya mencakup tool yang memiliki package atau binary yang dapat diverifikasi, command contract yang fixed, parser/normalizer yang jelas, dan mode yang sesuai. Tool tidak menjadi operational hanya karena tercantum di katalog.

| Batch | Fokus | Kandidat awal | Network | Gate |
|---:|---|---|---|---|
| 01 | Offline artifact triage | YARA, objdump/binutils, Foremost, The Sleuth Kit, Gitleaks | Disabled | Verification + artifact input |
| 02 | Offline source/dependency analysis | OSV-Scanner, Syft, Grype, Trivy, npm audit, pip-audit | Restricted/approved artifact source | Verification + workspace scope |
| 03 | Offline forensic/log analysis | Volatility3, Plaso, Sigma, Chainsaw, Hayabusa | Disabled | Artifact-only |
| 04 | Passive DNS/email/asset review | CheckDMARC, Spoofcheck, DKIMpy, crt.sh, DNSRecon | Restricted by scope | Human-reviewed scope |
| 05 | Passive threat-intelligence connectors | URLhaus, ThreatFox, AbuseIPDB, OTX, VirusTotal | External API only | Connector credentials + rate limit |
| 06 | Passive network inventory | Nmap safe discovery profiles, Amass passive, Subfinder, httpx | Restricted by allowlist | Explicit scope + approval |
| 07 | Review-only high-risk catalog | Web exploitation, credential, phishing, post-exploitation, wireless, hardware | Disabled | No runtime by default |

Batch 01 sudah terpasang pada Docker image dan adapter backend. Batch berikutnya harus melewati verifikasi package/license/version serta test output sebelum masuk Dockerfile. Paket yang melakukan active probing, exploitation, credential access, phishing, persistence, command-and-control, remote privileged access, atau destructive action tidak boleh diaktifkan massal; metadata-nya tetap tersedia untuk review dan approval workflow.

## Definition of done per tool

Tool dianggap siap dipakai hanya bila binary/version dapat diprobe, command arguments tidak menerima arbitrary shell, input dan output memiliki batas, timeout dan cleanup berhasil, parser menghasilkan schema stabil, policy memvalidasi workspace scope, audit event tidak membocorkan secret, dan test mencakup success, unavailable, timeout, malformed input, serta policy-blocked paths.
