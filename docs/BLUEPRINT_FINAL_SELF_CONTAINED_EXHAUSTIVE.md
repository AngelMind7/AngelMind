# ANGEL × AngelMind
# Full Unified Blueprint — Self-Contained Lab Edition

**Versi:** 5.1-FINAL-SELF-CONTAINED-EXHAUSTIVE  
**Tanggal:** 2026-09-10  
**Status:** Active Proposed Technical Authority  
**Supersedes:** `STRUKTURANGEL(1).pdf` versi 4.0 dan `BLUEPRINT_FINAL_SELF_CONTAINED_LAB.md` versi 5.0  
**Repository target:** `AngelMind7/AngelMind`  
**Scope:** Implementasi penuh platform authorized security validation berbasis private reproducible lab  
**Acceptance:** P0 Critical dan P1 Hard  
**Mode:** Self-contained, deterministic, evidence-backed, fail-closed, GitHub-executable

---

# BAGIAN I — OTORITAS, TUJUAN, DAN BATASAN

## 1. Ringkasan Eksekutif

ANGEL × AngelMind adalah platform security validation yang menggabungkan **ANGEL** sebagai kerangka lifecycle platform dan **AngelMind** sebagai domain intelligence, capability registry, vector selection, orchestration, correlation, evidence, reporting, dan AI governance.

Versi ini secara khusus mengubah seluruh komponen yang sebelumnya bergantung pada target eksternal, lisensi komersial, perangkat fisik, akun cloud, API key, atau approval manual menjadi **self-contained lab component**. Dengan demikian, seluruh P0 dan P1 dapat dibangun, dijalankan, diuji, dan diverifikasi dari repository GitHub melalui clean checkout.

Platform tidak ditujukan sebagai tool serangan bebas. Platform ini adalah **authorized validation system**. Target assessment adalah synthetic target yang dibuat oleh repository. Adapter ofensif berisiko diganti dengan controlled validator yang hanya menguji property keamanan, policy enforcement, lifecycle, evidence, dan correlation pada lingkungan lab.

### Hasil yang wajib tersedia

Pada akhir implementasi, repository wajib memiliki:

1. Source code seluruh service utama.
2. Contracts yang menjadi sumber kebenaran komunikasi.
3. Self-contained lab yang dapat diprovision ulang.
4. Synthetic targets untuk setiap domain acceptance.
5. Adapter runtime dengan sandbox, rate limit, scope check, dan output normalizer.
6. Database schema dan migration.
7. P0/P1 automated test suite.
8. Evidence dan audit chain yang dapat diverifikasi.
9. Angular operator console yang menampilkan state nyata.
10. GitHub Actions release gate.
11. Release record yang mengikat commit, image, dependency, test, evidence, dan teardown.

## 2. Definisi “Selesai”

Sebuah komponen dianggap selesai hanya jika komponen tersebut memiliki implementasi, contract, test, target lab, data seed, evidence path, audit path, dokumentasi, dan hubungan eksplisit dengan acceptance ID.

Status `blocked`, `external-required`, `license-required`, `device-required`, `manual-only`, `mock-only`, `placeholder`, atau `not-implemented` tidak boleh muncul sebagai status lulus release.

Jika bagian asli tidak dapat direalisasikan secara mandiri, bagian tersebut tidak dihapus tanpa pengganti. Bagian tersebut diganti dengan equivalent self-contained yang mempertahankan tujuan acceptance.

## 3. Prinsip Desain Otoritatif

| Prinsip | Implementasi wajib |
|---|---|
| Functional separation | Setiap service memiliki tanggung jawab tunggal dan API boundary jelas |
| Typed contracts | Komunikasi memakai OpenAPI, JSON Schema, atau protobuf-style schema yang tervalidasi |
| Explicit policy gates | Tidak ada dispatch atau tool call tanpa scope, risk, dan policy decision |
| Bounded workflows | Workflow memiliki timeout, retry budget, cancellation, dan compensation |
| Immutable evidence | Evidence memiliki canonical payload, hash, parent hash, dan verification status |
| Deterministic lab | Versi image, seed, fixture, dan scenario dipin |
| Recoverable changes | Backup, restore, rollback, drift recovery, dan teardown diverifikasi |
| Hash-chained audit | Audit append-only dan perubahan historis terdeteksi |
| Tenant isolation | Semua tabel tenant-sensitive memakai PostgreSQL RLS fail-closed |
| No fake state | UI hanya menampilkan state backend yang memiliki record |
| No untracked execution | Setiap execution memiliki task, worker, scope, policy, dan evidence reference |
| No unsafe target | Acceptance hanya berjalan terhadap target yang dibuat lab |
| No external blocker | Acceptance tidak bergantung pada layanan luar repository |

## 4. Scope yang Diizinkan

Scope default adalah asset yang dibuat oleh `lab/targets/` dan didaftarkan ke `asset_registry`. Setiap asset memiliki workspace, environment, owner, authorization reference internal lab, expiry, allowed operations, dan scope hash.

Target internet, akun cloud nyata, perangkat pihak ketiga, domain produksi, wireless hardware, dan identity production tidak dibutuhkan untuk P0/P1. Extension untuk target authorized di masa depan harus berada di luar acceptance default dan tidak boleh mengubah hasil release lab.

## 5. Model Penggantian Komponen

| Komponen awal | Pengganti final | Kenapa dapat dikerjakan penuh |
|---|---|---|
| Burp Pro | OWASP ZAP container dan Controlled HTTP Validator | Dapat dipin, dijalankan lokal, dan memiliki output parser |
| Cobalt Strike/C2 framework | Synthetic Assessment Agent | Menguji worker lifecycle tanpa persistence atau operasi berbahaya |
| Mimikatz/Rubeus | Synthetic Identity Graph Validator | Menguji role, privilege, expiry, dan revocation berbasis data lab |
| Cloud AWS/GCP/Azure | Local Cloud Lab dan metadata simulator | Tidak memerlukan akun, billing, credential, atau network eksternal |
| Kubernetes eksternal | kind local cluster | Cluster dibuat dan dihancurkan oleh test |
| Mobile device | APK fixture dan static artifact analyzer | Tidak memerlukan hardware atau device account |
| Blockchain public network | Private local chain | Node, contract, account, dan state dikontrol repository |
| Wireless hardware | Virtual network namespace | Allowed/denied path dapat diuji reproducibly |
| Social engineering nyata | Synthetic deception/canary lab | Event dan alert dapat dibuat tanpa manusia eksternal |
| SIEM eksternal | OpenTelemetry, Prometheus, Loki, Jaeger lokal | Telemetry dapat dikumpulkan dan diverifikasi di lab |
| Secret manager eksternal | Local secret service/Vault-compatible dev service | Rotation dan revocation dapat diulang dalam test |
| S3/object store eksternal | MinIO-compatible local artifact store | Hash, upload, retention, backup, dan restore dapat diuji |
| Human manual approval CI | Ed25519 Lab Approval Authority | Signature, expiry, scope, dan audit diverifikasi otomatis |
| Manual release manager | Ed25519 Lab Release Authority | Release record tetap signed dan reproducible |

---

# BAGIAN II — ARSITEKTUR PLATFORM

## 6. Arsitektur 7-Layer

```text
L7 VERIFICATION AND RELEASE
  contract, integration, lab, recovery, security, dependency, release tests

L6 EVIDENCE AND REPORTING
  evidence ledger, hash chain, provenance, findings, reports, timeline

L5 OPERATOR EXPERIENCE
  dashboard, asset, scope, approval, worker, task, evidence, graph, release

L4 ORCHESTRATION AND CORRELATION
  planner, dependency graph, retry, compensation, vector selection, AI guard

L3 AUTHENTICATED ASSESSMENT WORKERS
  enrollment, heartbeat, dispatch, sandbox, adapters, normalization, quarantine

L2 CONTROL PLANE AND GATEWAY
  identity, RBAC, scope, policy, task state, approval, audit, RLS, emergency stop

L1 SELF-CONTAINED PRIVATE LAB
  services, targets, network, databases, identity, telemetry, storage, recovery
```

## 7. L1 — Self-Contained Private Lab

### 7.1 Tanggung jawab

L1 memprovision semua dependency internal. L1 tidak mengambil credential, target, image yang tidak dipin, atau service dari lingkungan user. Semua service memiliki health endpoint, version endpoint, readiness condition, dan teardown manifest.

L1 menyediakan:

- Core control-plane network.
- Gateway network.
- Worker sandbox network.
- Target network.
- Evidence network.
- PostgreSQL dan MongoDB.
- Synthetic identity provider.
- Local object store.
- Local secret service.
- Local telemetry stack.
- Web/API vulnerable lab.
- Local cloud policy lab.
- Local Kubernetes cluster.
- Mobile artifact fixture lab.
- Private blockchain lab.
- Deception lab.
- Backup and restore destination.

### 7.2 Health criteria

Service dianggap healthy jika container running, readiness check berhasil, version sesuai lock file, migration selesai, seed checksum benar, network route sesuai manifest, dan log tidak menunjukkan fatal error.

### 7.3 Teardown criteria

Teardown dianggap lulus jika seluruh resource dalam inventory terhapus atau berhenti, tidak ada worker aktif, tidak ada task running, tidak ada job pending, tidak ada secret aktif, tidak ada artifact temporary, dan verification record memiliki hash.

## 8. L2 — Control Plane and Gateway

### 8.1 Komponen

- Operator authenticator.
- Lab authority authenticator.
- Worker authenticator.
- Service-to-service identity.
- RBAC policy.
- Scope policy.
- Risk classification policy.
- Approval policy.
- Task state machine.
- Worker registry.
- Rate limiter.
- Emergency stop.
- Audit hash chain.
- RLS context middleware.
- Idempotency store.
- Error catalog.

### 8.2 Boundary

L2 menerima request eksternal hanya melalui gateway contract. L2 tidak memanggil adapter secara langsung. L2 menerbitkan signed task envelope kepada L3.

### 8.3 Fail-closed conditions

L2 wajib menolak request jika actor tidak aktif, workspace tidak valid, asset tidak terdaftar, scope expired, capability tidak terdaftar, risk tidak konsisten, approval tidak valid, worker tidak enrolled, atau idempotency key conflict.

## 9. L3 — Assessment Workers

### 9.1 Worker lifecycle

```text
enrolled → healthy → assigned → running → result_submitted → verified
                         ↓
                    quarantined/revoked
```

Worker harus memiliki certificate fingerprint, capability set, version, sandbox profile, heartbeat, last-seen time, dan revocation state.

### 9.2 Sandbox

Sandbox menetapkan CPU limit, memory limit, timeout, filesystem mode, network allowlist, environment variable allowlist, output size limit, dan process limit. Adapter tidak boleh mengakses host filesystem atau network di luar target lab yang terdaftar.

### 9.3 Result verification

Hasil worker diverifikasi terhadap task ID, worker signature, adapter manifest, schema, execution timestamp, output size, scope hash, dan policy version. Hasil yang tidak cocok masuk quarantine.

## 10. L4 — Orchestration and Correlation

### 10.1 Workflow node

```text
load_scope
→ validate_identity
→ select_capability
→ select_vector
→ evaluate_risk
→ validate_approval
→ dispatch_worker
→ collect_result
→ normalize_observation
→ seal_evidence
→ correlate
→ build_finding
→ generate_report
→ compensate_or_complete
```

### 10.2 Bounded workflow

Setiap workflow wajib memiliki maximum duration, per-node timeout, retry budget, retryable error list, non-retryable error list, cancellation token, compensation action, terminal state, dan decision trace.

### 10.3 AI gateway

AI hanya menerima context yang telah dipisahkan menjadi trusted policy, observed data, untrusted text, dan tool metadata. AI tidak dapat langsung mengeksekusi adapter. Semua tool call melewati L2 policy recheck. Instruksi di dalam target data dianggap untrusted dan tidak dapat mengubah policy.

## 11. L5 — Operator Experience

L5 menyediakan layar berikut:

| Feature | Data backend |
|---|---|
| Dashboard | health, running tasks, failed tasks, findings, release status |
| Assets | asset registry, ownership, scope, environment, status |
| Scope | allowlist, expiry, operation policy, scope hash |
| Approvals | pending request, risk, diff, authority, expiry, signature status |
| Workers | enrollment, heartbeat, capabilities, health, quarantine |
| Tasks | lifecycle, state history, retries, cancellation, error |
| Executions | adapter, version, runtime, input/output hash, status |
| Evidence | provenance, hash chain, classification, verification |
| Findings | severity, confidence, remediation, evidence links |
| Chain graph | nodes, edges, rule IDs, confidence, source evidence |
| Reports | executive, technical, timeline, remediation, export hash |
| Recovery | backup, restore, rollback, drift, teardown |
| Release | commit, images, tests, hashes, signoff, blockers |

UI tidak boleh membuat finding, evidence, task state, atau success counter secara lokal.

## 12. L6 — Evidence and Reporting

Evidence service menyimpan canonical payload, source type, execution reference, observation reference, artifact reference, hash, parent hash, timestamp, classification, redaction result, verification status, dan workspace ID.

Report service menghasilkan executive report, technical report, timeline, evidence manifest, remediation list, severity explanation, confidence, source type, release reference, dan report hash.

## 13. L7 — Verification and Release

L7 tidak digunakan oleh runtime. L7 boleh mengakses seluruh layer hanya untuk testing. L7 menjalankan import boundary checker, contract checker, schema checker, dependency lock checker, secret scanner, P0/P1 suite, recovery suite, release generator, dan clean checkout test.

---

# BAGIAN III — REPOSITORY FINAL

## 14. Root Repository

```text
ANGEL/
├── apps/
├── contracts/
├── lab/
├── src/
├── adapters/
├── deploy/
├── scripts/
├── tests/
├── docs/
├── .github/workflows/
├── Dockerfile
├── compose.yaml
├── Makefile
├── go.mod
├── go.sum
├── package.json
├── pyproject.toml
├── global-policy.yaml
├── dependency-lock.json
├── README.md
├── LICENSE
└── .gitignore
```

## 15. Struktur Aplikasi

```text
apps/
├── frontend-angular/
│   ├── src/app/core/
│   │   ├── auth/
│   │   ├── api/
│   │   ├── guards/
│   │   └── interceptors/
│   ├── src/app/features/
│   │   ├── dashboard/
│   │   ├── assets/
│   │   ├── scopes/
│   │   ├── approvals/
│   │   ├── workers/
│   │   ├── tasks/
│   │   ├── executions/
│   │   ├── findings/
│   │   ├── evidence/
│   │   ├── chain-graph/
│   │   ├── reports/
│   │   ├── recovery/
│   │   └── release/
│   └── package.json
├── gateway-dotnet/
│   ├── Authentication/
│   ├── Authorization/
│   ├── Contracts/
│   ├── Endpoints/
│   ├── Middleware/
│   ├── Persistence/
│   ├── Program.cs
│   └── AngelGateway.csproj
└── orchestrator/
    ├── nodes/
    ├── policies/
    ├── workflows/
    ├── state/
    ├── planner.py
    └── pyproject.toml
```

## 16. Struktur Source

```text
src/
├── control_plane/
│   ├── identity/
│   ├── authorization/
│   ├── scope/
│   ├── tasks/
│   ├── approvals/
│   ├── workers/
│   ├── audit/
│   ├── rate_limit/
│   └── emergency_stop/
├── worker_runtime/
│   ├── enrollment/
│   ├── heartbeat/
│   ├── dispatch/
│   ├── sandbox/
│   ├── quarantine/
│   └── result_verifier/
├── capability_registry/
├── adapter_runtime/
├── policy_engine/
├── orchestration/
├── correlation/
├── evidence/
├── reporting/
├── recovery/
├── telemetry/
├── asset_intelligence/
├── application_security/
├── database_security/
├── identity_security/
├── network_security/
├── cloud_security/
├── kubernetes_security/
├── mobile_security/
├── blockchain_security/
├── deception/
├── artifact_integrity/
└── ai_gateway/
```

## 17. Adapter Structure

```text
adapters/
├── controlled_http_validator/
│   ├── manifest.yaml
│   ├── executor.py
│   ├── normalizer.py
│   ├── redaction.yaml
│   └── tests/
├── database_policy_validator/
├── identity_graph_validator/
├── network_path_validator/
├── telemetry_validator/
├── secret_governance_validator/
├── artifact_integrity_validator/
├── local_cloud_policy_validator/
├── local_k8s_policy_validator/
├── mobile_artifact_validator/
├── solidity_policy_validator/
├── synthetic_deception_validator/
└── synthetic_assessment_agent/
```

Setiap adapter wajib memiliki manifest, input schema, output schema, capability IDs, vector IDs, risk class, priority, fallback, rate limit, sandbox, redaction, health check, version, checksum, dan test.

---

# BAGIAN IV — KONTRAK DAN DATABASE

## 18. Contract Categories

```text
contracts/
├── api/
│   ├── openapi.yaml
│   ├── errors.yaml
│   └── pagination.yaml
├── identity/
├── authorization/
├── scopes/
├── assets/
├── capabilities/
├── vectors/
├── adapters/
├── tasks/
├── approvals/
├── workers/
├── executions/
├── observations/
├── evidence/
├── findings/
├── graph/
├── telemetry/
├── recovery/
└── release/
```

Contracts wajib versioned. Breaking change membutuhkan schema version baru, compatibility test, migration, dan release note.

## 19. Entitas Database Utama

| Tabel | Fungsi |
|---|---|
| `users` | Identitas operator lab |
| `organizations` | Tenant tingkat organisasi |
| `workspaces` | Boundary isolasi data |
| `memberships` | User-role-workspace mapping |
| `roles` | Role definitions |
| `permissions` | Resource/action permissions |
| `projects` | Project container |
| `security_programs` | Program dan authorization metadata internal lab |
| `scopes` | Allowlist asset dan operation policy |
| `assets` | Asset synthetic lab |
| `asset_relationships` | Hubungan antar asset |
| `research` | Assessment run |
| `research_tasks` | Task capability-driven |
| `tools` | Tool/validator registry |
| `tool_versions` | Version dan checksum |
| `capabilities` | Capability registry |
| `tool_adapters` | Adapter priority dan fallback |
| `tool_executions` | Execution record |
| `jobs` | Queue lifecycle |
| `observations` | Normalized output |
| `evidence` | Hash-linked proof |
| `findings` | Security finding |
| `knowledge_nodes` | Graph nodes |
| `knowledge_relationships` | Graph edges |
| `audit_logs` | Append-only audit |
| `notifications` | Operator notification |
| `assessment_workers` | Worker registry |
| `recovery_records` | Backup/restore/rollback/teardown |
| `release_records` | Signed release record |

## 20. Mandatory Database Invariants

1. Semua primary key menggunakan UUID.
2. Semua tenant-sensitive record memiliki `workspace_id` langsung atau melalui foreign-key path yang tervalidasi.
3. Semua status menggunakan enum atau constrained value.
4. Semua execution memiliki idempotency key unik.
5. Semua approval memiliki reason, authority, expiry, signature, dan scope hash.
6. Semua evidence memiliki hash dan classification.
7. Semua audit entry memiliki previous hash dan request ID.
8. Semua tool memiliki risk class dan active version.
9. Semua adapter memiliki capability dan fallback policy.
10. Semua release memiliki commit SHA dan evidence root hash.

## 21. RLS Policy

PostgreSQL RLS diaktifkan pada seluruh tabel tenant-sensitive. Application connection tidak menggunakan superuser. Workspace context wajib diberikan pada setiap transaction.

```sql
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE research ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE release_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_isolation ON assets
FOR ALL
USING (workspace_id = current_setting('app.current_workspace_id', true)::uuid)
WITH CHECK (workspace_id = current_setting('app.current_workspace_id', true)::uuid);
```

Jika setting kosong, query harus menghasilkan deny. Test wajib mencakup read, insert, update, delete, background job, dan cross-workspace access.

## 22. Audit Hash Chain

Canonical audit entry memiliki `entry_id`, `actor`, `workspace_id`, `action`, `resource_type`, `resource_id`, `request_id`, `result`, `timestamp`, `metadata_hash`, `previous_entry_hash`, dan `entry_hash`.

```text
entry_hash = SHA256(canonical_entry_without_entry_hash + previous_entry_hash)
```

Entry lama tidak boleh di-update atau di-delete oleh application role. Verification harus mendeteksi perubahan payload, urutan, parent hash, dan gap sequence.

---

# BAGIAN V — LAB TARGET DAN SCENARIO

## 23. Web/API Lab

Web/API Lab terdiri dari service yang sengaja memiliki state dan policy defect terkontrol, yaitu authorization boundary defect, input validation defect, insecure configuration, unsafe file policy, simulated SSRF path, dan schema mismatch.

Defect hanya berada di private lab. Setiap defect memiliki scenario ID, expected observation, expected evidence, expected severity, dan remediation rule. Controlled validator tidak melakukan payload destructive.

## 24. Database Lab

Database Lab memiliki PostgreSQL target dan MongoDB target dengan user, role, schema, collection, audit setting, backup object, dan policy fixture. Test menjalankan policy inspection, privilege graph, configuration baseline, backup hash, restore comparison, dan evidence generation.

## 25. Synthetic Identity Lab

Identity Lab menyediakan user, group, service identity, role, expiry, stale account, revoked credential, over-privileged role, dan access review fixture. Validator hanya membaca dan mensimulasikan policy outcome pada identity graph lokal.

## 26. Network Lab

Network Lab menggunakan network namespace, virtual firewall, CoreDNS, route table, service endpoint, allowed path, denied path, dan containment rule. Path probe menghasilkan route evidence, policy decision, latency, and denial reason.

## 27. Local Cloud Lab

Local Cloud Lab memiliki metadata simulator, IAM policy store, object storage policy, service identity, credential fixture, and dependency graph. Scenario utama:

```text
synthetic SSRF observation
→ metadata access observation
→ credential material policy observation
→ IAM overpermission observation
→ correlation finding
```

Tidak ada credential cloud nyata dan tidak ada request ke cloud provider.

## 28. Local Kubernetes Lab

kind cluster dibuat saat profile `k8s` aktif. Cluster berisi namespace tenant, service account, RBAC fixture, secret fixture, network policy, deployment, and artifact. Validator memeriksa policy dan menghasilkan evidence tanpa melakukan destructive action.

## 29. Mobile Artifact Lab

Mobile Lab menggunakan APK fixture yang dibuat dan disimpan dalam repository artifact fixture. Validator memeriksa manifest, permission, embedded secret marker, deeplink, certificate metadata, version, checksum, dan tamper state. IPA atau device fisik tidak diperlukan untuk acceptance.

## 30. Private Blockchain Lab

Private chain dibuat lokal dengan contract fixture yang memiliki access-control defect, reentrancy marker, upgradeability change, dan token policy fixture. Validator bekerja pada source/bytecode/metadata lokal. Tidak ada wallet nyata, public RPC, atau asset bernilai.

## 31. Deception Lab

Deception Lab memiliki decoy service, canary token, synthetic user, event collector, alert rule, and containment record. Akses ke canary menghasilkan event yang masuk telemetry, correlation engine, timeline, finding, dan report.

## 32. Telemetry Lab

Telemetry Lab mengumpulkan structured log, metric, trace, audit event, worker heartbeat, tool execution event, evidence event, and recovery event. Tamper scenario mengubah event fixture setelah seal dan harus terdeteksi.

## 33. Seed dan Scenario Format

```yaml
scenario_id: cloud-chain-001
profile: cloud
asset_ids:
  - asset-web-lab
  - asset-metadata-lab
  - asset-iam-lab
required_capabilities:
  - ssrf-testing
  - cloud-metadata-testing
  - iam-analysis
expected_chain:
  - vector: ssrf-internal
    severity: high
  - vector: cloud-metadata-exposure
    severity: critical
  - vector: cloud-iam-overpermission
    severity: critical
approval_required: true
expected_evidence_count: 3
expected_finding_count: 1
```

---

# BAGIAN VI — CAPABILITY, ADAPTER, DAN RISK

## 34. Capability Registry

Capability tidak menyebut tool vendor sebagai requirement. Capability menyatakan kemampuan, input, output, policy, vector, risk, lab profile, adapter chain, dan test.

### Capability inti

| Capability | Vector | Risk | Lab |
|---|---|---:|---|
| `api-contract-testing` | API misconfiguration | medium | web-api |
| `authorization-boundary-testing` | IDOR horizontal/vertical | high | web-api |
| `input-validation-testing` | validation defect | high | web-api |
| `ssrf-simulation` | internal path exposure | critical | web-api/cloud |
| `database-policy-analysis` | privilege/configuration | high | data |
| `identity-graph-analysis` | overpermission/stale identity | high | identity |
| `segmentation-testing` | denied-path violation | high | network |
| `secret-governance` | expiry/revocation/redaction | high | core/identity |
| `artifact-integrity` | tamper/signature/hash | high | core/mobile/blockchain |
| `cloud-policy-analysis` | metadata/IAM/storage | critical | cloud |
| `k8s-policy-analysis` | RBAC/secret/network policy | critical | k8s |
| `mobile-artifact-analysis` | embedded secret/deeplink | medium/high | mobile |
| `contract-policy-analysis` | access/reentrancy/diff | high/critical | blockchain |
| `deception-event-analysis` | canary access | high | deception |
| `telemetry-integrity` | event loss/tamper | high | telemetry |

## 35. Adapter Manifest

```yaml
adapter_id: local_cloud_policy_validator
version: 1.0.0
capabilities:
  - cloud-policy-analysis
vectors:
  - cloud-metadata-exposure
  - cloud-iam-overpermission
tier: controlled_specialist
priority: 1
fallback_chain:
  - local_cloud_policy_replay
risk_class: critical
requires_human_approval: true
execution_policy:
  cpu_limit: 1
  memory_limit: 256Mi
timeout: 30s
network_policy: target_lab_only
filesystem_policy: read_only_workspace
rate_limit:
  requests_per_second: 2
  requests_per_minute: 30
  burst: 2
output:
  format: json
  schema: contracts/observations/cloud-observation.schema.json
redaction:
  - field_pattern: credential
    method: hash
```

## 36. Fallback Rules

Fallback hanya boleh digunakan jika adapter utama health check gagal atau mengembalikan declared unavailable. Fallback tidak boleh mengubah capability, scope, risk class, evidence schema, atau approval requirement. Fallback event wajib tercatat.

## 37. Risk Classification

Risk tidak hanya berasal dari nama validator. Risk dihitung dari capability, operation, asset environment, state-changing flag, scope breadth, data classification, and expected blast radius.

```text
risk = max(capability_risk, operation_risk, environment_risk)
```

Jika risk class registry dan manifest berbeda, execution ditolak.

---

# BAGIAN VII — WORKFLOW DAN POLICY

## 38. Task Creation

Task dibuat hanya jika research aktif, asset aktif, scope valid, capability terdaftar, vector tersedia, adapter ready, worker eligible, dan policy version diketahui. Task menerima idempotency key.

## 39. Approval Flow

```text
planner creates task
→ policy classifies risk
→ low/medium: automatic policy decision
→ high/critical: pending_approval
→ lab authority signs canonical approval
→ gateway verifies signature and expiry
→ task queued
→ worker dispatch
```

Approval signature bukan status UI. Signature diverifikasi secara cryptographic dan payload binding diuji dengan negative tests.

## 40. Emergency Stop

Emergency stop memiliki scope global, workspace, research, task, worker, dan adapter. Saat aktif, dispatch baru ditolak, running task menerima cancellation, worker memasuki safe terminal state, dan audit event dibuat.

## 41. Retry dan Compensation

Retry hanya untuk error yang declared retryable. Setiap retry menggunakan attempt number baru dan idempotency handling. Compensation membatalkan temporary lab state yang dibuat oleh workflow. Compensation failure menjadi terminal failure dan release blocker.

## 42. Vector Selection

```text
fingerprint asset
→ normalize technology identifiers
→ lookup capability map
→ lookup vector map
→ compute risk class
→ select adapter chain
→ validate lab profile
→ create research task
```

Rule output wajib menjelaskan mapping source, rule ID, capability version, vector version, risk reason, adapter selected, dan fallback.

## 43. Correlation Engine

Correlation engine menggabungkan observation berdasarkan asset, execution, time window, relationship, confidence, and rule. Rule tidak boleh hanya bergantung pada kata-kata AI.

Contoh rule:

```yaml
rule_id: chain-ssrf-metadata-iam-001
inputs:
  - vector: ssrf-internal
  - vector: cloud-metadata-exposure
  - vector: cloud-iam-overpermission
constraints:
  same_asset_group: true
  max_window_seconds: 300
output:
  severity: critical
  finding_type: chained-cloud-exposure
  evidence_required: 3
```

---

# BAGIAN VIII — EVIDENCE, FINDING, DAN REPORT

## 44. Evidence Lifecycle

```text
observation_received
→ schema_validated
→ redacted
→ classified
→ canonicalized
→ hashed
→ parent_linked
→ stored
→ verified
```

Evidence yang gagal schema, redaction, hash, atau provenance tidak boleh digunakan untuk finding confirmed.

## 45. Redaction

Redaction dilakukan sebelum evidence masuk report atau log. Secret value tidak boleh masuk database plaintext, log, UI, artifact, atau report. Untuk kebutuhan correlation, value diganti dengan stable hash atau token reference.

## 46. Finding Lifecycle

```text
candidate
→ evidence_sufficient
→ confirmed
→ notified
→ remediation
→ retest
→ resolved/reopened
```

Finding memiliki severity, confidence, impact, evidence IDs, rule IDs, remediation, affected asset, owner, status, and timeline.

## 47. Report Requirements

Technical report wajib memiliki:

- report metadata;
- assessment scope;
- lab profile;
- scenario IDs;
- methodology;
- findings;
- severity explanation;
- confidence;
- evidence manifest;
- chain graph summary;
- timeline;
- remediation;
- retest status;
- integrity hashes;
- source type;
- release reference.

Executive report tidak boleh menghilangkan fakta bahwa target adalah self-contained lab.

---

# BAGIAN IX — OBSERVABILITY DAN SECURITY CONTROL

## 48. Required Metrics

| Area | Metric |
|---|---|
| Control plane | request count, deny count, policy latency, state transition count |
| Worker | heartbeat age, enrollment, quarantine, execution duration |
| Adapter | invocation, fallback, rate-limit deny, timeout, output size |
| Evidence | write success, verification failure, chain length, tamper count |
| Correlation | rule evaluation, chain matched, severity override |
| AI gateway | context classification, injection detection, tool recheck deny |
| Recovery | backup duration, restore duration, RTO, RPO, teardown leftovers |
| Release | P0/P1 result, blocker count, artifact hash mismatch |

## 49. Required Log Fields

Setiap structured log wajib memiliki timestamp, level, service, request ID, actor ID, workspace ID, resource type, resource ID, action, result, schema version, and redaction status.

## 50. Security Tests

Security suite wajib mencakup authentication bypass, scope bypass, approval bypass, replayed approval, expired signature, worker revocation, rate-limit bypass, RLS cross-tenant access, audit tamper, evidence tamper, secret leakage, prompt injection, adapter path escape, network escape, and fake-state detection.

---

# BAGIAN X — RECOVERY DAN RELEASE

## 51. Backup

Backup mencakup database dump, artifact manifest, evidence root, audit root, seed version, schema version, image digest, and configuration hash. Backup sendiri memiliki hash dan record.

## 52. Restore

Restore dijalankan ke clean namespace. Setelah restore, sistem membandingkan entity count, state hash, evidence root, audit root, report hash, and release metadata. Restore dianggap lulus hanya jika seluruh invariants cocok.

## 53. Drift Recovery

Baseline configuration disimpan sebagai canonical manifest. Test mengubah konfigurasi target lab, menjalankan drift detector, membuat drift evidence, menjalankan remediation, dan memverifikasi baseline kembali.

## 54. RTO/RPO

Default target:

```yaml
rto_target_seconds: 300
rpo_target_seconds: 60
measurement: wall_clock
scope: full_lab_core_state
```

P1-11 gagal jika recovery time melebihi RTO atau data loss window melebihi RPO.

## 55. Release Record

```yaml
release_id: REL-2026-0001
commit_sha: sha256
service_versions: {}
image_digests: {}
dependency_lock_hash: sha256
lab_profile: full
scenario_ids: []
p0_result: passed
p1_result: passed
evidence_root_hash: sha256
audit_root_hash: sha256
report_hash: sha256
backup_hash: sha256
restore_result: passed
teardown_result: passed
operator_authority_signature: ed25519
release_authority_signature: ed25519
```

---

# BAGIAN XI — ACCEPTANCE MATRIX P0

## P0-01 — Clean Lab Provision

**Prasyarat:** clean checkout, Docker/Podman, pinned images tersedia di local cache atau registry yang dikelola workflow.  
**Langkah:** bootstrap, provision profile core, migrate, seed, health check.  
**Expected:** semua service healthy, version/checksum cocok, seed checksum cocok, asset registry terisi, network graph benar.  
**Evidence:** provision manifest, health result, image digest, migration record, seed hash.  
**Failure:** service tidak healthy, dependency tidak pinned, seed berbeda, atau network keluar dari manifest.

## P0-02 — Scope Denial

**Langkah:** buat task untuk asset yang tidak terdaftar atau scope expired.  
**Expected:** deny sebelum worker dispatch.  
**Evidence:** policy decision, denial reason, audit record, no execution proof.

## P0-03 — Approval Denial

**Langkah:** submit high/critical task tanpa approval, dengan signature invalid, signature expired, dan scope mismatch.  
**Expected:** seluruh variasi tetap pending/denied dan tidak ada adapter invocation.  
**Evidence:** approval request, verification failure, audit, adapter invocation counter.

## P0-04 — Worker Enrollment

**Langkah:** enroll worker valid, worker certificate salah, worker revoked, capability mismatch.  
**Expected:** hanya worker valid yang healthy dan dapat menerima task.  
**Evidence:** enrollment record, certificate fingerprint, heartbeat, revocation record.

## P0-05 — Task Lifecycle

**Langkah:** create, queue, run, complete, duplicate submit, invalid transition.  
**Expected:** valid transition berjalan; duplicate idempotent; invalid transition ditolak.  
**Evidence:** state history, execution record, audit chain.

## P0-06 — Failure Lifecycle

**Langkah:** worker timeout, adapter error retryable, adapter error terminal, compensation failure.  
**Expected:** cancellation, bounded retry, terminal state, compensation record.  
**Evidence:** failure trace, retry attempts, compensation, final state.

## P0-07 — Evidence Tamper

**Langkah:** ubah payload, parent hash, timestamp, atau artifact reference.  
**Expected:** verification gagal dan report tidak menandai evidence valid.  
**Evidence:** tamper record dan verification output.

## P0-08 — Report Generation

**Langkah:** gunakan finding dan evidence dari live lab.  
**Expected:** report valid, lengkap, reproducible, hash stabil, provenance terlihat.  
**Evidence:** report file, schema result, report hash.

## P0-09 — Gateway Workflow

**Langkah:** operator UI membuat research hingga worker selesai.  
**Expected:** request ID konsisten, state UI berasal backend, audit lengkap.  
**Evidence:** API trace, UI integration result, audit.

## P0-10 — Backup Restore

**Langkah:** create state, backup, destroy runtime state, restore ke namespace bersih.  
**Expected:** state hash, evidence root, audit root, dan report state cocok.  
**Evidence:** backup manifest, restore verification.

## P0-11 — Teardown

**Langkah:** teardown profile core dan full.  
**Expected:** inventory zero, worker zero, running task zero, pending job zero, active secret zero.  
**Evidence:** teardown manifest, resource scan, clean-state verification.

## P0-12 — Approval Gate

**Langkah:** signed approval valid dan seluruh negative cases.  
**Expected:** hanya approval valid yang mengubah status menjadi queued.  
**Evidence:** canonical payload, signature verification, audit.

## P0-13 — Audit Hash Chain

**Langkah:** append event, verify, ubah event lama, verify ulang.  
**Expected:** chain valid sebelum tamper dan invalid setelah tamper.  
**Evidence:** root hash dan verification record.

## P0-14 — RLS Isolation

**Langkah:** query/read/write dari workspace A terhadap B, context kosong, background job salah context.  
**Expected:** seluruh unauthorized operation menghasilkan nol row atau deny.  
**Evidence:** SQL test record, policy record, database audit.

---

# BAGIAN XII — ACCEPTANCE MATRIX P1

## P1-01 — Web/API Assessment

Web/API Lab harus menghasilkan observation dari service nyata, bukan fixture result. Validator memeriksa contract, authorization boundary, input policy, simulated SSRF, dan configuration. Report harus menyertakan evidence dan remediation.

## P1-02 — Database Assessment

Validator memeriksa PostgreSQL dan MongoDB policy fixture, privilege graph, schema exposure, audit configuration, backup integrity, dan evidence classification.

## P1-03 — Identity Assessment

Validator memeriksa stale account, expiry, revoked credential, role graph, service identity, access review, dan overpermission pada Synthetic Identity Lab.

## P1-04 — Segmentation

Network Path Validator menjalankan allowed path dan denied path. Denied path harus benar-benar gagal dan alasan policy harus dapat ditelusuri.

## P1-05 — Deception

Canary access menghasilkan event yang masuk collector, alert, correlation, timeline, finding, dan containment record.

## P1-06 — Telemetry

Setiap execution memiliki request ID, actor, worker, policy decision, start, terminal event, execution reference, evidence reference, dan retention metadata. Tamper terhadap event ter-seal wajib terdeteksi.

## P1-07 — Orchestration Multi-Step

Workflow mencakup approval pause, dispatch, induced timeout, retry, compensation, evidence, correlation, dan report. Decision trace harus menjelaskan setiap node dan transition.

## P1-08 — Secret Governance

Secret service lokal menjalankan issuance, rotation, expiry, revocation, redaction, dan old-secret invalidation. Plaintext tidak boleh berada di log atau evidence.

## P1-09 — Drift Recovery

Test mengubah baseline service configuration, mendeteksi drift, membuat evidence, menjalankan remediation, dan memverifikasi baseline hash kembali sama.

## P1-10 — Artifact Integrity

Artifact fixture diubah satu byte, signature/hash verification harus gagal, affected release harus diblokir, dan recovery harus memulihkan baseline.

## P1-11 — Resilience RTO/RPO

Core/full lab menjalankan failure scenario untuk gateway, worker, database restore, evidence store, dan orchestrator. RTO maksimum 300 detik dan RPO maksimum 60 detik pada environment CI yang ditentukan.

## P1-12 — Release Clean Checkout

Workflow melakukan clone bersih, bootstrap, provision, seed, compile, test, P0, full-profile P1, evidence verify, backup/restore, teardown, dan release record. Semua harus hijau.

## P1-13 — Capability Lookup

Synthetic fingerprint menghasilkan capability request, vector, risk, adapter priority, fallback, dan lab profile. Mapping harus cocok dengan registry version.

## P1-14 — Vector Selection

Tech stack dan observations dipetakan ke vector melalui deterministic rule. Rule ID, input, risk, confidence, dan decision harus tersimpan.

## P1-15 — Correlation Chain

SSRF simulator, metadata simulator, dan IAM policy fixture menghasilkan tiga evidence yang terhubung oleh correlation rule. Severity override harus memiliki reason dan evidence.

## P1-16 — Prompt Injection Defense

Untrusted text mencoba memerintahkan tool call, menurunkan risk, memperluas scope, atau melewati approval. Semua harus ditolak oleh context separation dan policy recheck.

## P1-17 — Chain Graph UI

Graph UI menampilkan nodes dan edges dari backend graph. Setiap edge memiliki provenance, confidence, rule ID, dan evidence reference. UI tidak boleh membuat edge sendiri.

## P1-18 — Adapter Rate Limit

Adapter dipanggil melebihi requests-per-second, minute, dan burst. Request tambahan harus ditolak atau di-throttle, dengan reason, metric, audit, dan no-outbound-call proof.

---

# BAGIAN XIII — TESTING DAN CI

## 56. Test Layers

```text
unit tests
→ contract tests
→ database/RLS tests
→ security tests
→ service integration tests
→ lab scenario tests
→ recovery tests
→ P0 matrix
→ P1 matrix
→ clean checkout release test
```

## 57. GitHub Actions Workflow

```text
contract.yml
  schema lint, OpenAPI, compatibility

security.yml
  secret scan, dependency lock, SAST, boundary check

lab-acceptance.yml
  build images, start core/full profile, run P0/P1

release.yml
  clean checkout, evidence verify, recovery, teardown, release record
```

CI tidak boleh menggunakan `continue-on-error` untuk P0/P1. Artifact test disimpan bersama commit SHA dan hash manifest.

## 58. Boundary Checks

Automated checker wajib menolak:

- runtime import dari L7;
- frontend direct access ke database;
- adapter direct access tanpa gateway/task envelope;
- lab target import production runtime internal secara tidak sah;
- contracts yang mengimpor implementation;
- deploy yang mengimpor application source;
- unpinned dependency;
- secret literal;
- test yang memalsukan status execution.

---

# BAGIAN XIV — OPERASI REPOSITORY

## 59. Perintah Utama

```bash
make bootstrap
make build
make lab-up PROFILE=core
make seed
make test
make acceptance-p0
make lab-up PROFILE=full
make acceptance-p1
make backup
make restore
make evidence-verify
make teardown
make release-check
```

## 60. Runbook Failure

Jika provision gagal, workflow mengumpulkan health log, dependency report, container state, network manifest, dan migration status. Tidak ada retry tanpa bounded budget. Jika recovery gagal, release diblokir dan recovery record dibuat.

Jika evidence verification gagal, report terkait ditandai invalid, release diblokir, dan tamper record dibuat. Jika RLS gagal, seluruh release diblokir. Jika teardown menyisakan resource, release diblokir.

## 61. Runbook Rollback

Rollback menggunakan release record sebelumnya, image digests sebelumnya, schema migration rollback yang teruji, configuration baseline, dan evidence reference. Rollback tidak boleh menghapus audit atau evidence historis.

---

# BAGIAN XV — GOVERNANCE DAN CHANGE MANAGEMENT

## 62. Change Request

Setiap perubahan membutuhkan change ID, alasan, affected layer, affected contracts, security impact, migration, test changes, rollback plan, documentation update, dan signed lab review.

## 63. Versioning

Contracts, capability registry, adapter manifest, policy rules, database schema, lab scenarios, dan release record memiliki version. Perubahan breaking wajib menaikkan major contract version.

## 64. Auditability

Semua perubahan source, policy, schema, seed, adapter, lab scenario, dan deployment config harus dapat ditelusuri ke commit, actor, review, test result, dan release record.

---

# BAGIAN XVI — DEFINITION OF DONE

## 65. Repository DoD

- Source code ada dan build berhasil.
- Contract valid dan compatible.
- Migration reproducible.
- Lab target nyata tersedia.
- Adapter manifest lengkap.
- Policy gate teruji.
- Evidence dan audit dibuat.
- UI menggunakan backend state.
- P0/P1 test terhubung.
- Recovery dan teardown teruji.
- Documentation diperbarui.
- CI release gate hijau.

## 66. Capability DoD

Capability tidak boleh disebut implemented jika hanya memiliki nama registry. Capability harus dapat menerima input valid, menjalankan adapter terhadap target lab, menghasilkan output schema, menulis observation, membuat evidence, menghasilkan finding bila rule terpenuhi, dan masuk report.

## 67. Release DoD

Release hanya boleh dibuat jika:

1. Semua P0 hijau.
2. Semua P1 hijau.
3. Tidak ada external blocker.
4. Tidak ada fake result.
5. Tidak ada secret plaintext.
6. Tidak ada untracked execution.
7. Evidence root valid.
8. Audit root valid.
9. Backup/restore valid.
10. Teardown clean.
11. Commit dan artifact terverifikasi.
12. Release authority signature valid.

---

# BAGIAN XVII — PERNYATAAN KELAYAKAN IMPLEMENTASI

Seluruh komponen yang didefinisikan dalam blueprint ini dapat dikerjakan dalam repository GitHub karena acceptance menggunakan source code, container, synthetic target, deterministic seed, local service, cryptographic lab authority, dan CI workflow yang semuanya dapat disimpan atau dibangun dari repository.

Bagian yang sebelumnya membutuhkan Burp Pro, Cobalt Strike, cloud account, mobile device, wireless hardware, public blockchain, SIEM eksternal, secret manager eksternal, target pihak ketiga, atau human manual approval telah diganti secara eksplisit. Tidak ada bagian tersebut yang menjadi dependency agar release P0/P1 dapat lulus.

Batasan operasional tetap berlaku: implementasi ini adalah private authorized lab dan bukan izin untuk menguji target eksternal. Batasan tersebut tidak mengurangi kemampuan implementasi repository; batasan tersebut memastikan seluruh test dapat dilakukan secara aman, reproducible, dan selesai dari GitHub.

> **Prinsip final:** semua yang tercantum dalam acceptance harus memiliki implementasi, target lab, test, evidence, dan release path. Jika suatu komponen tidak dapat dijalankan sebagai dependency eksternal, komponen tersebut wajib diganti dengan equivalent self-contained component. Tidak boleh ada item wajib yang dibiarkan blocked atau terlewat.

## References

[1]: https://github.com/AngelMind7/AngelMind "AngelMind repository selected for implementation"

[2]: https://owasp.org/www-project-zap/ "OWASP ZAP project"

[3]: https://opentelemetry.io/ "OpenTelemetry project"

[4]: https://www.postgresql.org/docs/current/ddl-rowsecurity.html "PostgreSQL Row-Level Security"

[5]: https://docs.github.com/en/actions "GitHub Actions documentation"

[6]: https://min.io/ "MinIO object storage project"

[7]: https://kind.sigs.k8s.io/ "kind Kubernetes in Docker project"

[8]: https://hardhat.org/ "Hardhat local blockchain development environment"

[9]: https://developer.hashicorp.com/vault "Vault documentation"

[10]: https://www.localstack.cloud/ "Local cloud development environment"

[11]: https://coredns.io/ "CoreDNS project"

[12]: https://www.rfc-editor.org/rfc/rfc8032 "Edwards-Curve Digital Signature Algorithm"
