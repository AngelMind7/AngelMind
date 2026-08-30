# AngelMind Tool Verification Report

## Status

Report ini memisahkan tiga hal yang tidak boleh disamakan: **source validity**, **installability**, dan **execution approval**. Manifest PDF user berhasil dinormalisasi menjadi 556 entry dari 33 kategori. Karena repository belum memiliki YAML manifest sumber atau mapping adapter resmi, seluruh entry awal berstatus `provisional_from_user_pdf`.

| Metric | Count |
|---|---:|
| Total manifest entries | 556 |
| Categories | 33 |
| Low risk | 246 |
| Medium risk | 187 |
| High risk | 74 |
| Critical risk | 49 |
| Candidate offline/artifact | 161 |
| Candidate passive review | 72 |
| Disabled high risk | 123 |
| Disabled review required | 200 |

## Verification rules

A tool may become an install candidate only when its canonical upstream source, license, pinned version, runtime, dependency lock, and adapter contract are identified. A tool may become executable only after its mode, scope policy, network policy, timeout, rate limit, output normalization, audit event, and approval gate pass tests. A valid open-source project is not automatically safe to execute.

All tools capable of phishing, credential capture, MFA bypass, exploit delivery, privilege discovery, remote command execution, lateral movement, persistence, C2, exfiltration, or physical access remain `disabled_high_risk`. They may be represented in the catalog and simulation-plan mode, but they are not installed into or executed by the Railway web backend.

## Upstream checks completed

| Tool or group | Source/license finding | Installability finding | Decision |
|---|---|---|---|
| ART | Trusted-AI upstream; MIT; Python ML security library | Python package available | Candidate for isolated artifact/offline worker after pinning |
| Counterfit | Microsoft/Azure upstream; MIT | Python plus Conda/Azure assumptions | Catalog only until runtime is isolated and dependencies pinned |
| Garak | NVIDIA upstream; Apache-2.0 | PyPI installation available | Offline/local-model mode only; target probing is not passive |
| Giskard | Giskard upstream; package available | Python 3.12+ indicated upstream | Candidate after Python runtime and dependency audit |
| PyRIT | Microsoft upstream; MIT | Python runtime documented upstream | Offline/sandbox mode only; external model calls require policy |
| LLM Guard | Protect AI upstream; MIT | PyPI available | `archived_legacy`; do not install production without replacement review |
| Vigil, Rebuff, promptmap | Upstream repositories found | Package/runtime requires individual pinning | Candidate only for artifact/local endpoint testing after review |
| Echidna, Manticore, Mythril, Slither | Canonical upstreams found; licenses recorded per manifest/source | Runtimes differ and some fuzz/symbolic operations are active | Contract/source artifact mode first; no arbitrary target execution |
| CheckDMARC, DKIMpy, Spoofcheck | Upstream/source found; canonical repository must be pinned | Python/package or script install | Passive DNS configuration review candidate |
| EmailRep, MXToolbox | Service/API, not local binaries | Requires API credential and rate limits | Adapter only; secret reference, quota, and audit required |
| APTSimulator, Atomic Red Team, CALDERA | Upstream projects found | Windows/agent/container assumptions | Catalog/simulation-plan only; isolated lab required for execution |
| Evilginx2, Gophish, King Phisher, Modlishka, SET | Upstream projects found | Installable in some environments | Disabled; phishing/credential capture is not passive |
| Evil-WinRM, PEASS-ng, PowerSploit, Seatbelt, SharpUp | Upstream projects found | Runtime/OS-specific | Disabled; remote command or privileged discovery risk |

## Recommended backend change

The first backend change should add a catalog and verification state, not a 556-package install. The catalog should track `toolKey`, `category`, `riskClass`, `sourceUrl`, `license`, `version`, `runtime`, `adapterType`, `executionMode`, `networkPolicy`, `credentialRef`, `definitionOfDone`, and `verificationStatus`. Workspace enablement should be separate from global catalog presence.

The execution path must remain `workspace → scope/exclusion → policy → budget/session guard → risk classification → approval gate → idempotent job → isolated worker → normalized artifact → observation/evidence → audit`. Credentials must be referenced, never stored in job payloads, logs, or the dashboard database.

## Upstream references

- [ART](https://github.com/trusted-ai/adversarial-robustness-toolbox)
- [Counterfit](https://github.com/Azure/counterfit)
- [Garak](https://github.com/NVIDIA/garak)
- [Giskard](https://github.com/Giskard-AI/giskard-oss)
- [LLM Guard](https://github.com/protectai/llm-guard)
- [PyRIT](https://github.com/microsoft/PyRIT)
- [Echidna](https://github.com/crytic/echidna)
- [Manticore](https://github.com/trailofbits/manticore)
- [Mythril](https://github.com/ConsenSysDiligence/mythril)
- [CheckDMARC](https://github.com/domainaware/checkdmarc)
- [APTSimulator](https://github.com/NextronSystems/APTSimulator)
- [Atomic Red Team](https://github.com/redcanaryco/atomic-red-team)
- [Apache CALDERA](https://github.com/apache/caldera)
- [TrustedSec SET](https://github.com/trustedsec/social-engineer-toolkit)

## Limitations

This report is not a claim that all 556 tools have been source-verified. The PDF contains names, categories, risk labels, and approval labels, but not a canonical source/version/runtime mapping for every entry. A final verified status requires that mapping or a per-tool upstream check. Until then, entries remain provisional and disabled by default.
